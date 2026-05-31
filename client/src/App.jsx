import { useCallback, useEffect, useState } from "react";
import { Icon } from "./components/icons.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Customers from "./pages/Customers.jsx";
import Orders from "./pages/Orders.jsx";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: Icon.dashboard },
  { key: "products", label: "Products", icon: Icon.box },
  { key: "customers", label: "Customers", icon: Icon.users },
  { key: "orders", label: "Orders", icon: Icon.cart },
];

function Sidebar({ route, go }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="brand__mark">S</span>
        <span>Stockly</span>
      </div>
      <nav className="sidebar__nav">
        {NAV.map((n) => {
          const I = n.icon;
          return (
            <button key={n.key} className={"navitem" + (route === n.key ? " active" : "")} onClick={() => go(n.key)}>
              <I/>{n.label}
            </button>
          );
        })}
      </nav>
      <div className="sidebar__foot">Stockly · Inventory &amp; Orders</div>
    </aside>
  );
}

function TabBar({ route, go }) {
  return (
    <nav className="tabbar">
      {NAV.map((n) => {
        const I = n.icon;
        return (
          <button key={n.key} className={route === n.key ? "active" : ""} onClick={() => go(n.key)}>
            <I/>{n.label}
          </button>
        );
      })}
    </nav>
  );
}

export default function App() {
  const [route, setRoute] = useState(() => (location.hash || "#dashboard").slice(1));
  const go = useCallback((r) => { setRoute(r); location.hash = r; window.scrollTo({ top: 0 }); }, []);
  useEffect(() => {
    const h = () => setRoute((location.hash || "#dashboard").slice(1));
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  const current = NAV.find((n) => n.key === route) ? route : "dashboard";

  return (
    <div className="app">
      <Sidebar route={current} go={go}/>
      <div className="main">
        <header className="topbar">
          <div className="topbar__brand"><span className="brand__mark">S</span> Stockly</div>
        </header>
        <main className="content">
          {current === "dashboard" && <Dashboard onNavigate={go}/>}
          {current === "products" && <Products/>}
          {current === "customers" && <Customers/>}
          {current === "orders" && <Orders/>}
        </main>
      </div>
      <TabBar route={current} go={go}/>
    </div>
  );
}
