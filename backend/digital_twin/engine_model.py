import numpy as np
from scipy.integrate import solve_ivp

class PistonEngineODE:
    def __init__(self):
        self.C_cyl = 500.0
        self.C_exh = 200.0
        self.C_oil = 800.0
        self.k_comb = 150.0
        self.h_cool = 2.5
        self.h_oil_xfer = 1.0
        self.k_exh = 120.0
        self.h_exh_cool = 3.0
        self.k_fric = 40.0
        self.h_oil_cooler = 1.5
        self.P_base = 5.5
        self.rpm_ref = 3000.0

    def compute_derivatives(self, t, state, inputs):
        cht, egt, t_oil = state
        rpm = inputs.get('rpm', self.rpm_ref)
        throttle = inputs.get('throttle_position', 50.0)
        fuel_flow = inputs.get('fuel_flow_rate', 15.0)
        t_ambient = inputs.get('ambient_temperature', 25.0)
        airspeed = inputs.get('airspeed', 0.0)
        
        dCHT_dt = (1.0 / self.C_cyl) * (
            self.k_comb * (rpm / self.rpm_ref) * (throttle / 100.0) * (fuel_flow / 15.0)
            - self.h_cool * (1.0 + 0.008 * airspeed) * (cht - t_ambient)
            - self.h_oil_xfer * (cht - t_oil)
        )
        
        dEGT_dt = (1.0 / self.C_exh) * (
            self.k_exh * (rpm / self.rpm_ref) * (fuel_flow / 15.0)
            - self.h_exh_cool * (egt - t_ambient)
        )
        
        dT_oil_dt = (1.0 / self.C_oil) * (
            self.k_fric * (rpm / self.rpm_ref)**2
            + self.h_oil_xfer * (cht - t_oil)
            - self.h_oil_cooler * (t_oil - t_ambient)
        )
        
        return [dCHT_dt, dEGT_dt, dT_oil_dt]

    def compute_oil_pressure(self, rpm, oil_temp):
        return self.P_base * (rpm / self.rpm_ref) * max(0.3, 1.0 - 0.005 * (oil_temp - 80.0))

    def step(self, current_state, inputs, dt=1.0):
        t_span = (0, dt)
        initial_state = [current_state['cht'], current_state['egt'], current_state['oil_temp']]
        
        result = solve_ivp(
            fun=self.compute_derivatives,
            t_span=t_span,
            y0=initial_state,
            args=(inputs,),
            method='RK45'
        )
        
        final_state = result.y[:, -1]
        
        oil_pressure = self.compute_oil_pressure(inputs.get('rpm', self.rpm_ref), final_state[2])
        
        return {
            'cht': float(final_state[0]),
            'egt': float(final_state[1]),
            'oil_temp': float(final_state[2]),
            'oil_pressure': float(oil_pressure)
        }

    def get_steady_state(self, inputs):
        # A simple approximation by running the model for a long time
        # You could also solve the algebraic equations by setting derivatives to zero
        # Let's run for 1000 seconds
        initial_state = [150.0, 550.0, 80.0]  # Reasonable defaults
        result = solve_ivp(
            fun=self.compute_derivatives,
            t_span=(0, 1000),
            y0=initial_state,
            args=(inputs,),
            method='RK45'
        )
        final_state = result.y[:, -1]
        
        oil_pressure = self.compute_oil_pressure(inputs.get('rpm', self.rpm_ref), final_state[2])
        
        return {
            'cht': float(final_state[0]),
            'egt': float(final_state[1]),
            'oil_temp': float(final_state[2]),
            'oil_pressure': float(oil_pressure)
        }
