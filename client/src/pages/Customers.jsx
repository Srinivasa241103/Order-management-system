import { useCallback, useEffect, useState } from "react";
import API from "../api/client.js";
import { Icon } from "../components/icons.jsx";
import { Button, ConfirmDialog, Empty, Field, Input, Modal, TableSkeleton, useToast } from "../components/ui.jsx";

function CustomerForm({ onSubmit }) {
  const [f, setF] = useState({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const validate = () => {
    const e = {};
    if (!f.name.trim() || f.name.trim().length < 2) e.name = "Name must be at least 2 characters.";
    if (!f.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Enter a valid email address.";
    if (!f.phone.trim()) e.phone = "Phone is required.";
    else if (!/^[0-9+()\-\s]{7,}$/.test(f.phone.trim())) e.phone = "Enter a valid phone number (7+ chars).";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() });
  };

  return (
    <form onSubmit={submit} id="customer-form" noValidate>
      <Field label="Full name" required error={errors.name}>
        <Input value={f.name} error={errors.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Priya Nair" autoFocus/>
      </Field>
      <Field label="Email" required error={errors.email}>
        <Input value={f.email} error={errors.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" type="email"/>
      </Field>
      <Field label="Phone" required error={errors.phone}>
        <Input value={f.phone} error={errors.phone} onChange={(e) => set("phone", e.target.value)} placeholder="555-0100"/>
      </Field>
    </form>
  );
}

function initials(name) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function Customers() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { setItems(null); API.Customers.list().then(setItems).catch((err) => { toast.error("Could not load customers", err.message); setItems([]); }); }, [toast]);
  useEffect(() => { load(); }, [load]);

  const filtered = (items || []).filter((c) =>
    [c.name, c.email, c.phone].join(" ").toLowerCase().includes(q.toLowerCase()));

  const handleSubmit = async (data) => {
    setBusy(true);
    try {
      const created = await API.Customers.create(data);
      setItems((s) => [created, ...(s || [])]);
      toast.success("Customer added", created.name);
      setModal(false);
    } catch (err) { toast.error("Something went wrong", err.message); }
    finally { setBusy(false); }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await API.Customers.remove(confirm.id);
      setItems((s) => s.filter((c) => c.id !== confirm.id));
      toast.success("Customer deleted", confirm.name);
      setConfirm(null);
    } catch (err) { toast.error("Could not delete", err.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="page-head">
        <div><h1>Customers</h1><p>Your customer directory.</p></div>
        <Button icon={<Icon.plus/>} onClick={() => setModal(true)}>Add Customer</Button>
      </div>

      <div className="toolbar">
        <div className="search"><Icon.search/><input placeholder="Search by name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)}/></div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            {items === null ? <TableSkeleton cols={4}/> : (
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="4"><Empty title={q ? "No matching customers" : "No customers yet"} sub={q ? "Try a different search." : "Add your first customer to get started."} action={!q && <Button icon={<Icon.plus/>} onClick={() => setModal(true)}>Add Customer</Button>}/></td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="avatar">{initials(c.name)}</span>
                        <span className="cell-strong">{c.name}</span>
                      </div>
                    </td>
                    <td className="cell-muted">{c.email}</td>
                    <td className="cell-muted cell-mono">{c.phone}</td>
                    <td>
                      <div className="row-actions">
                        <Button variant="danger-ghost" className="icon-btn" title="Delete" onClick={() => setConfirm(c)}><Icon.trash/></Button>
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
        <Modal title="Add Customer" onClose={() => !busy && setModal(false)}
          footer={<>
            <Button variant="ghost" onClick={() => setModal(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" form="customer-form" disabled={busy}>{busy ? "Saving…" : "Add Customer"}</Button>
          </>}>
          <CustomerForm onSubmit={handleSubmit}/>
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog title="Delete customer" message={`Delete "${confirm.name}"? This can't be undone.`} onConfirm={handleDelete} onClose={() => setConfirm(null)} busy={busy}/>
      )}
    </div>
  );
}
