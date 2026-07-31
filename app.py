from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from contextlib import asynccontextmanager
import joblib
import pandas as pd
import numpy as np
import os
from fastapi.staticfiles import StaticFiles

# Global variables for ML assets
model = None
label_encoder = None

# Feature column order matching model training data
FEATURE_COLS = [
    'Day_Num',
    'Month',
    'Is_Festival_Season',
    'Item_Code',
    'Cost_Price_INR',
    'Distributor_Present',
    'Opening_Stock',
    'Morning_Cash_INR'
]


# Modern FastAPI Lifespan Handler for Startup & Shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load trained ML model and LabelEncoder on application startup."""
    global model, label_encoder
    model_path = "kirana_restock_model.pkl"
    encoder_path = "item_label_encoder.pkl"

    if not os.path.exists(model_path) or not os.path.exists(encoder_path):
        print(f"⚠️ Warning: Missing '{model_path}' or '{encoder_path}'. API starting in uninitialized state.")
    else:
        model = joblib.load(model_path)
        label_encoder = joblib.load(encoder_path)
        print("✓ Model and LabelEncoder loaded successfully.")
    
    yield  # Application serves requests
    
    # Cleanup on shutdown (if needed)
    print("Application shutdown complete.")


# Initialize FastAPI App
app = FastAPI(
    title="Kirana-Cap AI Inventory Optimizer",
    description="API for optimizing daily Kirana store purchasing decisions under working capital constraints.",
    version="1.1.0",
    lifespan=lifespan
)

# Enable CORS (Cross-Origin Resource Sharing) for Web Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from HTML/JS frontend hosted anywhere
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, OPTIONS, etc.
    allow_headers=["*"],
)


# ==========================================
# Pydantic Schemas (Input / Output Models)
# ==========================================

class SingleItemRequest(BaseModel):
    day_num: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    month: int = Field(..., ge=1, le=12, description="1 to 12")
    is_festival_season: int = Field(..., ge=0, le=1, description="1 if festival season, else 0")
    item_name: str = Field(..., examples=["Maggi_Single"], description="SKU name")
    cost_price_inr: float = Field(..., gt=0, description="Wholesale cost per unit in INR")
    distributor_present: int = Field(..., ge=0, le=1, description="1 if supplier visits today, else 0")
    opening_stock: int = Field(..., ge=0, description="Current stock on hand")
    morning_cash_inr: float = Field(..., ge=0, description="Available liquid cash in INR")


class SingleItemPredictionResponse(BaseModel):
    item_name: str
    recommended_buy_qty: int
    estimated_cost_inr: float
    distributor_present: bool
    warning: Optional[str] = None


class ItemInput(BaseModel):
    item_name: str = Field(..., examples=["Milk_1L"])
    cost_price_inr: float = Field(..., gt=0)
    distributor_present: int = Field(..., ge=0, le=1)
    opening_stock: int = Field(..., ge=0)


class DailyBatchRequest(BaseModel):
    day_num: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    month: int = Field(..., ge=1, le=12)
    is_festival_season: int = Field(..., ge=0, le=1)
    morning_cash_inr: float = Field(..., ge=0, description="Morning cash available in INR")
    items: List[ItemInput]


class DailyPlanSummary(BaseModel):
    total_items_evaluated: int
    morning_cash_inr: float
    total_budget_allocated_inr: float
    remaining_cash_inr: float
    recommendations: List[SingleItemPredictionResponse]


