import os
import joblib
import pandas as pd
import numpy as np
import logging

class EnginePredictor:
    def __init__(self, models_dir=None):
        if models_dir is None:
            # Fallback to local trained folder relative to this file
            models_dir = os.path.join(os.path.dirname(__file__), 'trained')
        
        self.models_dir = models_dir
        self.is_loaded = False
        
        try:
            # RUL model artifacts
            self.rul_model = joblib.load(os.path.join(models_dir, 'rul_model.pkl'))
            self.rul_encoder = joblib.load(os.path.join(models_dir, 'rul_encoder.pkl'))
            self.rul_categorical_features = joblib.load(os.path.join(models_dir, 'rul_categorical_features.pkl'))
            self.rul_numeric_features = joblib.load(os.path.join(models_dir, 'rul_numeric_features.pkl'))
            self.rul_feature_order = joblib.load(os.path.join(models_dir, 'rul_feature_order.pkl'))
            
            # Fault model artifacts
            self.fault_model = joblib.load(os.path.join(models_dir, 'fault_model.pkl'))
            self.fault_feature_order = joblib.load(os.path.join(models_dir, 'fault_feature_order.pkl'))
            
            # Anomaly model artifacts
            self.anomaly_model = joblib.load(os.path.join(models_dir, 'anomaly_model.pkl'))
            self.anomaly_feature_order = joblib.load(os.path.join(models_dir, 'anomaly_feature_order.pkl'))
            
            self.is_loaded = True
        except FileNotFoundError as e:
            logging.warning(f"Could not load ML models: {e}. Predictions will return defaults.")
            self.is_loaded = False

    def predict_rul(self, sensor_data: dict) -> float:
        if not self.is_loaded:
            return 0.0
        
        df = pd.DataFrame([sensor_data])
        
        # Ensure all expected columns exist
        for col in self.rul_numeric_features + self.rul_categorical_features:
            if col not in df.columns:
                df[col] = 0 if col in self.rul_numeric_features else 'unknown'
                
        # encode categorical
        X_num = df[self.rul_numeric_features]
        X_cat = df[self.rul_categorical_features]
        
        encoded_cats = self.rul_encoder.transform(X_cat)
        cat_feature_names = self.rul_encoder.get_feature_names_out(self.rul_categorical_features)
        
        X_encoded = pd.DataFrame(encoded_cats, columns=cat_feature_names, index=X_cat.index)
        X = pd.concat([X_num, X_encoded], axis=1)
        
        # align columns
        for col in self.rul_feature_order:
            if col not in X.columns:
                X[col] = 0
        X = X[self.rul_feature_order]
        
        rul = self.rul_model.predict(X)[0]
        return float(rul)

    def predict_fault(self, sensor_data: dict) -> str:
        if not self.is_loaded:
            return 'unknown'
        
        df = pd.DataFrame([sensor_data])
        
        for col in self.fault_feature_order:
            if col not in df.columns:
                if 'status' in col or 'phase' in col or 'type' in col or 'class' in col:
                    df[col] = 'unknown'
                else:
                    df[col] = 0
                    
        X = df[self.fault_feature_order]
        fault = self.fault_model.predict(X)[0]
        return str(fault)

    def predict_anomaly(self, sensor_data: dict) -> int:
        if not self.is_loaded:
            return 0
            
        df = pd.DataFrame([sensor_data])
        
        for col in self.anomaly_feature_order:
            if col not in df.columns:
                if 'status' in col or 'phase' in col or 'type' in col or 'class' in col:
                    df[col] = 'unknown'
                else:
                    df[col] = 0
                    
        X = df[self.anomaly_feature_order]
        anomaly = self.anomaly_model.predict(X)[0]
        return 1 if anomaly == -1 else 0

    def explain_fault(self, sensor_data: dict, top_k: int = 5) -> list:
        """
        Returns top feature attributions explaining WHY a fault or anomaly occurred,
        similar to SHAP value ranking.
        """
        if not self.is_loaded:
            return []

        # Baseline healthy values for comparison
        baselines = {
            'cht': 175.0, 'egt': 620.0, 'oil_pressure': 5.2, 'oil_temperature': 85.0,
            'fuel_flow_rate': 18.0, 'vibration_rms': 0.20, 'vibration_x': 0.15,
            'vibration_y': 0.15, 'vibration_z': 0.18, 'manifold_pressure': 45.0,
            'residual_cht': 0.0, 'residual_egt': 0.0, 'residual_oil_pressure': 0.0,
            'twin_fidelity_score': 0.98, 'cht_rate_of_change': 0.0, 'egt_rate_of_change': 0.0
        }

        feature_weights = {
            'overheating': {'cht': 3.5, 'egt': 2.8, 'residual_cht': 3.0, 'oil_temperature': 2.0, 'cht_rate_of_change': 2.5},
            'lubrication_issue': {'oil_pressure': 4.0, 'oil_temperature': 3.0, 'residual_oil_pressure': 3.5, 'oil_pressure_rpm_ratio': 2.5},
            'misfire': {'rpm': 3.5, 'vibration_rms': 3.0, 'egt': 2.5, 'combustion_cyclic_variability': 3.0},
            'injector_abnormality': {'fuel_flow_rate': 4.0, 'fuel_air_efficiency_estimate': 3.5, 'egt': 2.5, 'residual_egt': 2.0},
            'cooling_degradation': {'cht': 3.0, 'residual_cht': 3.5, 'cht_rate_of_change': 2.8, 'oil_temperature': 2.2},
            'combustion_instability': {'combustion_cyclic_variability': 4.0, 'vibration_fft_peak_amplitude': 3.0, 'rpm': 2.5},
            'vibration_anomaly': {'vibration_rms': 4.5, 'vibration_x': 3.5, 'vibration_y': 3.5, 'vibration_z': 3.5},
            'sensor_drift': {'residual_cht': 3.5, 'residual_egt': 3.5, 'signal_noise_level_cht': 3.0, 'twin_fidelity_score': 3.0}
        }

        fault_type = sensor_data.get('fault_type') or self.predict_fault(sensor_data)
        weights = feature_weights.get(fault_type, {
            'cht': 2.0, 'egt': 2.0, 'oil_pressure': 2.0, 'vibration_rms': 2.0, 'residual_cht': 2.0
        })

        explanations = []
        for feat, weight in weights.items():
            if feat in sensor_data and feat in baselines:
                val = float(sensor_data[feat])
                base = float(baselines[feat])
                diff = val - base
                impact = abs(diff) * weight
                direction = "high" if diff > 0 else "low" if diff < 0 else "nominal"
                explanations.append({
                    "feature": feat,
                    "value": round(val, 2),
                    "baseline": round(base, 2),
                    "delta": round(diff, 2),
                    "impact": round(impact, 2),
                    "direction": direction,
                    "unit": "°C" if "temperature" in feat or "cht" in feat or "egt" in feat else "bar" if "pressure" in feat else "g" if "vibration" in feat else ""
                })

        explanations.sort(key=lambda x: x['impact'], reverse=True)
        return explanations[:top_k]

    def get_subsystem_health(self, sensor_data: dict, rul_hours: float) -> dict:
        """
        Calculates per-subsystem health index (0-100) and subsystem RUL breakdown.
        Subsystems:
        - cylinder_heads (CHT, thermal cycling)
        - exhaust_system (EGT, manifold P)
        - lubrication_circuit (Oil P, Oil T)
        - fuel_injection (Fuel flow, efficiency)
        - core_block_crankshaft (Vibration, RPM stability)
        """
        cht = float(sensor_data.get('cht', 175))
        egt = float(sensor_data.get('egt', 620))
        oil_p = float(sensor_data.get('oil_pressure', 5.5))
        oil_t = float(sensor_data.get('oil_temperature', 85))
        vib = float(sensor_data.get('vibration_rms', 0.2))
        fuel_eff = float(sensor_data.get('fuel_air_efficiency_estimate', 0.85))

        # Health calculations 0-100
        cyl_health = max(0, min(100, 100 - max(0, (cht - 190) * 1.5) - abs(float(sensor_data.get('residual_cht', 0))) * 3))
        exh_health = max(0, min(100, 100 - max(0, (egt - 680) * 0.8) - abs(float(sensor_data.get('residual_egt', 0))) * 1.5))
        lub_health = max(0, min(100, 100 - max(0, (4.0 - oil_p) * 25) - max(0, (oil_t - 95) * 1.8)))
        fuel_health = max(0, min(100, 100 - max(0, (0.80 - fuel_eff) * 200)))
        vib_health = max(0, min(100, 100 - max(0, (vib - 0.35) * 150)))

        overall_health = round((cyl_health * 0.25 + exh_health * 0.20 + lub_health * 0.25 + fuel_health * 0.15 + vib_health * 0.15), 1)

        return {
            "overall_health_score": overall_health,
            "subsystems": {
                "cylinder_heads": {
                    "name": "Cylinder Head & Valves",
                    "health_score": round(cyl_health, 1),
                    "rul_hours": round(rul_hours * (cyl_health / 100.0), 1),
                    "status": "critical" if cyl_health < 50 else "warning" if cyl_health < 75 else "nominal",
                    "sensor_key": "cht",
                    "sensor_value": round(cht, 1),
                    "sensor_unit": "°C"
                },
                "exhaust_system": {
                    "name": "Exhaust & Turbocharger",
                    "health_score": round(exh_health, 1),
                    "rul_hours": round(rul_hours * (exh_health / 100.0), 1),
                    "status": "critical" if exh_health < 50 else "warning" if exh_health < 75 else "nominal",
                    "sensor_key": "egt",
                    "sensor_value": round(egt, 1),
                    "sensor_unit": "°C"
                },
                "lubrication_circuit": {
                    "name": "Lubrication Circuit & Sump",
                    "health_score": round(lub_health, 1),
                    "rul_hours": round(rul_hours * (lub_health / 100.0), 1),
                    "status": "critical" if lub_health < 50 else "warning" if lub_health < 75 else "nominal",
                    "sensor_key": "oil_pressure",
                    "sensor_value": round(oil_p, 2),
                    "sensor_unit": "bar"
                },
                "fuel_injection": {
                    "name": "Fuel Injector Rail",
                    "health_score": round(fuel_health, 1),
                    "rul_hours": round(rul_hours * (fuel_health / 100.0), 1),
                    "status": "critical" if fuel_health < 50 else "warning" if fuel_health < 75 else "nominal",
                    "sensor_key": "fuel_flow_rate",
                    "sensor_value": round(float(sensor_data.get('fuel_flow_rate', 18)), 1),
                    "sensor_unit": "L/h"
                },
                "core_block": {
                    "name": "Engine Block & Crankcase",
                    "health_score": round(vib_health, 1),
                    "rul_hours": round(rul_hours * (vib_health / 100.0), 1),
                    "status": "critical" if vib_health < 50 else "warning" if vib_health < 75 else "nominal",
                    "sensor_key": "vibration_rms",
                    "sensor_value": round(vib, 3),
                    "sensor_unit": "g"
                }
            }
        }

    def predict_all(self, sensor_data: dict) -> dict:
        rul = self.predict_rul(sensor_data)
        fault = self.predict_fault(sensor_data)
        anomaly = self.predict_anomaly(sensor_data)
        shap_explanations = self.explain_fault(sensor_data) if (anomaly == 1 or fault != 'none') else []
        subsystems = self.get_subsystem_health(sensor_data, rul)

        return {
            'rul_hours': rul,
            'fault_type': fault,
            'anomaly': anomaly,
            'shap_explanations': shap_explanations,
            'health_score': subsystems['overall_health_score'],
            'subsystem_health': subsystems['subsystems']
        }
