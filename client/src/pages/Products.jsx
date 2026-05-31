import { useCallback, useEffect, useState } from "react";
import API from "../api/client.js";
import { Icon } from "../components/icons.jsx";
import { Button, ConfirmDialog, Empty, Field, Input, Modal, StockBadge, TableSkeleton, money, useToast } from "../components/ui.jsx";

function ProductForm({ initial, onSubmit, busy }) {
  const [f, setF] = useState(initial || { name: "", sku: "", price: "", stock: "" });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = "Product name is required.";
    if (!f.sku.trim()) e.sku = "SKU is required.";
    if (f.price === "" || isNaN(f.price) || Number(f.price) <= 0) e.price = "Enter a valid price (greater than 0).";
    if (f.stock === "" || isNaN(f.stock) || Number(f.stock) < 0 || !Number.isInteger(Number(f.stock))) e.stock = "Enter a whole number for stock.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: f.name.trim(),
      sku: f.sku.trim(),
      price: Number(f.price),
      stock: Number(f.stock),
    });
  };

  return (
    <form onSubmit={submit} id="product-form" noValidate>
      <Field label="Product name" required error={errors.name}>
        <Input value={f.name} error={errors.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Wireless Mouse" autoFocus/>
      </Field>
      <Field label="SKU" required error={errors.sku}>
        <Input value={f.sku} error={errors.sku} onChange={(e) => set("sku", e.target.value)} placeholder="WM-100"/>
      </Field>
      <div className="form-row">
        <Field label="Price (INR)" required error={errors.price}>
          <Input value={f.price} error={errors.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" inputMode="decimal"/>
        </Field>
        <Field label="Stock quantity" required error={errors.stock}>
          <Input value={f.stock} error={errors.stock} onChange={(e) => set("stock", e.target.value)} placeholder="0" inputMode="numeric"/>
        </Field>
      </div>
    </form>
  );
}

export default function Products() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { setItems(null); API.Products.list().then(setItems).catch((err) => { toast.error("Could not load products", err.message); setItems([]); }); }, [toast]);
  useEffect(() => { load(); }, [load]);

  const filtered = (items || []).filter((p) =>
    [p.name, p.sku].join(" ").toLowerCase().includes(q.toLowerCase()));

  const handleSubmit = async (data) => {
    setBusy(true);
    try {
      if (modal.mode === "edit") {
        const upd = await API.Products.update(modal.product.id, data);
        setItems((s) => s.map((p) => (p.id === upd.id ? upd : p)));
        toast.success("Product updated", upd.name);
      } else {
        const created = await API.Products.create(data);
        setItems((s) => [created, ...(s || [])]);
        toast.success("Product added", created.name);
      }
      setModal(null);
    } catch (err) { toast.error("Something went wrong", err.message); }
    finally { setBusy(false); }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await API.Products.remove(confirm.id);
      setItems((s) => s.filter((p) => p.id !== confirm.id));
      toast.success("Product deleted", confirm.name);
      setConfirm(null);
    } catch (err) { toast.error("Could not delete", err.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="page-head">
        <div><h1>Products</h1><p>Manage your catalog, pricing and stock levels.</p></div>
        <Button icon={<Icon.plus/>} onClick={() => setModal({ mode: "add" })}>Add Product</Button>
      </div>

      <div className="toolbar">
        <div className="search"><Icon.search/><input placeholder="Search by name or SKU…" value={q} onChange={(e) => setQ(e.target.value)}/></div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            {items === null ? <TableSkeleton cols={5}/> : (
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="5"><Empty title={q ? "No matching products" : "No products yet"} sub={q ? "Try a different search." : "Add your first product to get started."} action={!q && <Button icon={<Icon.plus/>} onClick={() => setModal({ mode: "add" })}>Add Product</Button>}/></td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-strong">{p.name}</td>
                    <td className="cell-muted cell-mono">{p.sku}</td>
                    <td className="cell-mono cell-strong">{money(p.price)}</td>
                    <td><StockBadge stock={p.stock}/></td>
                    <td>
                      <div className="row-actions">
                        <Button variant="subtle" className="icon-btn" title="Edit" onClick={() => setModal({ mode: "edit", product: p })}><Icon.edit/></Button>
                        <Button variant="danger-ghost" className="icon-btn" title="Delete" onClick={() => setConfirm(p)}><Icon.trash/></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modal.mode === "edit" ? "Edit Product" : "Add Product"} onClose={() => !busy && setModal(null)}
          footer={<>
            <Button variant="ghost" onClick={() => setModal(null)} disabled={busy}>Cancel</Button>
            <Button type="submit" form="product-form" disabled={busy}>{busy ? "Saving…" : modal.mode === "edit" ? "Save Changes" : "Add Product"}</Button>
          </>}>
          <ProductForm initial={modal.product} onSubmit={handleSubmit} busy={busy}/>
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog title="Delete product" message={`Delete "${confirm.name}"? This can't be undone.`} onConfirm={handleDelete} onClose={() => setConfirm(null)} busy={busy}/>
      )}
    </div>
  );
}
