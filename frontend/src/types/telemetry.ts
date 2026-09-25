export interface SubsystemHealth {
  name: string;
  health_score: number;
  rul_hours: number;
  status: 'nominal' | 'warning' | 'critical';
  sensor_key: string;
  sensor_value: number;
  sensor_unit: string;
}

export interface ShapExplanation {
  feature: string;
  value: number;
  baseline: number;
  delta: number;
  impact: number;
  direction: 'high' | 'low' | 'nominal';
  unit: string;
}

export interface TelemetryReading {
  timestamp: string;
  engine_id: string;
  flight_phase: 'takeoff' | 'climb' | 'cruise' | 'descent' | 'landing';
  engine_operating_hours_cumulative: number;
  flight_cycle_count: number;
  rpm: number;
  cht: number;
  egt: number;
  oil_pressure: number;
  oil_temperature: number;
  fuel_flow_rate: number;
  vibration_x: number;
  vibration_y: number;
  vibration_z: number;
  vibration_rms: number;
  vibration_fft_peak_freq: number;
  vibration_fft_peak_amplitude: number;
  battery_voltage: number;
  alternator_current: number;
  injection_timing: number;
  manifold_pressure: number;
  throttle_position: number;
  altitude: number;
  ambient_temperature: number;
  ambient_pressure: number;
  air_density: number;
  humidity: number;
  airspeed: number;
  mission_profile_type: string;
  cht_rate_of_change: number;
  egt_rate_of_change: number;
  oil_pressure_rpm_ratio: number;
  fuel_air_efficiency_estimate: number;
  power_output_estimate: number;
  combustion_cyclic_variability: number;
  thermal_cycling_stress_index: number;
  twin_predicted_cht: number;
  twin_predicted_egt: number;
  twin_predicted_oil_pressure: number;
  residual_cht: number;
  residual_egt: number;
  residual_oil_pressure: number;
  twin_fidelity_score: number;
  sensor_status_cht: string;
  sensor_status_egt: string;
  sensor_status_oil_pressure: string;
  is_virtual_reading_cht: boolean;
  is_virtual_reading_egt: boolean;
  is_virtual_reading_oil_pressure: boolean;
  fault_type: string;
  failure_mode_class: string;
  
  // AI/ML Enrichment
  rul_hours?: number;
  anomaly?: number; // 0 = Normal, 1 = Anomaly
  health_score?: number; // 0 - 100
  shap_explanations?: ShapExplanation[];
  subsystem_health?: Record<string, SubsystemHealth>;
}

export interface AlertItem {
  id: number;
  engine_id: string;
  timestamp: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fault_type: string;
  rul_hours: number;
  message: string;
  acknowledged: boolean;
}

export interface MaintenanceRecordItem {
  id: number;
  engine_id: string;
  timestamp: string;
  maintenance_type: string;
  description: string;
  performed_by: string;
  next_due_hours: number;
}
