# Stock-Manager

Retail supply chain inventory optimization system. Monitors stock levels across multiple stores, detects stockout risks, and suggests optimal inter-store transfers using AI-driven algorithms.

## Tech Stack

| Layer    | Technology                                      |
|----------|--------------------------------------------------|
| Backend  | FastAPI, SQLite, Pydantic                        |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS         |
| Viz      | Recharts, Leaflet (interactive map)              |
| Algo     | Custom Python (exponential-weighted speed, Z-score classification, greedy allocation) |

## Features

- **Dashboard** — Real-time KPIs: total units, store distribution, highest/lowest stock
- **Inventory** — Product-by-product stock levels across all stores and sizes
- **Alerts** — Stockout risk detection by severity (Critical / High / Medium / Low)
- **Workflow** — Transfer engine suggesting automatic or manager-approved inter-store moves
- **Alerts History** — Historical alert archive with actions taken and resolution status
- **Interactive Map** — Geospatial view of 10 stores across Romania
- **Insights & Analytics** — Supply chain trends and performance charts
- **Logistics** — Shipment tracking and coordination
- **Audit Logs** — Full event history for compliance
- **Settings** — Algorithm parameter configuration

## Quick Start

### 1. Database

```bash
python setupdb.py       # create schema
python populatedb.py    # populate with sample data (10 stores, 40+ products, 120 days of sales)
```

### 2. Backend

```bash
pip install fastapi uvicorn pydantic-settings
python -m uvicorn backend.api:app --port 8002 --reload   # http://localhost:8002
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173 (proxied to API)
```

**Note**: If you encounter port conflicts, the servers will automatically try different ports. The Vite config is set to proxy API calls to `localhost:8002` by default.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stores` | List stores |
| GET | `/api/stores/{id}/inventory` | Store inventory |
| GET | `/api/products` | List products |
| GET | `/api/products/{id}/sizes` | Product sizes |
| GET | `/api/dashboard/stock?size_id=` | Stock overview by store |
| GET | `/api/alerts/stockout?days=&product_id=&size_id=` | Stockout risk detection |
| GET | `/api/alerts/history?severity=&store_id=` | Alert history |
| GET | `/api/workflow/transfers/suggestions?days=&limit=` | Transfer recommendations |

## Algorithm Overview

The core engine in `algoritmi.py` computes:

1. **Daily Speed** — Exponential weighted moving average of daily sales (λ = 0.05)
2. **Days of Supply (DoS)** — `current_stock / daily_speed`
3. **Classification** — Z-score based: Slow (< −0.5σ), Normal, Fast (> +0.5σ)
4. **Optimal Stock** — `DoS_target × speed × (1 + safety_factor)` → 15 × speed × 1.2
5. **Transfer Scoring** — Weighted multi-criteria: DoS (50%), route cost (30%), free capacity (20%)
6. **ROI Verification** — Minimum threshold of 1.5 before approving a transfer
7. **Greedy Allocation** — Assigns surplus from overstocked stores to highest-scored destinations

Transfers above 20 units are auto-approved; smaller ones require manager review.

## Configuration

Parameters are set in `config.py` and can be overridden via `STOCK_`-prefixed environment variables:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `DoS_target` | 15 | Target Days of Supply |
| `safety_factor` | 0.20 | Safety stock buffer (20%) |
| `lambda_decay` | 0.05 | Exponential decay for speed |
| `stockout_threshold` | 5 | Alert if DoS < 5 days |
| `min_roi` | 1.5 | Minimum ROI for transfers |
| `auto_threshold` | 20 | Auto-approve if qty > 20 |

## Project Structure

```
├── backend/
│   ├── api.py              # FastAPI app + CORS
│   ├── models.py           # Pydantic response schemas
│   ├── db.py               # SQLite utilities
│   └── routes/
│       ├── stores.py       # Store & product endpoints
│       ├── dashboard.py    # Dashboard KPIs
│       ├── alerts.py       # Stockout & history endpoints
│       └── workflow.py     # Transfer suggestions
├── frontend/src/
│   ├── App.tsx             # Routing & layout
│   ├── pages/              # 10 feature pages
│   ├── components/         # Shared UI components
│   ├── hooks/              # useAuth, usePageData
│   └── lib/                # API client, types
├── config.py               # Algorithm parameters
├── algoritmi.py            # Core optimization algorithms
├── setupdb.py              # DB schema creation
├── populatedb.py           # Sample data seeder
└── teste.py                # Algorithm unit tests
```

## Tests

```bash
python teste.py
```

Covers: `compute_metrics`, `compute_surplus`, `score_destinations`, `verify_ROI`, `greedy_allocation`.

## Sample Data

- **10 stores** across Romania (Bucharest, Cluj, Timișoara, Iași, Constanța, Brașov, Sibiu, Craiova, Oradea, Arad)
- **40+ fashion products** — T-Shirts, Jeans, Hoodies, Dresses, Jackets, etc. (€49.99–€799.99)
- **6 sizes** — XS, S, M, L, XL, XXL
- **120+ days** of synthetic sales history