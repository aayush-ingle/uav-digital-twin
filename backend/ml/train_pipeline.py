import os
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier, IsolationForest
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, classification_report

def train():
    print("Step 1: Load and explore the dataset")
    data_path = r"d:\SIH project\docs\aero_piston_engine_digital_twin_5000.xlsx"
    df = pd.read_excel(data_path)
    print(f"Shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    print(f"Dtypes:\n{df.dtypes}")

    print("\nStep 2: Feature engineering")
    drop_cols = ['timestamp', 'fault_onset_timestamp', 'engine_id', 'mission_id', 'fault_severity', 'anomaly_label', 'RUL_hours', 'RUL']
    
    categorical_cols = ['flight_phase', 'mission_profile_type', 'sensor_status_cht', 'sensor_status_egt', 'sensor_status_oil_pressure']
    boolean_cols = ['is_virtual_reading_cht', 'is_virtual_reading_egt', 'is_virtual_reading_oil_pressure']
    
    for col in boolean_cols:
        if col in df.columns:
            df[col] = df[col].astype(int)

    all_cols = df.columns.tolist()
    label_cols = ['fault_type', 'failure_mode_class']
    numeric_cols = [c for c in all_cols if c not in drop_cols + categorical_cols + boolean_cols + label_cols]
    
    numeric_features = [c for c in numeric_cols if c in df.columns] + [c for c in boolean_cols if c in df.columns]
    categorical_features = [c for c in categorical_cols if c in df.columns]

    print(f"Numeric features ({len(numeric_features)}): {numeric_features}")
    print(f"Categorical features ({len(categorical_features)}): {categorical_features}")

    print("\nStep 3: RUL Target Derivation")
    if 'RUL_hours' in df.columns:
        df['RUL'] = df['RUL_hours']
    else:
        df['RUL'] = 1500 - df['engine_operating_hours_cumulative']
        df['RUL'] = df['RUL'].clip(0, 1500)

    # Prepare save directory
    save_dir = r"d:\SIH project\backend\ml\trained"
    os.makedirs(save_dir, exist_ok=True)

    print("\nStep 4: Train Model 1 — RUL Regression (Random Forest)")
    X_rul_num = df[numeric_features]
    X_rul_cat = df[categorical_features]
    y_rul = df['RUL']

    encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
    encoded_cats = encoder.fit_transform(X_rul_cat)
    cat_feature_names = encoder.get_feature_names_out(categorical_features)
    
    X_rul_encoded = pd.DataFrame(encoded_cats, columns=cat_feature_names, index=X_rul_cat.index)
    X_rul = pd.concat([X_rul_num, X_rul_encoded], axis=1)
    rul_feature_order = X_rul.columns.tolist()

    X_train_rul, X_test_rul, y_train_rul, y_test_rul = train_test_split(X_rul, y_rul, test_size=0.2, random_state=42)
    
    rul_model = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
    rul_model.fit(X_train_rul, y_train_rul)
    y_pred_rul = rul_model.predict(X_test_rul)
    
    print(f"RUL R2: {r2_score(y_test_rul, y_pred_rul)}")
    print(f"RUL MAE: {mean_absolute_error(y_test_rul, y_pred_rul)}")

    joblib.dump(rul_model, os.path.join(save_dir, 'rul_model.pkl'))
    joblib.dump(encoder, os.path.join(save_dir, 'rul_encoder.pkl'))
    joblib.dump(categorical_features, os.path.join(save_dir, 'rul_categorical_features.pkl'))
    joblib.dump(numeric_features, os.path.join(save_dir, 'rul_numeric_features.pkl'))
    joblib.dump(rul_feature_order, os.path.join(save_dir, 'rul_feature_order.pkl'))

    print("\nStep 5: Train Model 2 — Fault Classification (Gradient Boosting Pipeline)")
    input_features = numeric_features + categorical_features
    X_fault = df[input_features]
    y_fault = df['fault_type']

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', 'passthrough', numeric_features),
            ('cat', OneHotEncoder(sparse_output=False, handle_unknown='ignore'), categorical_features)
        ])

    fault_model = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42))
    ])

    X_train_f, X_test_f, y_train_f, y_test_f = train_test_split(X_fault, y_fault, test_size=0.2, random_state=42)
    fault_model.fit(X_train_f, y_train_f)
    y_pred_f = fault_model.predict(X_test_f)
    print(classification_report(y_test_f, y_pred_f))

    joblib.dump(fault_model, os.path.join(save_dir, 'fault_model.pkl'))
    joblib.dump(input_features, os.path.join(save_dir, 'fault_feature_order.pkl'))

    print("\nStep 6: Train Model 3 — Anomaly Detection (Isolation Forest Pipeline)")
    healthy_df = df[df['fault_type'] == 'none']
    X_healthy = healthy_df[input_features]

    anomaly_model = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', IsolationForest(n_estimators=100, contamination=0.05, random_state=42))
    ])
    
    anomaly_model.fit(X_healthy)
    
    y_pred_all = anomaly_model.predict(X_fault)
    # Output is -1 (anomaly), 1 (normal). Map to 1 (anomaly), 0 (normal)
    y_pred_mapped = np.where(y_pred_all == -1, 1, 0)
    
    # Calculate rates
    is_faulty = df['fault_type'] != 'none'
    anomaly_rate_healthy = y_pred_mapped[~is_faulty].mean()
    anomaly_rate_faulty = y_pred_mapped[is_faulty].mean()
    
    print(f"Anomaly Detection Rate (Healthy): {anomaly_rate_healthy:.4f}")
    print(f"Anomaly Detection Rate (Faulty): {anomaly_rate_faulty:.4f}")

    joblib.dump(anomaly_model, os.path.join(save_dir, 'anomaly_model.pkl'))
    joblib.dump(input_features, os.path.join(save_dir, 'anomaly_feature_order.pkl'))
    
    print("\nTraining complete. Models saved to:", save_dir)

if __name__ == '__main__':
    train()
