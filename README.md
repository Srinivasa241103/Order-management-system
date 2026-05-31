# Stockly — Inventory & Order Management

A small full-stack app for managing products, customers, and orders, with a dashboard that surfaces totals and low-stock alerts. Built for a campus placement technical assessment.

## Live

- **Frontend** — https://<your-vercel-app>.vercel.app
- **Backend API** — https://order-management-system-production-f56d.up.railway.app
- **Swagger / OpenAPI** — https://order-management-system-production-f56d.up.railway.app/docs
- **Backend image (Docker Hub)** — https://hub.docker.com/r/srinivasa241103/oms-backend

> Replace the Vercel link above with your deployed URL.

## Stack

- **Backend** — FastAPI on Python 3.13, psycopg2 (raw SQL, no ORM)
- **Frontend** — React 18 + Vite
- **Database** — PostgreSQL 16
- **Container** — Docker, orchestrated with Docker Compose locally
- **Hosting** — Railway (backend + managed Postgres), Vercel (frontend), Docker Hub (image)

## What it does

Products — add, edit, delete, search by name or SKU. SKU uniqueness is enforced at the DB level so duplicates get a clean 409 instead of corrupt data. A low-stock badge flips amber under a threshold of 10.

Customers — add, list, delete. Email uniqueness enforced the same way. Avatar shows initials.

Orders — multi-line orders against a customer. The grand total is always calculated on the server from the current product price; nothing the client sends is trusted. Stock is decremented atomically inside a transaction, so an order that partially can't be fulfilled never half-commits. Trying to order more than what's in stock fails with a useful error.

Dashboard — totals for products, customers, orders, plus the low-stock list and the five most recent orders. Each stat card is clickable and takes you to the matching page.

## Run locally

You need Docker Desktop. Nothing else — no Python, no Node, no Postgres install.

```bash
git clone https://github.com/<your-user>/order-managment-system
cd order-managment-system
cp .env.example .env     # fill in the values shown below
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Swagger: http://localhost:8000/docs

`docker compose down` stops everything. Add `-v` if you also want to wipe the Postgres volume for a clean slate.

### Environment

Root `.env` for the compose stack:

```
POSTGRES_USER=oms_user
POSTGRES_PASSWORD=change_me
POSTGRES_DB=oms
FRONTEND_URL=http://localhost:3000
```

On Railway, point `DATABASE_URL` at the bundled Postgres with `${{Postgres.DATABASE_URL}}`, and set `FRONTEND_URL` to your Vercel origin (no path, no trailing slash — browsers compare it exactly).

On Vercel, the only var you need is `VITE_API_URL=https://<backend-host>/api`.

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/products` | List |
| POST | `/api/products` | Create. 409 on duplicate SKU |
| GET | `/api/products/{id}` | One |
| PUT | `/api/products/{id}` | Update |
| DELETE | `/api/products/{id}` | Delete |
| GET | `/api/customers` | List |
| POST | `/api/customers` | Create. 409 on duplicate email |
| GET | `/api/customers/{id}` | One |
| DELETE | `/api/customers/{id}` | Delete |
| GET | `/api/orders` | List |
| POST | `/api/orders` | Create. 400 if any line exceeds stock |
| GET | `/api/orders/{id}` | One, with line items |
| DELETE | `/api/orders/{id}` | Delete |
| GET | `/api/dashboard` | Totals + low-stock + recent orders |
| GET | `/health` | Liveness |

Full request/response schemas live at `/docs`.

## Layout

```
.
├── server/                 FastAPI service
│   ├── app/
│   │   ├── api/            route definitions
│   │   ├── services/       business logic + transactions
│   │   ├── repositories/   SQL queries
│   │   ├── schemas/        Pydantic models
│   │   ├── middleware/     exception → HTTP mapping
│   │   └── db/schema.sql   one-shot DB bootstrap
│   ├── Dockerfile
│   └── requirements.txt
├── client/                 React + Vite SPA
│   ├── src/
│   │   ├── pages/          Dashboard, Products, Customers, Orders
│   │   ├── components/     shared UI primitives
│   │   └── api/client.js   thin fetch wrapper + field mapper
│   └── Dockerfile          multi-stage: build with Node, serve with nginx
└── docker-compose.yml      postgres + backend + frontend
```

## A few engineering notes

I went with raw `psycopg2` instead of SQLAlchemy on purpose — the data model is small and the order-creation transaction is the only place that really needs careful control, so an ORM would have been more cost than benefit at this scope.

The schema has `deleted_at` columns on `products`, `customers`, and `orders`. The user-facing delete buttons do hard deletes for now; the soft-delete plumbing is there so that if a referenced product or customer needs to be retired in the future without breaking historical orders, the column is ready.

Order deletion currently does **not** restock the products. The assessment spec only asks for delete, not cancel-with-restock, so I left it as is — happy to add that as a follow-up if needed.

Currency is rendered in INR on the frontend via `Intl.NumberFormat("en-IN", { currency: "INR" })`. The backend stores prices as `NUMERIC(10,2)` and is currency-agnostic, so switching display currency later is purely a frontend change.

Local dev uses a named Docker volume (`postgres_data`) so `docker compose down` and `up` don't lose your data — only `down -v` does.
