import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Layout.css";

function Layout({ children }) {
  const [adminName, setAdminName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const readAdminName = () =>
    localStorage.getItem("adminName") ||
    localStorage.getItem("username") ||
    localStorage.getItem("user") ||
    "";

  useEffect(() => {
    setAdminName(readAdminName());
    const onStorage = (e) => {
      if (["adminName", "username", "user"].includes(e.key)) {
        setAdminName(readAdminName());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="layout">
      {/* ===== HEADER ===== */}
      <header className="header">
        <button
          className={`hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="header-center">
          <h1>SmartTech Solutions</h1>
          <p className="tagline">we provide exact what you want</p>
        </div>

        {adminName && (
          <div className="admin-info">
            Logged in as: <strong>{adminName}</strong>
          </div>
        )}
      </header>

      {/* ===== SIDEBAR + CONTENT ===== */}
      <div className="body">
        <aside className={`sidebar ${menuOpen ? "show" : ""}`}>
          <nav className="menu">
            <Link to="/" onClick={() => setMenuOpen(false)}>
              <span className="icon">🏠</span>
              <span className="label">Home</span>
            </Link>
            <Link to="/all-projects" onClick={() => setMenuOpen(false)}>
              <span className="icon">📂</span>
              <span className="label">All Projects</span>
            </Link>
            <Link to="/CustomerDetailsPage" onClick={() => setMenuOpen(false)}>
              <span className="icon">➕</span>
              <span className="label">New Project</span>
            </Link>
            <Link to="/temp-quotation" onClick={() => setMenuOpen(false)}>
              <span className="icon">📝</span>
              <span className="label">Temporary Quotation</span>
            </Link>
            <Link to="/AdminPage" onClick={() => setMenuOpen(false)}>
              <span className="icon">👤</span>
              <span className="label">Admin Page</span>
            </Link>
            <Link to="/ComponentsHistory" onClick={() => setMenuOpen(false)}>
              <span className="icon">📜</span>
              <span className="label">Components History</span>
            </Link>
          </nav>
        </aside>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}

export default Layout;
