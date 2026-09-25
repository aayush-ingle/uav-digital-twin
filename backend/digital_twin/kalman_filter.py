import numpy as np
from .engine_model import PistonEngineODE

class DigitalTwinKalmanFilter:
    def __init__(self, engine_model: PistonEngineODE):
        self.model = engine_model
        
        # State: [CHT, EGT, T_oil]
        # Measurements: [CHT, EGT, Oil_Pressure]
        
        self.Q = np.diag([4.0, 9.0, 1.0])
        self.R = np.diag([4.0, 25.0, 0.01])
        self.P = np.diag([100.0, 100.0, 100.0])
        self.x = np.array([150.0, 550.0, 80.0])

    def initialize(self, cht, egt, oil_temp):
        self.x = np.array([cht, egt, oil_temp])
        self.P = np.diag([100.0, 100.0, 100.0])

    def _numerical_jacobian_F(self, x, inputs, dt=1.0, eps=1e-5):
        # Jacobian of f(x) with respect to x
        F = np.zeros((3, 3))
        for i in range(3):
            x_plus = x.copy()
            x_plus[i] += eps
            
            # Predict
            state_plus = {'cht': x_plus[0], 'egt': x_plus[1], 'oil_temp': x_plus[2]}
            res_plus = self.model.step(state_plus, inputs, dt)
            fx_plus = np.array([res_plus['cht'], res_plus['egt'], res_plus['oil_temp']])
            
            x_minus = x.copy()
            x_minus[i] -= eps
            state_minus = {'cht': x_minus[0], 'egt': x_minus[1], 'oil_temp': x_minus[2]}
            res_minus = self.model.step(state_minus, inputs, dt)
            fx_minus = np.array([res_minus['cht'], res_minus['egt'], res_minus['oil_temp']])
            
            F[:, i] = (fx_plus - fx_minus) / (2 * eps)
        return F

    def _numerical_jacobian_H(self, x, inputs, eps=1e-5):
        # Measurement function h(x) = [CHT, EGT, compute_oil_pressure(rpm, T_oil)]
        # Jacobian of h(x) with respect to x
        H = np.zeros((3, 3))
        rpm = inputs.get('rpm', self.model.rpm_ref)
        for i in range(3):
            x_plus = x.copy()
            x_plus[i] += eps
            hx_plus = np.array([x_plus[0], x_plus[1], self.model.compute_oil_pressure(rpm, x_plus[2])])
            
            x_minus = x.copy()
            x_minus[i] -= eps
            hx_minus = np.array([x_minus[0], x_minus[1], self.model.compute_oil_pressure(rpm, x_minus[2])])
            
            H[:, i] = (hx_plus - hx_minus) / (2 * eps)
        return H

    def step(self, inputs, measurements, dt=1.0):
        # 1. Predict
        current_state = {'cht': self.x[0], 'egt': self.x[1], 'oil_temp': self.x[2]}
        pred_res = self.model.step(current_state, inputs, dt)
        x_pred = np.array([pred_res['cht'], pred_res['egt'], pred_res['oil_temp']])
        
        F = self._numerical_jacobian_F(self.x, inputs, dt)
        P_pred = F @ self.P @ F.T + self.Q
        
        # 2. Update
        rpm = inputs.get('rpm', self.model.rpm_ref)
        h_x_pred = np.array([x_pred[0], x_pred[1], self.model.compute_oil_pressure(rpm, x_pred[2])])
        
        z = np.array([measurements['cht'], measurements['egt'], measurements['oil_pressure']])
        y = z - h_x_pred
        
        H = self._numerical_jacobian_H(x_pred, inputs)
        S = H @ P_pred @ H.T + self.R
        K = P_pred @ H.T @ np.linalg.inv(S)
        
        self.x = x_pred + K @ y
        self.P = (np.eye(3) - K @ H) @ P_pred
        
        twin_predicted_oil_pressure = h_x_pred[2]
        
        twin_fidelity_score = max(0.0, min(1.0, 1.0 - (abs(y[0])/20.0 + abs(y[1])/40.0 + abs(y[2])/2.0) / 3.0))
        
        return {
            'twin_predicted_cht': float(x_pred[0]),
            'twin_predicted_egt': float(x_pred[1]),
            'twin_predicted_oil_pressure': float(twin_predicted_oil_pressure),
            'residual_cht': float(y[0]),
            'residual_egt': float(y[1]),
            'residual_oil_pressure': float(y[2]),
            'twin_fidelity_score': float(twin_fidelity_score)
        }
