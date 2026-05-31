# Step-by-Step Guide: From Now to Deployment

This is your roadmap for the Inventory & Order Management System assessment. Follow the phases in order. Each phase ends with a checkpoint — don't move on until the checkpoint passes.

**Recommended hosts:** Railway (backend + Postgres), Vercel (frontend), Docker Hub (backend image).

---

## Phase 0 — Project Layout & Git

Set up a clean structure before adding more code.

```
order-managment-system/
├── server/                 # FastAPI backend (already exists)
├── client/                 # React frontend (to be created)
├── docker-compose.yml      # Orchestrates all 3 services
├── .gitignore
└── README.md
```

**Steps:**
1. `cd /Users/cherry/order-managment-system`
2. `git init` (if not already a repo)
3. Create `.gitignore` at the root with at minimum:
   ```
   # Python
   __pycache__/
   *.pyc
   venv/
   .env
   .env.local

   # Node
   node_modules/
   dist/
   build/

   # OS
   .DS_Store
   ```
4. `git add . && git commit -m "Initial project structure"`

**Checkpoint:** `git status` shows a clean tree. `.env` is NOT tracked.

---

## Phase 1 — Backend in Docker (Local)

Goal: `docker compose up` brings up Postgres + backend, and `GET /health` returns OK.

### 1.1 Confirm the DB schema bootstrap

Your `server/app/db/schema.sql` should contain `CREATE TABLE` statements for products, customers, orders, and order_items. Postgres in Docker will run any `*.sql` file mounted at `/docker-entrypoint-initdb.d/` on first boot, which is how we'll seed the schema. Make sure schema.sql is idempotent (`CREATE TABLE IF NOT EXISTS ...`).

Schema essentials (per the PDF business rules):
- `products`: id, name, sku UNIQUE, price, quantity (CHECK quantity >= 0)
- `customers`: id, full_name, email UNIQUE, phone
- `orders`: id, customer_id FK, total_amount, created_at
- `order_items`: id, order_id FK, product_id FK, quantity, unit_price

### 1.2 Create `server/Dockerfile`

```dockerfile
FROM python:3.13-slim

WORKDIR /app

# System deps for psycopg2 (binary version still needs libpq at runtime is fine; keep slim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 1.3 Create `server/.dockerignore`

```
venv/
__pycache__/
*.pyc
.env
.env.local
.git/
.pytest_cache/
*.md
```

### 1.4 Create root `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/app/db/schema.sql:/docker-entrypoint-initdb.d/schema.sql:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./server
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      APP_ENV: development
      DEBUG: "true"
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

### 1.5 Create root `.env` (NOT committed)

```
POSTGRES_USER=oms_user
POSTGRES_PASSWORD=change_me_locally
POSTGRES_DB=oms
```

Delete `server/.env` — env now flows from compose.

### 1.6 Run it

```bash
docker compose up --build
```

**Checkpoint:**
- `curl http://localhost:8000/health` returns 200 with the JSON body.
- `docker compose exec postgres psql -U oms_user -d oms -c '\dt'` lists your tables.
- `Ctrl+C`, then `docker compose down` (without `-v`) and `docker compose up` again — data persists.

Commit: `git add . && git commit -m "Containerize backend with Postgres"`.

---

## Phase 2 — React Frontend

### 2.1 Scaffold with Vite

```bash
cd /Users/cherry/order-managment-system
npm create vite@latest client -- --template react
cd client
npm install
npm install axios react-router-dom
```

Test it: `npm run dev` → http://localhost:5173 should show the Vite welcome page.

### 2.2 Build the features (per Section 5 of the PDF)

Suggested folder layout:
```
client/src/
├── api/           # axios instance + endpoint functions
├── components/    # reusable bits (Navbar, Table, Modal, FormField)
├── pages/
│   ├── Dashboard.jsx
│   ├── Products.jsx
│   ├── Customers.jsx
│   └── Orders.jsx
├── App.jsx
└── main.jsx
```

**API base URL via env var.** Create `client/.env`:
```
VITE_API_URL=http://localhost:8000/api
```

In `client/src/api/client.js`:
```js
import axios from "axios";
export default axios.create({ baseURL: import.meta.env.VITE_API_URL });
```

Features to build:
- Products page: list / add / edit / delete
- Customers page: list / add / delete
- Orders page: list / view details / create (select customer + products + quantities; backend computes total)
- Dashboard: total products, total customers, total orders, low-stock list
- Forms: client-side validation, show server error messages clearly

**Checkpoint:** All four pages work against the running backend at `localhost:8000`.

### 2.3 Dockerize the frontend (multi-stage build)

Create `client/Dockerfile`:
```dockerfile
# Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: serve
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `client/nginx.conf` (so React Router deep-links don't 404):
```
server {
  listen 80;
  location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;
  }
}
```

Create `client/.dockerignore`:
```
node_modules/
dist/
.env
.env.local
.git/
```

### 2.4 Add frontend to `docker-compose.yml`

Append under `services:`:
```yaml
  frontend:
    build:
      context: ./client
      args:
        VITE_API_URL: http://localhost:8000/api
    ports:
      - "3000:80"
    depends_on:
      - backend
