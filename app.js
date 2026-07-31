// Base URL for FastAPI Backend
const API_BASE_URL = "http://127.0.0.1:8000";

// Default Store Catalog fallback
let defaultItems = [
    { item_name: "Milk_1L", cost_price_inr: 30.0, distributor_present: 1, opening_stock: 4 },
    { item_name: "Bread_Pack", cost_price_inr: 25.0, distributor_present: 1, opening_stock: 2 },
    { item_name: "Maggi_Single", cost_price_inr: 12.0, distributor_present: 1, opening_stock: 5 },
    { item_name: "Lux_Soap_100g", cost_price_inr: 35.0, distributor_present: 0, opening_stock: 8 },
    { item_name: "Fortune_Oil_1L", cost_price_inr: 140.0, distributor_present: 1, opening_stock: 1 }
];

// Chart Instances
let stockChartInstance = null;
let cashChartInstance = null;

// Initialize on DOM Load
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    checkApiHealth();
    fetchSupportedItems();
    renderInteractiveTable();

    // Event Listeners
    document.getElementById("refresh-api-btn").addEventListener("click", () => {
        checkApiHealth();
        fetchSupportedItems();
    });

    document.getElementById("daily-plan-form").addEventListener("submit", handleDailyPlanSubmit);
    document.getElementById("single-predict-form").addEventListener("submit", handleSinglePredictSubmit);
});

/* ==========================================
   Navigation Logic
========================================== */
function initNavigation() {
    const tabs = document.querySelectorAll(".nav-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".view-panel").forEach(v => v.classList.remove("active"));

            tab.classList.add("active");
            const target = tab.getAttribute("data-target");
            document.getElementById(target).classList.add("active");
        });
    });
}

/* ==========================================
   API Synchronization & Health Checks
========================================== */
async function checkApiHealth() {
    const badge = document.getElementById("api-status-badge");
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();

        if (response.ok && data.status === "healthy" && data.model_loaded) {
            badge.className = "badge badge-online";
            badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> API: Online (Live ML)`;
        } else {
            badge.className = "badge badge-warning";
            badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> API: Model Not Loaded`;
        }
    } catch (error) {
        badge.className = "badge badge-offline";
        badge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> API: Offline`;
    }
}

async function fetchSupportedItems() {
    const singleItemSelect = document.getElementById("single_item_name");
    try {
        const response = await fetch(`${API_BASE_URL}/supported-items`);
        if (!response.ok) throw new Error("Failed to load supported items");
        
        const data = await response.json();
        const items = data.supported_items;

        singleItemSelect.innerHTML = items.map(item => `<option value="${item}">${item}</option>`).join("");
    } catch (error) {
        singleItemSelect.innerHTML = defaultItems.map(i => `<option value="${i.item_name}">${i.item_name}</option>`).join("");
    }
}

/* ==========================================
   Interactive Table Management
========================================== */
function renderInteractiveTable() {
    const tbody = document.getElementById("interactive-items-tbody");
    tbody.innerHTML = defaultItems.map((item, index) => `
        <tr>
            <td><strong>${item.item_name}</strong></td>
            <td>
                <input type="number" class="form-control item-cost" data-index="${index}" value="${item.cost_price_inr}" step="0.5" min="1" />
            </td>
            <td>
                <select class="form-control item-dist" data-index="${index}">
                    <option value="1" ${item.distributor_present === 1 ? "selected" : ""}>1 - Yes</option>
                    <option value="0" ${item.distributor_present === 0 ? "selected" : ""}>0 - No</option>
                </select>
            </td>
            <td>
                <input type="number" class="form-control item-stock" data-index="${index}" value="${item.opening_stock}" min="0" />
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="removeTableItem(${index})"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join("");
}

function removeTableItem(index) {
    defaultItems.splice(index, 1);
    renderInteractiveTable();
}

function getItemsFromTable() {
    const rows = document.querySelectorAll("#interactive-items-tbody tr");
    const items = [];

    rows.forEach((row, index) => {
        const name = defaultItems[index].item_name;
        const cost = parseFloat(row.querySelector(".item-cost").value);
        const dist = parseInt(row.querySelector(".item-dist").value);
        const stock = parseInt(row.querySelector(".item-stock").value);

        items.push({
            item_name: name,
            cost_price_inr: cost,
            distributor_present: dist,
            opening_stock: stock
        });
    });

    return items;
}

