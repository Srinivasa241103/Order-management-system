import { useCallback, useEffect, useState } from "react";
import API from "../api/client.js";
import { Icon } from "../components/icons.jsx";
import { Button, Empty, StatusBadge, StockBadge, TableSkeleton, money } from "../components/ui.jsx";

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    API.Dashboard.summary()
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = data ? [
    { key: "p", label: "Total Products", value: data.totalProducts, icon: <Icon.box/>, sub: "in catalog", go: "products" },
    { key: "c", label: "Total Customers", value: data.totalCustomers, icon: <Icon.users/>, sub: "registered", go: "customers" },
    { key: "o", label: "Total Orders", value: data.totalOrders, icon: <Icon.cart/>, sub: "all time", go: "orders" },
    { key: "l", label: "Low Stock", value: data.lowStockCount, icon: <Icon.alert/>, sub: "need restock", warn: true, go: "products" },
  ] : [];

  return (
    <div>
      <div className="page-head">
        <div><h1>Dashboard</h1><p>Overview of your store at a glance.</p></div>
      </div>

      <div className="stat-grid">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div className="stat" key={i}><div className="skeleton" style={{ height: 14, width: 90 }}/><div className="skeleton" style={{ height: 26, width: 50, marginTop: 16 }}/></div>
        )) : stats.map((s) => (
          <div className={"stat" + (s.warn ? " warn" : "")} key={s.key} onClick={() => onNavigate(s.go)} style={{ cursor: "pointer" }}>
            <div className="stat__label"><span className="stat__icon">{s.icon}</span>{s.label}</div>
            <div className="stat__value">{s.value}</div>
            <div className="stat__sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="dash-cols">
        <div className="card">
          <div className="section-title">Recent Orders
            <Button variant="subtle" size="sm" onClick={() => onNavigate("orders")}>View all <Icon.chevron style={{ width: 14, height: 14 }}/></Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
              {loading ? <TableSkeleton cols={4}/> : (
                <tbody>
                  {(!data || data.recentOrders.length === 0) ? (
                    <tr><td colSpan="4"><Empty title="No orders yet" sub="Create your first order to see it here."/></td></tr>
                  ) : data.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="cell-strong cell-mono">#{o.id}</td>
                      <td className="cell-muted">{o.items.reduce((s, it) => s + it.qty, 0)} item(s)</td>
                      <td className="cell-mono cell-strong">{money(o.total)}</td>
                      <td><StatusBadge status={o.status}/></td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Low Stock Products</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Stock</th></tr></thead>
              {loading ? <TableSkeleton cols={2}/> : (
                <tbody>
                  {(!data || data.lowStockProducts.length === 0) ? (
                    <tr><td colSpan="2"><Empty title="All stocked up" sub="No products below threshold."/></td></tr>
                  ) : data.lowStockProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-strong">{p.name}<div className="cell-muted" style={{ fontSize: 12 }}>{p.sku}</div></td>
                      <td><StockBadge stock={p.stock}/></td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