```

`docker compose up --build` → frontend at http://localhost:3000, backend at http://localhost:8000.

**Checkpoint:** Full stack runs from `docker compose up`. Create a product in the UI, refresh, it's still there.

Commit.

---

## Phase 3 — Requirements Audit

Before deploying, walk the PDF top to bottom and verify each rule:

**Section 4 — Business logic:**
- [ ] Product SKU UNIQUE constraint (DB level + 409 on conflict)
- [ ] Customer email UNIQUE constraint
- [ ] Product quantity CHECK (>= 0)
- [ ] `POST /orders` rejects with 400 if any line item exceeds stock
- [ ] `POST /orders` decrements `products.quantity` atomically (single transaction)
- [ ] `total_amount` computed server-side from `price * quantity`, never trusted from client
- [ ] All endpoints return appropriate status codes (200/201/204/400/404/409/422)
- [ ] Pydantic schemas validate every request body

**Section 6 — UI/UX:**
- [ ] Responsive (test in browser devtools mobile view)
- [ ] Form validation messages
- [ ] Success/error toasts or banners

**Section 7 — Docker:**
- [ ] Slim base images (`python:3.13-slim`, `node:20-alpine`, `nginx:alpine`, `postgres:16-alpine`)
- [ ] No hardcoded credentials anywhere (`grep -r "password" .` should only find env references)
- [ ] Named volume for Postgres (`postgres_data`)
- [ ] `.dockerignore` in both `server/` and `client/`

---

## Phase 4 — Push to GitHub

```bash
gh repo create oms-assessment --public --source=. --remote=origin
git push -u origin main
```

(Or create the repo via the web UI and `git remote add origin <url>` + push.)

**Checkpoint:** Repo is public, README has a clear "How to run" section with `docker compose up`.

---

## Phase 5 — Push Backend Image to Docker Hub

The submission asks for a Docker Hub image link for the backend.

```bash
docker login
docker build -t <your-dockerhub-username>/oms-backend:latest ./server
docker push <your-dockerhub-username>/oms-backend:latest
```

**Checkpoint:** `https://hub.docker.com/r/<you>/oms-backend` is publicly visible.

---

## Phase 6 — Deploy Backend on Railway

1. Sign in at https://railway.app with GitHub.
2. **New Project → Deploy from GitHub repo** → select your repo → set root directory to `server/`. Railway auto-detects the Dockerfile.
3. **+ New → Database → PostgreSQL.** Railway provisions Postgres and exposes `DATABASE_URL` as a service variable.
4. On the backend service, **Variables** tab → add `DATABASE_URL = ${{Postgres.DATABASE_URL}}` (literal — Railway substitutes the Postgres service URL at runtime).
5. **Settings → Networking → Generate Domain** → you get a public URL like `oms-backend-production.up.railway.app`.
6. Seed the schema: Railway's Postgres service has a "Data" tab with a query editor — paste your `schema.sql` and run it. (One-time.)

**Checkpoint:** `curl https://<your-railway-url>/health` returns OK and lists your Postgres-connected app.

---

## Phase 7 — Deploy Frontend on Vercel

1. Sign in at https://vercel.com with GitHub.
2. **Add New → Project** → import your repo → set **Root Directory** to `client`.
3. Framework preset: Vite. Build command and output directory auto-fill.
4. **Environment Variables**: add `VITE_API_URL = https://<your-railway-url>/api`.
5. **Deploy.**

**Checkpoint:** Vercel URL loads and can create/list products against the live backend.

---

## Phase 8 — Final Wiring

### 8.1 Lock down CORS

In `server/main.py`, replace `allow_origins=["*"]` with the real frontend origin:
```python
allow_origins=[
    "http://localhost:3000",
    "http://localhost:5173",
    "https://<your-vercel-app>.vercel.app",
],
```
Commit, push — Railway redeploys automatically. Rebuild and re-push the Docker Hub image too (so the submitted image matches what's running).

### 8.2 End-to-end smoke test

Open the Vercel URL. Run through every PDF requirement:
- Add 3 products
- Add 2 customers
- Place an order that consumes some stock — verify product quantity drops
- Try to place an order exceeding stock — should fail with a clear error
- Try to create a product with a duplicate SKU — 409
- Dashboard shows correct totals and low-stock items
- Resize the window — UI stays usable on mobile widths

### 8.3 Update the README

Add to the top of the README:
- Live frontend URL
- Live backend URL (and `/docs` link for Swagger)
- Docker Hub image link
- "Run locally": `cp .env.example .env && docker compose up`

---

## Submission Checklist (Section 9 of the PDF)

- [ ] GitHub repo link (public, README current)
- [ ] Docker Hub image link for backend
- [ ] Live frontend URL (Vercel)
- [ ] Live backend URL (Railway)

---

## Quick Reference: Local Dev Commands

```bash
# Bring everything up (rebuilds images if Dockerfiles changed)
docker compose up --build

# Background
docker compose up -d

# Tail logs
docker compose logs -f backend

# Shell into a container
docker compose exec backend bash
docker compose exec postgres psql -U oms_user -d oms

# Stop + remove containers (data persists in the named volume)
docker compose down

# Nuke EVERYTHING including DB data
docker compose down -v
```

---

## Common Pitfalls

- **Backend can't reach Postgres locally:** use `postgres` (the service name) as the host, not `localhost`. Containers see each other by service name on the compose network.
- **Frontend env var doesn't update:** `VITE_*` vars are baked in at build time. Rebuild the image after changing.
- **CORS errors in prod:** the Vercel URL must be in `allow_origins`. Trailing slashes matter.
- **Railway free tier sleeps:** first request after idle can take ~30s. Mention this in your README if reviewers test cold.
- **Schema didn't load:** `schema.sql` only runs on a fresh volume. Run `docker compose down -v` to reset, or apply it manually with `psql`.
