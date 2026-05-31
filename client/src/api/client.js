const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function request(path, opts = {}) {
  const res = await fetch(BASE_URL + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let detail = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) {
        detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      } else if (body?.message) {
        detail = body.message;
      }
    } catch { /* body wasn't json */ }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

// --- mappers: backend (snake_case) <-> UI (camelCase) ----------------------

const productFromApi = (p) => ({
  id: p.id,
  name: p.name,
  sku: p.sku,
  price: Number(p.price),
  stock: p.quantity,
});
const productToApi = (p) => ({
  name: p.name,
  sku: p.sku,
  price: Number(p.price),
  quantity: Number(p.stock),
});

const customerFromApi = (c) => ({
  id: c.id,
  name: c.full_name,
  email: c.email,
  phone: c.phone,
});
const customerToApi = (c) => ({
  full_name: c.name,
  email: c.email,
  phone: c.phone,
});

const orderItemFromApi = (it) => ({
  productId: it.product_id,
  name: it.product_name,
  qty: it.quantity,
  price: Number(it.unit_price),
});
const orderFromApi = (o) => ({
  id: o.id,
  customerId: o.customer_id,
  items: (o.items || []).map(orderItemFromApi),
  status: o.status,
  total: Number(o.total_amount),
  createdAt: o.created_at,
});

// --- resources ------------------------------------------------------------

export const Products = {
  async list() {
    const data = await request("/products");
    return data.map(productFromApi);
  },
  async create(data) {
    const created = await request("/products", { method: "POST", body: JSON.stringify(productToApi(data)) });
    return productFromApi(created);
  },
  async update(id, data) {
    const updated = await request(`/products/${id}`, { method: "PUT", body: JSON.stringify(productToApi(data)) });
    return productFromApi(updated);
  },
  async remove(id) {
    await request(`/products/${id}`, { method: "DELETE" });
    return true;
  },
};

export const Customers = {
  async list() {
    const data = await request("/customers");
    return data.map(customerFromApi);
  },
  async create(data) {
    const created = await request("/customers", { method: "POST", body: JSON.stringify(customerToApi(data)) });
    return customerFromApi(created);
  },
  async remove(id) {
    await request(`/customers/${id}`, { method: "DELETE" });
    return true;
  },
};

export const Orders = {
  async list() {
    const [orders, customers] = await Promise.all([request("/orders"), Customers.list()]);
    const byId = new Map(customers.map((c) => [c.id, c]));
    return orders.map(orderFromApi).map((o) => ({
      ...o,
      customerName: byId.get(o.customerId)?.name || "—",
    }));
  },
  async get(id) {
    const [order, customers] = await Promise.all([request(`/orders/${id}`), Customers.list()]);
    const o = orderFromApi(order);
    o.customer = customers.find((c) => c.id === o.customerId) || null;
    return o;
  },
  async create({ customerId, items }) {
    const payload = {
      customer_id: customerId,
      items: items.map((it) => ({ product_id: it.productId, quantity: Number(it.qty) })),
    };
    const created = await request("/orders", { method: "POST", body: JSON.stringify(payload) });
    return orderFromApi(created);
  },
  async remove(id) {
    await request(`/orders/${id}`, { method: "DELETE" });
    return true;
  },
};

export const Dashboard = {
  async summary() {
    const d = await request("/dashboard");
    return {
      totalProducts: d.total_products,
      totalCustomers: d.total_customers,
      totalOrders: d.total_orders,
      lowStockCount: d.low_stock_count ?? (d.low_stock_products || []).length,
      lowStockProducts: (d.low_stock_products || []).map(productFromApi),
      recentOrders: (d.recent_orders || []).map(orderFromApi),
    };
  },
};

export const API = { Products, Customers, Orders, Dashboard };
export default API;