# ==========================================
# Endpoints
# ==========================================
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Serve CSS, JS, and image files from the current folder
app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/", include_in_schema=False)
async def serve_frontend():
    return FileResponse("index.html")

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Health check endpoint to verify API and model status."""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "encoder_loaded": label_encoder is not None
    }


@app.get("/supported-items", status_code=status.HTTP_200_OK)
def get_supported_items():
    """List all item names recognized by the trained LabelEncoder."""
    if label_encoder is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LabelEncoder not loaded on server."
        )
    return {"supported_items": list(label_encoder.classes_)}


@app.post("/predict/single", response_model=SingleItemPredictionResponse)
def predict_single_item(request: SingleItemRequest):
    """Predict optimal purchase quantity for a single SKU."""
    if model is None or label_encoder is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML Model assets are not loaded on server."
        )

    # Validate item name
    if request.item_name not in label_encoder.classes_:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown item '{request.item_name}'. Supported items: {list(label_encoder.classes_)}"
        )

    # Encode item name
    item_code = int(label_encoder.transform([request.item_name])[0])

    # Build feature row dataframe
    input_data = pd.DataFrame([{
        'Day_Num': request.day_num,
        'Month': request.month,
        'Is_Festival_Season': request.is_festival_season,
        'Item_Code': item_code,
        'Cost_Price_INR': request.cost_price_inr,
        'Distributor_Present': request.distributor_present,
        'Opening_Stock': request.opening_stock,
        'Morning_Cash_INR': request.morning_cash_inr
    }], columns=FEATURE_COLS)

    # Make prediction
    raw_pred = model.predict(input_data)[0]
    buy_qty = max(0, int(round(raw_pred)))

    # Apply strict domain rule: If distributor is not present, buy qty is strictly 0
    warning = None
    if request.distributor_present == 0:
        if buy_qty > 0:
            warning = "Override: Order set to 0 because distributor is not visiting today."
        buy_qty = 0

    est_cost = round(buy_qty * request.cost_price_inr, 2)

    # Cash constraint check
    if est_cost > request.morning_cash_inr:
        max_affordable = int(request.morning_cash_inr // request.cost_price_inr)
        warning = f"Quantity capped from {buy_qty} to {max_affordable} due to available cash limit."
        buy_qty = max_affordable
        est_cost = round(buy_qty * request.cost_price_inr, 2)

    return SingleItemPredictionResponse(
        item_name=request.item_name,
        recommended_buy_qty=buy_qty,
        estimated_cost_inr=est_cost,
        distributor_present=bool(request.distributor_present),
        warning=warning
    )


@app.post("/predict/daily-plan", response_model=DailyPlanSummary)
def generate_daily_plan(request: DailyBatchRequest):
    """Generate a complete daily purchasing plan for all items in the store under cash limits."""
    if model is None or label_encoder is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML Model assets are not loaded on server."
        )

    recommendations = []
    total_allocated = 0.0
    remaining_cash = request.morning_cash_inr

    for item in request.items:
        # Handle unrecognized items gracefully
        if item.item_name not in label_encoder.classes_:
            recommendations.append(SingleItemPredictionResponse(
                item_name=item.item_name,
                recommended_buy_qty=0,
                estimated_cost_inr=0.0,
                distributor_present=bool(item.distributor_present),
                warning=f"SKU '{item.item_name}' not found in trained model index."
            ))
            continue

        item_code = int(label_encoder.transform([item.item_name])[0])

        input_data = pd.DataFrame([{
            'Day_Num': request.day_num,
            'Month': request.month,
            'Is_Festival_Season': request.is_festival_season,
            'Item_Code': item_code,
            'Cost_Price_INR': item.cost_price_inr,
            'Distributor_Present': item.distributor_present,
            'Opening_Stock': item.opening_stock,
            'Morning_Cash_INR': remaining_cash
        }], columns=FEATURE_COLS)

        raw_pred = model.predict(input_data)[0]
        buy_qty = max(0, int(round(raw_pred)))

        warning = None
        if item.distributor_present == 0:
            buy_qty = 0
        else:
            # Enforce hard cash constraint sequentially
            max_affordable = int(remaining_cash // item.cost_price_inr)
            if buy_qty > max_affordable:
                warning = f"Quantity capped from {buy_qty} to {max_affordable} due to available cash limit."
                buy_qty = max_affordable

        est_cost = round(buy_qty * item.cost_price_inr, 2)
        remaining_cash -= est_cost
        total_allocated += est_cost

        recommendations.append(SingleItemPredictionResponse(
            item_name=item.item_name,
            recommended_buy_qty=buy_qty,
            estimated_cost_inr=est_cost,
            distributor_present=bool(item.distributor_present),
            warning=warning
        ))

    return DailyPlanSummary(
        total_items_evaluated=len(recommendations),
        morning_cash_inr=request.morning_cash_inr,
        total_budget_allocated_inr=round(total_allocated, 2),
        remaining_cash_inr=round(max(0.0, remaining_cash), 2),
        recommendations=recommendations
    )

# Add this at the very end of app.py
app.mount("/", StaticFiles(directory=".", html=True), name="static")