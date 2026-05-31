import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { Icon } from "./icons.jsx";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});
export const money = (n) => inrFormatter.format(Number(n || 0));
export const fmtDate = (ts) => {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

export function Button({ variant = "primary", size, icon, children, className = "", ...rest }) {
  const cls = ["btn", `btn--${variant}`, size === "sm" ? "btn--sm" : "", className].filter(Boolean).join(" ");
  return <button className={cls} {...rest}>{icon}{children}</button>;
}

export function Field({ label, required, error, hint, children }) {
  return (
    <div className="field">
      {label && <label>{label}{required && <span className="req">*</span>}</label>}
      {children}
      {error ? <div className="field__err">{error}</div> : hint ? <div className="field__hint">{hint}</div> : null}
    </div>
  );
}
export function Input({ error, ...rest }) { return <input className={"input" + (error ? " err" : "")} {...rest} />; }
export function Select({ error, children, ...rest }) { return <select className={"select" + (error ? " err" : "")} {...rest}>{children}</select>; }

export function Badge({ tone = "gray", children, dot }) {
  return <span className={"badge " + tone}>{dot && <span className="dot"/>}{children}</span>;
}

const STATUS_LABEL = { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled" };
const STATUS_TONE = { pending: "amber", confirmed: "green", cancelled: "red" };
export function StatusBadge({ status }) {
  const key = String(status || "").toLowerCase();
  return <Badge tone={STATUS_TONE[key] || "gray"} dot>{STATUS_LABEL[key] || status || "—"}</Badge>;
}

export function StockBadge({ stock, threshold = 10 }) {
  if (stock <= 0) return <Badge tone="red">Out of stock</Badge>;
  if (stock <= threshold) return <Badge tone="amber" dot>Low · {stock}</Badge>;
  return <Badge tone="green" dot>{stock} in stock</Badge>;
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"modal" + (wide ? " wide" : "")} role="dialog" aria-modal="true">
        <div className="modal__head">
          <h3>{title}</h3>
          <Button variant="subtle" className="icon-btn" onClick={onClose} aria-label="Close"><Icon.x/></Button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = "Delete", onConfirm, onClose, busy }) {
  return (
    <Modal title={title} onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="primary" style={{ background: "var(--red)" }} onClick={onConfirm} disabled={busy}>{busy ? "Working…" : confirmLabel}</Button>
      </>}>
      <p style={{ margin: 0, color: "var(--text-2)" }}>{message}</p>
    </Modal>
  );
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((type, title, msg) => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, type, title, msg }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3400);
  }, []);
  const api = useCallback((title, msg) => push("success", title, msg), [push]);
  api.success = (t, m) => push("success", t, m);
  api.error = (t, m) => push("error", t, m);
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className={"toast " + t.type}>
            {t.type === "success" ? <Icon.check className="toast__icon"/> : <Icon.alert className="toast__icon"/>}
            <div><strong>{t.title}</strong>{t.msg && <span>{t.msg}</span>}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function Empty({ title, sub, action }) {
  return (
    <div className="empty">
      <Icon.inbox/>
      <p>{title}</p>
      {sub && <small>{sub}</small>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function TableSkeleton({ cols = 4, rows = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>{Array.from({ length: cols }).map((__, c) => (
          <td key={c}><div className="skeleton" style={{ height: 14, width: c === 0 ? "60%" : "40%" }}/></td>
        ))}</tr>
      ))}
    </tbody>
  );
}