/* ==========================================
   Endpoint: /predict/daily-plan
========================================== */
async function handleDailyPlanSubmit(event) {
    event.preventDefault();

    const payload = {
        day_num: parseInt(document.getElementById("day_num").value),
        month: parseInt(document.getElementById("month").value),
        is_festival_season: parseInt(document.getElementById("is_festival_season").value),
        morning_cash_inr: parseFloat(document.getElementById("morning_cash_inr").value),
        items: getItemsFromTable()
    };

    try {
        const response = await fetch(`${API_BASE_URL}/predict/daily-plan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "API returned an error");
        }

        const planData = await response.json();
        updateDashboard(planData, payload.items);

        // Switch automatically to executive dashboard tab
        document.querySelector('[data-target="dashboard-view"]').click();

    } catch (error) {
        alert(`Failed to generate plan: ${error.message}`);
    }
}

/* ==========================================
   Endpoint: /predict/single
========================================== */
async function handleSinglePredictSubmit(event) {
    event.preventDefault();

    const resultBox = document.getElementById("single-result-box");
    
    const payload = {
        day_num: parseInt(document.getElementById("day_num").value),
        month: parseInt(document.getElementById("month").value),
        is_festival_season: parseInt(document.getElementById("is_festival_season").value),
        item_name: document.getElementById("single_item_name").value,
        cost_price_inr: parseFloat(document.getElementById("single_cost").value),
        distributor_present: parseInt(document.getElementById("single_dist").value),
        opening_stock: parseInt(document.getElementById("single_stock").value),
        morning_cash_inr: parseFloat(document.getElementById("morning_cash_inr").value)
    };

    try {
        const response = await fetch(`${API_BASE_URL}/predict/single`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "API Call Failed");
        }

        const res = await response.json();
        resultBox.classList.remove("hidden");
        resultBox.innerHTML = `
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-top: 10px;">
                <p><strong>SKU:</strong> ${res.item_name}</p>
                <p><strong>Recommended Order Qty:</strong> <span style="font-size:1.2em; color:#4CAF50;">${res.recommended_buy_qty} units</span></p>
                <p><strong>Estimated Spend:</strong> ₹${res.estimated_cost_inr.toFixed(2)}</p>
                ${res.warning ? `<p style="color: #FF9800; margin-top:5px;"><i class="fa-solid fa-triangle-exclamation"></i> ${res.warning}</p>` : ''}
            </div>
        `;
    } catch (error) {
        resultBox.classList.remove("hidden");
        resultBox.innerHTML = `<p style="color: #f44336;">Error: ${error.message}</p>`;
    }
}

/* ==========================================
   Dashboard Renderer & Chart.js Updates
========================================== */
function updateDashboard(plan, inputItems) {
    // KPI Cards
    document.getElementById("kpi-cash").textContent = `₹${plan.morning_cash_inr.toFixed(2)}`;
    document.getElementById("kpi-spend").textContent = `₹${plan.total_budget_allocated_inr.toFixed(2)}`;
    document.getElementById("kpi-remaining").textContent = `₹${plan.remaining_cash_inr.toFixed(2)}`;

    const reorderedCount = plan.recommendations.filter(r => r.recommended_buy_qty > 0).length;
    document.getElementById("kpi-reorder-count").textContent = `${reorderedCount} / ${plan.total_items_evaluated}`;

    // Table Data Binding
    const tbody = document.getElementById("dashboard-table-body");
    tbody.innerHTML = plan.recommendations.map(rec => {
        const originalInput = inputItems.find(i => i.item_name === rec.item_name) || {};
        const openingStock = originalInput.opening_stock ?? 0;
        const unitCost = originalInput.cost_price_inr ?? (rec.recommended_buy_qty > 0 ? rec.estimated_cost_inr / rec.recommended_buy_qty : 0.0);

        return `
            <tr>
                <td><strong>${rec.item_name}</strong></td>
                <td>${rec.distributor_present ? '<span style="color:#4CAF50;">Yes</span>' : '<span style="color:#888;">No</span>'}</td>
                <td>${openingStock}</td>
                <td><strong style="font-size: 1.1em; color: ${rec.recommended_buy_qty > 0 ? '#2196F3' : '#888'}">${rec.recommended_buy_qty}</strong></td>
                <td>₹${unitCost.toFixed(2)}</td>
                <td>₹${rec.estimated_cost_inr.toFixed(2)}</td>
                <td>
                    ${rec.warning ? `<span style="color:#FF9800;"><i class="fa-solid fa-triangle-exclamation"></i> ${rec.warning}</span>` : '<span style="color:#4CAF50;"><i class="fa-solid fa-circle-check"></i> Optimal</span>'}
                </td>
            </tr>
        `;
    }).join("");

    // Render Charts
    renderStockCompareChart(plan.recommendations, inputItems);
    renderCashDistributionChart(plan.recommendations);
}

function renderStockCompareChart(recommendations, inputItems) {
    const ctx = document.getElementById("stockCompareChart").getContext("2d");
    if (stockChartInstance) stockChartInstance.destroy();

    const labels = recommendations.map(r => r.item_name);
    const buyQtyData = recommendations.map(r => r.recommended_buy_qty);
    const openingStockData = recommendations.map(r => {
        const match = inputItems.find(i => i.item_name === r.item_name);
        return match ? match.opening_stock : 0;
    });

    stockChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                { label: "Opening Stock", data: openingStockData, backgroundColor: "rgba(156, 39, 176, 0.6)" },
                { label: "AI Order Qty", data: buyQtyData, backgroundColor: "rgba(33, 150, 243, 0.8)" }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderCashDistributionChart(recommendations) {
    const ctx = document.getElementById("cashDistributionChart").getContext("2d");
    if (cashChartInstance) cashChartInstance.destroy();

    const activeItems = recommendations.filter(r => r.estimated_cost_inr > 0);
    const labels = activeItems.map(r => r.item_name);
    const spendData = activeItems.map(r => r.estimated_cost_inr);

    cashChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: labels.length ? labels : ["No Purchases"],
            datasets: [{
                data: spendData.length ? spendData : [1],
                backgroundColor: [
                    "#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0", "#00BCD4"
                ]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}