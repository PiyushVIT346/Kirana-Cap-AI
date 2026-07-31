# 🛒 Kirana-Cap AI: Smart Cash-Constrained Inventory Optimizer

> **An AI-powered decision support system designed specifically for micro-retailers (*Kirana* store owners) operating under strict daily liquid cash constraints.**

---
## 📸 Application Screenshots

<table>
  <tr>
    <td align="center">
      <img src="https://raw.githubusercontent.com/PiyushVIT346/Kirana-Cap-AI/main/s1.jpg" alt="Dashboard Screenshot" width="450"/>
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/PiyushVIT346/Kirana-Cap-AI/main/s2.jpg" alt="Prediction Screenshot" width="450"/>
    </td>
  </tr>
  <tr>
    <td align="center"><b>Dashboard</b></td>
    <td align="center"><b>Prediction Results</b></td>
  </tr>
</table>

---


## 📌 Overview

Neighborhood corner stores in India operate on dynamic, cash-on-delivery inventory models. Store owners frequently face a double-edged sword:

- 💸 **Capital Exhaustion:** Spending too much morning cash on slow-moving bulk goods, leaving no liquidity for fast-moving essentials like milk and bread.
- 🚚 **Supplier Schedule Friction:** Purchasing stock for products whose distributors are not visiting on that day.

**Kirana-Cap AI** addresses these challenges by combining a **Machine Learning demand forecasting model** with a **business constraint optimization engine**. The system generates the optimal purchase plan for every SKU while ensuring the total purchase cost never exceeds the available morning cash.

---

## ✨ Features

- 🤖 **ML-Based Demand Forecasting**
  - Predicts daily demand using:
    - Day of the week
    - Month/seasonality
    - Festival indicator

- 💰 **Cash-Constrained Optimization**
  - Guarantees recommendations stay within available working capital.

- 🚚 **Supplier Availability Logic**
  - Automatically skips ordering items when the supplier is unavailable (`distributor_present = 0`).

- 📊 **Interactive Dashboard**
  - Visualizes:
    - Capital allocation
    - SKU stock levels
    - Budget utilization
    - Remaining cash buffer
  - Built using **Chart.js**

- ⚡ **Single SKU Prediction**
  - Test inventory recommendations for individual products using:
    ```
    /predict/single
    ```

- 🌐 **Web-Based Application**
  - Lightweight FastAPI-powered web interface with responsive frontend.

---

# 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Backend** | FastAPI |
| **Language** | Python 3.10+ |
| **Server** | Uvicorn |
| **Machine Learning** | Scikit-Learn |
| **Data Processing** | Pandas, NumPy |
| **Model Serialization** | Joblib |
| **Database** | SQLite |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Charts** | Chart.js |

---

# 📁 Project Structure

```text
kirana-cap-ai/
├── app.py                      # FastAPI backend & REST endpoints
├── index.html                  # Single-page dashboard
├── app.js                      # Frontend logic + Chart.js
├── styles.css                  # Styling
├── view_db.py                  # SQLite inspection utility
├── requirements.txt            # Project dependencies
├── kirana_restock_model.pkl    # Trained ML model
├── item_label_encoder.pkl      # LabelEncoder
├── kirana_app.db               # SQLite database (generated automatically)
└── README.md                   # Documentation
```

---

# 🚀 Quick Start

## Prerequisites

- Python **3.10+**
- Git

---

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/kirana-cap-ai.git
cd kirana-cap-ai
```

---

## 2️⃣ Create a Virtual Environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## 3️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 4️⃣ Start the Server

```bash
uvicorn app:app --reload
```

---

## 5️⃣ Open the Application

### 🌐 Web Dashboard

```
http://127.0.0.1:8000/
```

### 📚 Swagger API Documentation

```
http://127.0.0.1:8000/docs
```

---

# 🔌 API Reference

## 1. Health Check

**Endpoint**

```http
GET /health
```

### Response

```json
{
  "status": "healthy",
  "model_loaded": true
}
```

---

## 2. Get Supported SKUs

**Endpoint**

```http
GET /supported-items
```

### Response

```json
{
  "supported_items": [
    "Milk_1L",
    "Maggi_Single",
    "Fortune_Oil_1L",
    "Lux_Soap_100g"
  ]
}
```

---

## 3. Generate Daily Purchase Plan

**Endpoint**

```http
POST /predict/daily-plan
```

### Request Body

```json
{
  "day_num": 2,
  "month": 7,
  "is_festival": 0,
  "morning_cash_inr": 2500.0,
  "items": [
    {
      "item_name": "Milk_1L",
      "opening_stock": 4,
      "unit_cost": 30.0,
      "distributor_present": 1
    },
    {
      "item_name": "Fortune_Oil_1L",
      "opening_stock": 1,
      "unit_cost": 140.0,
      "distributor_present": 1
    }
  ]
}
```

---

# 🧪 Database Inspection

To inspect registered users and API execution logs stored in the SQLite database:

```bash
python view_db.py
```

---

# ☁️ Deployment

## Deploy on Render

### Step 1

Push your project to GitHub.

### Step 2

Create a **New Web Service** on **Render**.

### Step 3

Connect your GitHub repository.

### Step 4

Configure the deployment settings:

| Setting | Value |
|---------|-------|
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app:app --host 0.0.0.0 --port $PORT` |

### Step 5

Click **Deploy** and wait for the build to complete.

---

# 📈 How It Works

```text
Historical Sales Data
          │
          ▼
Feature Engineering
(Day, Month, Festival)
          │
          ▼
ML Demand Forecast Model
          │
          ▼
Predicted Daily Demand
          │
          ▼
Business Constraint Engine
 ├── Cash Limit
 ├── Opening Stock
 └── Supplier Availability
          │
          ▼
Optimized Purchase Plan
          │
          ▼
Dashboard + REST API Response
```

---

# 🎯 Business Rules

The optimization engine enforces the following constraints:

- ✅ Total purchase cost never exceeds available morning cash.
- ✅ Items with unavailable suppliers receive an order quantity of **0**.
- ✅ Existing inventory is considered before recommending restocking.
- ✅ Fast-moving products are prioritized when capital is limited.
- ✅ Purchase quantities are automatically adjusted to maximize inventory efficiency.

---

# 📄 License

This project is intended for educational, research, and demonstration purposes.

---

## ⭐ If you found this project useful, consider giving it a star on GitHub!
