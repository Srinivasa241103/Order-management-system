import { useCallback, useEffect, useState } from "react";
import API from "../api/client.js";
import { Icon } from "../components/icons.jsx";
import { Button, ConfirmDialog, Empty, Field, Input, Modal, Select, StatusBadge, TableSkeleton, fmtDate, money, useToast } from "../components/ui.jsx";

function OrderForm({ customers, products, onSubmit }) {
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([{ productId: "", qty: 1 }]);
  const [errors, setErrors] = useState({});

  const setLine = (i, k, v) => setLines((s) => s.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const addLine = () => setLines((s) => [...s, { productId: "", qty: 1 }]);
  const removeLine = (i) => setLines((s) => s.filter((_, idx) => idx !== i));

  const prodById = (id) => products.find((p) => String(p.id) === String(id));
  const total = lines.reduce((sum, l) => { const p = prodById(l.productId); return sum + (p ? p.price * Number(l.qty || 0) : 0); }, 0);

  const validate = () => {
    const e = {};
    if (!customerId) e.customer = "Select a customer.";
    const validLines = lines.filter((l) => l.productId);
    if (validLines.length === 0) e.lines = "Add at least one product.";
    lines.forEach((l, i) => {
      if (l.productId) {
        const p = prodById(l.productId);
        const q = Number(l.qty);
        if (!q || q < 1 || !Number.isInteger(q)) e["q" + i] = "Qty ≥ 1";
        else if (p && q > p.stock) e["q" + i] = `Only ${p.stock} in stock`;
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const submit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({
      customerId: Number(customerId),
      items: lines.filter((l) => l.productId).map((l) => ({ productId: Number(l.productId), qty: Number(l.qty) })),
    });
  };

  return (
    <form onSubmit={submit} id="order-form" noValidate>
      <Field label="Customer" required error={errors.customer}>
        <Select value={customerId} error={errors.customer} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Select a customer…</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.email}</option>)}
        </Select>
      </Field>

      <label style={{ display: "block", fontWeight: 600, fontSize: 12.5, margin: "16px 0 8px" }}>Items<span className="req" style={{ color: "var(--red)" }}>*</span></label>
      {errors.lines && <div className="field__err" style={{ marginBottom: 8 }}>{errors.lines}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 88px 36px", gap: 8, marginBottom: 6, fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>
        <span>Product</span><span style={{ textAlign: "center" }}>Qty</span><span/>
      </div>
      {lines.map((l, i) => {
        const p = prodById(l.productId);
        return (
          <div key={i}>
            <div className="lineitem">
              <Select value={l.productId} onChange={(e) => setLine(i, "productId", e.target.value)}>
                <option value="">Select product…</option>
                {products.map((pr) => <option key={pr.id} value={pr.id} disabled={pr.stock <= 0}>{pr.name} — {money(pr.price)}{pr.stock <= 0 ? " (out)" : ""}</option>)}
              </Select>
              <Input className="qty" value={l.qty} error={errors["q" + i]} onChange={(e) => setLine(i, "qty", e.target.value)} inputMode="numeric"/>
              <Button variant="subtle" className="icon-btn" type="button" onClick={() => removeLine(i)} disabled={lines.length === 1} title="Remove"><Icon.x/></Button>
            </div>
            {(errors["q" + i] || p) && (
              <div style={{ fontSize: 11.5, margin: "-4px 0 8px", color: errors["q" + i] ? "var(--red)" : "var(--text-3)" }}>
                {errors["q" + i] ? errors["q" + i] : `${p.stock} in stock · line total ${money(p.price * Number(l.qty || 0))}`}
              </div>
            )}
          </div>
        );
      })}
      <Button variant="ghost" size="sm" type="button" icon={<Icon.plus/>} onClick={addLine} style={{ marginTop: 2 }}>Add item</Button>

      <div className="order-summary"><span>Order total</span><span className="cell-mono">{money(total)}</span></div>
    </form>
  );
}

function OrderDetail({ id, onClose }) {
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { API.Orders.get(id).then(setOrder).catch((e) => setErr(e.message)); }, [id]);

  return (
    <Modal title="Order Details" wide onClose={onClose}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      {err ? <p style={{ color: "var(--red)" }}>{err}</p> : !order ? (
        <div><div className="skeleton" style={{ height: 16, width: "50%", marginBottom: 12 }}/><div className="skeleton" style={{ height: 60 }}/></div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div><div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>ORDER</div><div style={{ fontWeight: 700, fontSize: 15 }}>#{order.id}</div></div>
            <StatusBadge status={order.status}/>
          </div>
          <div className="detail-grid" style={{ marginBottom: 18 }}>
            <div><div className="k">Customer</div><div className="v">{order.customer ? order.customer.name : "—"}</div></div>
            <div><div className="k">Email</div><div className="v">{order.customer ? order.customer.email : "—"}</div></div>
            <div><div className="k">Date</div><div className="v">{fmtDate(order.createdAt)}</div></div>
            <div><div className="k">Phone</div><div className="v">{order.customer && order.customer.phone ? order.customer.phone : "—"}</div></div>
          </div>
          <div className="card" style={{ boxShadow: "none" }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th style={{ textAlign: "right" }}>Subtotal</th></tr></thead>
                <tbody>
                  {order.items.map((it, i) => (
                    <tr key={i}>
                      <td className="cell-strong">{it.name}</td>
                      <td className="cell-mono">{it.qty}</td>
                      <td className="cell-mono">{money(it.price)}</td>
                      <td className="cell-mono cell-strong" style={{ textAlign: "right" }}>{money(it.price * it.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="order-summary"><span>Total</span><span className="cell-mono">{money(order.total)}</span></div>
        </div>
      )}
    </Modal>
  );
}

export default function Orders() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setItems(null);
    API.Orders.list().then(setItems).catch((err) => { toast.error("Could not load orders", err.message); setItems([]); });
  }, [toast]);
  useEffect(() => {
    load();
    API.Customers.list().then(setCustomers).catch(() => {});
    API.Products.list().then(setProducts).catch(() => {});
  }, [load]);

  const openCreate = () => {
    API.Products.list().then(setProducts).catch(() => {});
    API.Customers.list().then(setCustomers).catch(() => {});
    setCreating(true);
  };

  const handleSubmit = async (data) => {
    setBusy(true);
    try {
      const created = await API.Orders.create(data);
      const name = (customers.find((c) => c.id === created.customerId) || {}).name || "";
      setItems((s) => [{ ...created, customerName: name }, ...(s || [])]);
      // refresh products so stock reflects the deduction
      API.Products.list().then(setProducts).catch(() => {});
      toast.success("Order created", `${money(created.total)} · ${name}`);
      setCreating(false);
    } catch (err) { toast.error("Could not create order", err.message); }
    finally { setBusy(false); }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await API.Orders.remove(confirm.id);
      setItems((s) => s.filter((o) => o.id !== confirm.id));
      toast.success("Order deleted", `#${confirm.id}`);
      setConfirm(null);
    } catch (err) { toast.error("Could not delete order", err.message); }
    finally { setBusy(false); }
  };

  const canCreate = customers.length > 0 && products.some((p) => p.stock > 0);

  return (
    <div>
      <div className="page-head">
        <div><h1>Orders</h1><p>Create and review customer orders.</p></div>
        <Button icon={<Icon.plus/>} onClick={openCreate} disabled={!canCreate} title={!canCreate ? "Add a customer and a product in stock first" : ""}>Create Order</Button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            {items === null ? <TableSkeleton cols={7}/> : (
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan="7"><Empty title="No orders yet" sub={canCreate ? "Create your first order to get started." : "Add a customer and an in-stock product first."} action={canCreate && <Button icon={<Icon.plus/>} onClick={openCreate}>Create Order</Button>}/></td></tr>
                ) : items.map((o) => (
                  <tr key={o.id} className="clickable" onClick={() => setDetailId(o.id)}>
                    <td className="cell-strong cell-mono">#{o.id}</td>
                    <td className="cell-strong">{o.customerName}</td>
                    <td className="cell-muted">{o.items.reduce((s, it) => s + it.qty, 0)}</td>
                    <td className="cell-mono cell-strong">{money(o.total)}</td>
                    <td><StatusBadge status={o.status}/></td>
                    <td className="cell-muted">{fmtDate(o.createdAt)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <Button variant="danger-ghost" className="icon-btn" title="Delete order" onClick={() => setConfirm(o)}><Icon.trash/></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {creating && (
        <Modal title="Create Order" wide onClose={() => !busy && setCreating(false)}
          footer={<>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" form="order-form" disabled={busy}>{busy ? "Creating…" : "Create Order"}</Button>
          </>}>
          <OrderForm customers={customers} products={products} onSubmit={handleSubmit}/>
        </Modal>
      )}
      {detailId && <OrderDetail id={detailId} onClose={() => setDetailId(null)}/>}
      {confirm && (
        <ConfirmDialog title="Delete order" message={`Delete order #${confirm.id}? This can't be undone.`} onConfirm={handleDelete} onClose={() => setConfirm(null)} busy={busy}/>
      )}
    </div>
  );
}
