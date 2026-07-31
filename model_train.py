import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# 1. Load the generated dataset
df = pd.read_csv("kirana_inventory_daily_1440_rows.csv")

# 2. Preprocess & Feature Engineering
# Encode categorical features
encoder = LabelEncoder()
df['Item_Code'] = encoder.fit_transform(df['Item_Name'])

# Select input features for training
feature_cols = [
    'Day_Num',
    'Month',
    'Is_Festival_Season',
    'Item_Code',
    'Cost_Price_INR',
    'Distributor_Present',
    'Opening_Stock',
    'Morning_Cash_INR'
]

X = df[feature_cols]
y = df['Actual_Buy_Qty']  # Target: realistic restock amount under cash constraints

# 3. Train / Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 4. Model Training
model = RandomForestRegressor(
    n_estimators=150,
    max_depth=10,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

# 5. Model Evaluation
predictions = model.predict(X_test)
mae = mean_absolute_error(y_test, predictions)
r2 = r2_score(y_test, predictions)

print(f"Model Training Complete!")
print(f"Mean Absolute Error (MAE): {mae:.2f} units")
print(f"R² Score: {r2:.4f}")

# 6. Save model and encoder
joblib.dump(model, "kirana_restock_model.pkl")
joblib.dump(encoder, "item_label_encoder.pkl")
print("Saved model -> kirana_restock_model.pkl")