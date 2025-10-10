// AllProjectsPage.jsx
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "./Layout";
import "./Layout.css";
import "./LoginPage.css"; // ✅ Reuse spinner + dots styles

function AllProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState({ open: [], closed: [] });
  const [pageOpen, setPageOpen] = useState(1);
  const [pageClosed, setPageClosed] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true); // ✅ show spinner initially
  const pageSize = 8;

  useEffect(() => {
    fetch("https://smarttechsolutions-4df8.onrender.com/api/projects")
      .then((res) => res.json())
      .then((data) => {
        setProjects({
          open: data.filter((p) => p.status === "open"),
          closed: data.filter((p) => p.status === "closed"),
        });
      })
      .catch((err) => console.error("Error fetching projects:", err))
      .finally(() => setLoading(false)); // ✅ stop loading
  }, []);

  // helper: paginate
  const paginate = (arr, page) =>
    arr.slice((page - 1) * pageSize, page * pageSize);

  // helper: search filter
  const filterProjects = (arr) =>
    arr.filter((p) =>
      p.projectName?.toLowerCase().includes(search.toLowerCase())
    );

  const openFiltered = filterProjects(projects.open);
  const closedFiltered = filterProjects(projects.closed);

  const totalPagesOpen = Math.ceil(openFiltered.length / pageSize) || 1;
  const totalPagesClosed = Math.ceil(closedFiltered.length / pageSize) || 1;

  return (
    <Layout>
      <div style={{ padding: "10px", position: "relative" }}>
        {/* ======= HEADER + COUNTS (Always Visible) ======= */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            gap: "20px",
          }}
        >
          <h2 style={{ margin: 0 }}>All Projects</h2>
          <input
            type="text"
            placeholder="Search by project name..."
            value={search}
            onChange={(e) => {
              setPageOpen(1);
              setPageClosed(1);
              setSearch(e.target.value);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              flex: "1",
              minWidth: "200px",
              maxWidth: "300px",
            }}
          />
          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            <span
              style={{
                background: "#e3f2fd",
                color: "#1976d2",
                padding: "6px 14px",
                borderRadius: "20px",
                fontWeight: "bold",
              }}
            >
              Open: {projects.open.length}
            </span>
            <span
              style={{
                background: "#fbe9e7",
                color: "#d84315",
                padding: "6px 14px",
                borderRadius: "20px",
                fontWeight: "bold",
              }}
            >
              Closed: {projects.closed.length}
            </span>
          </div>
        </div>

        {/* ======= GRID FOR OPEN/CLOSED PROJECTS ======= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
            opacity: loading ? 0.3 : 1, // ✅ dim while loading
            transition: "opacity 0.3s ease",
          }}
          className="projects-wrapper"
        >
          {/* OPEN PROJECTS */}
          <div>
            <h3
              style={{
                borderBottom: "2px solid #1976d2",
                paddingBottom: "6px",
              }}
            >
              Open Projects
            </h3>
            {openFiltered.length === 0 && !loading && (
              <p style={{ color: "#666", fontStyle: "italic" }}>
                No open projects.
              </p>
            )}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {!loading &&
                paginate(openFiltered, pageOpen).map((proj) => (
                  <div
                    key={proj.id}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #ddd",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                    onClick={() => navigate(`/quotation/${proj.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 10px rgba(0,0,0,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 2px 5px rgba(0,0,0,0.05)";
                    }}
                  >
                    <strong>
                      {proj.projectName} — {proj.customerContact}
                    </strong>
                  </div>
                ))}
            </div>

            {/* Pagination Open */}
            {!loading && openFiltered.length > pageSize && (
              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  disabled={pageOpen === 1}
                  onClick={() => setPageOpen((p) => p - 1)}
                >
                  Prev
                </button>
                <span style={{ fontSize: "0.9em", fontWeight: "bold" }}>
                  Page {pageOpen} of {totalPagesOpen}
                </span>
                <button
                  disabled={pageOpen === totalPagesOpen}
                  onClick={() => setPageOpen((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* CLOSED PROJECTS */}
          <div>
            <h3
              style={{
                borderBottom: "2px solid #d84315",
                paddingBottom: "6px",
              }}
            >
              Closed Projects
            </h3>
            {closedFiltered.length === 0 && !loading && (
              <p style={{ color: "#666", fontStyle: "italic" }}>
                No closed projects.
              </p>
            )}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {!loading &&
                paginate(closedFiltered, pageClosed).map((proj) => (
                  <div
                    key={proj.id}
                    style={{
                      background: "#fafafa",
                      border: "1px solid #ddd",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                    onClick={() =>
                      navigate(`/quotation-history/${proj.id}`)
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 10px rgba(0,0,0,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 2px 5px rgba(0,0,0,0.05)";
                    }}
                  >
                    <strong>
                      {proj.projectName} — {proj.customerContact}
                    </strong>
                  </div>
                ))}
            </div>

            {/* Pagination Closed */}
            {!loading && closedFiltered.length > pageSize && (
              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  disabled={pageClosed === 1}
                  onClick={() => setPageClosed((p) => p - 1)}
                >
                  Prev
                </button>
                <span style={{ fontSize: "0.9em", fontWeight: "bold" }}>
                  Page {pageClosed} of {totalPagesClosed}
                </span>
                <button
                  disabled={pageClosed === totalPagesClosed}
                  onClick={() => setPageClosed((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======= OVERLAY LOADER (ON TOP) ======= */}
        {loading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0, 0, 0, 0.6)", // ✅ your preferred overlay
              zIndex: 1000,
            }}
          >
            <div className="loader"></div>
            <div className="loading-row">
              <p className="loading-text">Loading Projects</p>
              <div className="dots">
                <div className="dot one"></div>
                <div className="dot two"></div>
                <div className="dot three"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default AllProjectsPage;
