import os
import sys
import numpy as np
from datetime import datetime

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from backend.digital_twin import PistonEngineODE, DigitalTwinKalmanFilter
except ImportError:
    try:
        from digital_twin import PistonEngineODE, DigitalTwinKalmanFilter
    except ImportError:
        from ..digital_twin import PistonEngineODE, DigitalTwinKalmanFilter

class EngineSensorProducer:
    def __init__(self, engine_id='ENGINE_001', use_digital_twin=True):
        # ==========================================
        # ENGINE STATE
        # ==========================================
        self.engine_id = engine_id
        self.engine_hours = 1000.0
        self.flight_cycles = 500

        # Current fault
        self.fault_mode = "none"

        # Previous readings
        self.previous_cht = 175.0
        self.previous_egt = 620.0
        self.previous_vibration = 0.20
        
        self.use_digital_twin = use_digital_twin
        
        if self.use_digital_twin:
            self.model = PistonEngineODE()
            self.ekf = DigitalTwinKalmanFilter(self.model)
            self.ekf.initialize(self.previous_cht, self.previous_egt, 80.0)

    def get_fault_types(self):
        return [
            "none",
            "vibration_anomaly",
            "combustion_instability",
            "misfire",
            "sensor_drift",
            "lubrication_issue",
            "overheating",
            "injector_abnormality",
            "cooling_degradation"
        ]

    def set_fault(self, fault):
        valid_faults = self.get_fault_types()
        if fault not in valid_faults:
            raise ValueError(f"Invalid fault: {fault}")
        self.fault_mode = fault

    def generate_reading(self):
        # ==========================================
        # 1. BASIC FLIGHT PARAMETERS
        # ==========================================
        flight_phase = np.random.choice(
            ["takeoff", "climb", "cruise", "descent", "landing"],
            p=[0.10, 0.20, 0.50, 0.10, 0.10]
        )

        mission_profile_type = np.random.choice(["surveillance", "reconnaissance", "patrol"])

        # ==========================================
        # 2. RPM / THROTTLE
        # ==========================================
        phase_rpm = {
            "takeoff": 3400,
            "climb": 3300,
            "cruise": 3000,
            "descent": 2500,
            "landing": 2200
        }

        base_rpm = phase_rpm[flight_phase]
        throttle_ranges = {
            "takeoff": (80, 100),
            "climb": (70, 90),
            "cruise": (50, 75),
            "descent": (30, 50),
            "landing": (20, 40)
        }

        throttle_min, throttle_max = throttle_ranges[flight_phase]
        throttle_position = np.random.uniform(throttle_min, throttle_max)
        rpm = base_rpm + 8 * (throttle_position - 50) + np.random.normal(0, 35)
        rpm = max(1500, rpm)

        # ==========================================
        # 3. ENVIRONMENT
        # ==========================================
        altitude_ranges = {
            "takeoff": (100, 1000),
            "climb": (1000, 4000),
            "cruise": (4000, 8000),
            "descent": (1000, 4000),
            "landing": (100, 1000)
        }

        altitude = np.random.uniform(*altitude_ranges[flight_phase])
        ambient_temperature = np.random.uniform(10, 35)
        ambient_pressure = 101.3 * np.exp(-altitude / 8500) + np.random.normal(0, 0.5)
        humidity = np.random.uniform(30, 80)
        air_density = (ambient_pressure * 1000) / (287.05 * (ambient_temperature + 273.15))
        airspeed = 0.015 * altitude + 20 + np.random.normal(0, 3)
        airspeed = max(10, airspeed)

        # ==========================================
        # 4. MAIN ENGINE SENSORS
        # ==========================================
        cht = 135 + 0.012 * rpm + 0.30 * throttle_position + np.random.normal(0, 2)
        egt = 400 + 0.045 * rpm + 1.0 * throttle_position + np.random.normal(0, 5)
        oil_temperature = 55 + 0.010 * rpm + 0.10 * throttle_position + np.random.normal(0, 1.5)
        oil_pressure = 6.5 - 0.00035 * rpm + np.random.normal(0, 0.10)
        fuel_flow_rate = 5 + 0.0045 * rpm + 0.08 * throttle_position + np.random.normal(0, 0.4)

        # ==========================================
        # 5. VIBRATION
        # ==========================================
        vibration_x = 0.15 + 0.00001 * rpm + np.random.normal(0, 0.025)
        vibration_y = 0.15 + 0.00001 * rpm + np.random.normal(0, 0.025)
        vibration_z = 0.18 + 0.000012 * rpm + np.random.normal(0, 0.025)

        # ==========================================
        # 6. ELECTRICAL
        # ==========================================
        battery_voltage = np.random.normal(24.0, 0.25)
        alternator_current = 10 + 0.003 * rpm + np.random.normal(0, 0.8)

        # ==========================================
        # 7. ENGINE CONTROL
        # ==========================================
        injection_timing = np.random.normal(25, 1)
        manifold_pressure = 35 + 0.55 * throttle_position + np.random.normal(0, 2)

        # ==========================================
        # 8. FAULT INJECTION
        # ==========================================
        if self.fault_mode == "vibration_anomaly":
            vibration_x += np.random.uniform(0.4, 0.8)
            vibration_y += np.random.uniform(0.4, 0.8)
            vibration_z += np.random.uniform(0.4, 0.8)
        elif self.fault_mode == "overheating":
            cht += np.random.uniform(30, 50)
            egt += np.random.uniform(40, 70)
            oil_temperature += np.random.uniform(15, 25)
        elif self.fault_mode == "lubrication_issue":
            oil_pressure -= np.random.uniform(1.5, 3.0)
            oil_temperature += np.random.uniform(10, 20)
        elif self.fault_mode == "misfire":
            rpm -= np.random.uniform(200, 500)
            egt += np.random.uniform(30, 60)
            vibration_x += np.random.uniform(0.2, 0.4)
        elif self.fault_mode == "injector_abnormality":
            fuel_flow_rate += np.random.uniform(5, 10)
            egt += np.random.uniform(20, 50)
        elif self.fault_mode == "cooling_degradation":
            cht += np.random.uniform(20, 40)
            oil_temperature += np.random.uniform(10, 20)
        elif self.fault_mode == "combustion_instability":
            egt += np.random.uniform(20, 50)
            rpm += np.random.normal(0, 150)
            vibration_x += np.random.uniform(0.1, 0.3)
        elif self.fault_mode == "sensor_drift":
            cht += np.random.uniform(5, 15)
            egt += np.random.uniform(5, 15)

        # ==========================================
        # 9. DERIVED FEATURES
        # ==========================================
        vibration_rms = np.sqrt((vibration_x ** 2 + vibration_y ** 2 + vibration_z ** 2) / 3)
        vibration_fft_peak_freq = 100 + 0.05 * rpm + np.random.normal(0, 10)
        vibration_fft_peak_amplitude = vibration_rms * np.random.uniform(1.5, 3)
        oil_pressure_rpm_ratio = oil_pressure / max(rpm, 1)
        fuel_air_efficiency_estimate = np.clip(np.random.normal(0.85, 0.04), 0.60, 0.98)
        power_output_estimate = rpm * throttle_position / 1000
        combustion_cyclic_variability = np.random.uniform(0.01, 0.05)
        thermal_cycling_stress_index = abs(cht - self.previous_cht) / 100 + np.random.uniform(0.05, 0.20)

        # ==========================================
        # 10. DIGITAL TWIN FEATURES
        # ==========================================
        if self.use_digital_twin:
            inputs = {
                'rpm': rpm,
                'throttle_position': throttle_position,
                'fuel_flow_rate': fuel_flow_rate,
                'ambient_temperature': ambient_temperature,
                'altitude': altitude,
                'airspeed': airspeed
            }
            measurements = {
                'cht': cht,
                'egt': egt,
                'oil_pressure': oil_pressure
            }
            
            ekf_res = self.ekf.step(inputs, measurements, dt=1.0)
            
            twin_predicted_cht = ekf_res['twin_predicted_cht']
            twin_predicted_egt = ekf_res['twin_predicted_egt']
            twin_predicted_oil_pressure = ekf_res['twin_predicted_oil_pressure']
            residual_cht = ekf_res['residual_cht']
            residual_egt = ekf_res['residual_egt']
            residual_oil_pressure = ekf_res['residual_oil_pressure']
            twin_fidelity_score = ekf_res['twin_fidelity_score']
        else:
            twin_predicted_cht = cht + np.random.normal(0, 1.5)
            twin_predicted_egt = egt + np.random.normal(0, 3)
            twin_predicted_oil_pressure = oil_pressure + np.random.normal(0, 0.08)
            residual_cht = cht - twin_predicted_cht
            residual_egt = egt - twin_predicted_egt
            residual_oil_pressure = oil_pressure - twin_predicted_oil_pressure
            twin_fidelity_score = np.clip(1 - (abs(residual_cht) / 20 + abs(residual_egt) / 40 + abs(residual_oil_pressure) / 2) / 3, 0, 1)

        # ==========================================
        # 11. SENSOR HEALTH
        # ==========================================
        sensor_status_cht = "ok"
        sensor_status_egt = "ok"
        sensor_status_oil_pressure = "ok"
        signal_noise_level_cht = np.random.uniform(0.01, 0.05)
        signal_noise_level_egt = np.random.uniform(0.01, 0.05)
        signal_noise_level_oil_pressure = np.random.uniform(0.01, 0.05)

        is_virtual_reading_cht = False
        is_virtual_reading_egt = False
        is_virtual_reading_oil_pressure = False

        if self.fault_mode == "sensor_drift":
            sensor_status_cht = "degraded"
            sensor_status_egt = "degraded"
            signal_noise_level_cht = np.random.uniform(0.10, 0.25)
            signal_noise_level_egt = np.random.uniform(0.10, 0.25)

        # ==========================================
        # 12. FAILURE MODE
        # ==========================================
        if self.fault_mode == "none":
            failure_mode_class = "healthy"
        elif self.fault_mode == "sensor_drift":
            failure_mode_class = "sensor"
        else:
            failure_mode_class = "mechanical"

        # ==========================================
        # 13. CREATE COMPLETE RECORD
        # ==========================================
        data = {
            "timestamp": datetime.now(),
            "engine_id": self.engine_id,
            "flight_phase": flight_phase,
            "engine_operating_hours_cumulative": self.engine_hours,
            "flight_cycle_count": self.flight_cycles,
            "rpm": rpm,
            "cht": cht,
            "egt": egt,
            "oil_pressure": oil_pressure,
            "oil_temperature": oil_temperature,
            "fuel_flow_rate": fuel_flow_rate,
            "vibration_x": vibration_x,
            "vibration_y": vibration_y,
            "vibration_z": vibration_z,
            "battery_voltage": battery_voltage,
            "alternator_current": alternator_current,
            "injection_timing": injection_timing,
            "manifold_pressure": manifold_pressure,
            "throttle_position": throttle_position,
            "altitude": altitude,
            "ambient_temperature": ambient_temperature,
            "ambient_pressure": ambient_pressure,
            "air_density": air_density,
            "humidity": humidity,
            "airspeed": airspeed,
            "mission_profile_type": mission_profile_type,
            "cht_rate_of_change": cht - self.previous_cht,
            "egt_rate_of_change": egt - self.previous_egt,
            "vibration_rms": vibration_rms,
            "vibration_fft_peak_freq": vibration_fft_peak_freq,
            "vibration_fft_peak_amplitude": vibration_fft_peak_amplitude,
            "oil_pressure_rpm_ratio": oil_pressure_rpm_ratio,
            "fuel_air_efficiency_estimate": fuel_air_efficiency_estimate,
            "power_output_estimate": power_output_estimate,
            "combustion_cyclic_variability": combustion_cyclic_variability,
            "thermal_cycling_stress_index": thermal_cycling_stress_index,
            "twin_predicted_cht": twin_predicted_cht,
            "twin_predicted_egt": twin_predicted_egt,
            "twin_predicted_oil_pressure": twin_predicted_oil_pressure,
            "residual_cht": residual_cht,
            "residual_egt": residual_egt,
            "residual_oil_pressure": residual_oil_pressure,
            "twin_fidelity_score": twin_fidelity_score,
            "sensor_status_cht": sensor_status_cht,
            "sensor_status_egt": sensor_status_egt,
            "sensor_status_oil_pressure": sensor_status_oil_pressure,
            "signal_noise_level_cht": signal_noise_level_cht,
            "signal_noise_level_egt": signal_noise_level_egt,
            "signal_noise_level_oil_pressure": signal_noise_level_oil_pressure,
            "is_virtual_reading_cht": is_virtual_reading_cht,
            "is_virtual_reading_egt": is_virtual_reading_egt,
            "is_virtual_reading_oil_pressure": is_virtual_reading_oil_pressure,
            "fault_type": self.fault_mode,
            "fault_onset_timestamp": datetime.now(),
            "failure_mode_class": failure_mode_class
        }

        # ==========================================
        # 14. UPDATE ENGINE STATE
        # ==========================================
        self.previous_cht = cht
        self.previous_egt = egt
        self.previous_vibration = vibration_rms
        self.engine_hours += 1 / 3600

        # Return dict
        return data
