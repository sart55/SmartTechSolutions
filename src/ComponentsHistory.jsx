// ComponentsHistory.jsx
import { useState, useEffect } from "react";
import Layout from "./Layout";

function ComponentsHistory() {
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const API_BASE = "http://localhost:5000/api";

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/components-history`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching history:", err);
      setHistory([]);
    }
  };

  const totalPages = Math.max(1, Math.ceil(history.length / pageSize));
  const paginatedData = history.slice((page - 1) * pageSize, page * pageSize);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <Layout>
      <div className="history-wrapper">
        <h2 className="history-title">📜 Components History</h2>

        {history.length > 0 ? (
          <div className="history-card">
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Component Name</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Admin</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((h, idx) => (
                    <tr key={h.id || idx}>
                      <td data-label="Component Name">
                        <span className="td-value">{h.name}</span>
                      </td>
                      <td data-label="Quantity">
                        <span className="td-value">{h.quantity}</span>
                      </td>
                      <td data-label="Price">
                        <span className="td-value">₹{h.price}</span>
                      </td>
                      <td data-label="Admin">
                        <span className="td-value">{h.addedBy || h.admin || "Admin"}</span>
                      </td>
                      <td data-label="Date">
                        <span className="td-value">
                          {h.date ? new Date(h.date).toLocaleString() : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="history-pagination">
              <div className="history-buttons">
                <button onClick={goPrev} disabled={page === 1}>← Prev</button>
                <button onClick={goNext} disabled={page === totalPages}>Next →</button>
              </div>
              <div className="history-page-info">
                Page {page} of {totalPages}
              </div>
            </div>
          </div>
        ) : (
          <p className="history-empty">No history found.</p>
        )}
      </div>

      {/* Scoped CSS to avoid conflicts with AdminPage */}
      <style>{`
        .history-wrapper {
          padding:0px;
          max-width:1100px;
          margin:0 auto;
          box-sizing:border-box;
        }
        .history-title {
          margin-bottom:18px;
          font-size:1.8rem;
          color:#222;
        }
        .history-card {
          background:#f1f5f9;
          border-radius:12px;
          box-shadow:0px 6px 16px rgba(150, 137, 137, 0.27);
          overflow:hidden;
        }
        .history-table-wrapper {
          width:100%;
          overflow-x:auto;
        }
        .history-table {
          width:100%;
          border-collapse:collapse;
          font-size:0.95rem;
        }
        .history-table th,
        .history-table td {
          padding:8px 10px;
          text-align:left;
          border-bottom:1px solid #e5e7eb;
          word-break:break-word;
        }
        .history-table thead th {
          background:#778899;
          color:#fff;
        }
        .history-table tbody tr:nth-child(even) {
          background:#f8fbff;
        }
        .history-pagination {
          display:flex;
          flex-wrap:wrap;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          padding:14px 18px;
          border-top:1px solid #eee;
          background:#fafafa;
        }
        .history-buttons button {
          padding:9px 14px;
          margin:1.5px;
          border:none;
          border-radius:8px;
          background:#778899;
          color:#fff;
          font-weight:700;
          cursor:pointer;
          box-shadow:0 2px 6px rgba(13,71,161,0.18);
        }
        .history-buttons button[disabled] {
          background:#d0d7de;
          cursor:not-allowed;
          box-shadow:none;
        }
        .history-empty {
          color:#777;
          font-style:italic;
        }

        /* Mobile responsive: stack table rows into cards */
        @media (max-width: 800px) {
          .history-table thead { display:none; }
          .history-table,
          .history-table tbody,
          .history-table tr,
          .history-table td {
            display:block;
            width:100%;
          }
          .history-table tr {
            margin:0 0 12px 0;
            padding:12px;
            border:1px solid #7d6052ff;
            border-radius:10px;
            background:#fff;
          }
          .history-table td {
            padding:8px 0;
            border:none;
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:12px;
          }
          .history-table td .td-value {
            text-align:right;
            font-weight:500;
            color:#222;
            min-width:30%;
          }
          .history-table td[data-label]::before {
            content: attr(data-label);
            font-weight:700;
            color:#444;
          }
          .history-table-wrapper {
            overflow-x:hidden;
            
          }
        }
      `}</style>
    </Layout>
  );
}

export default ComponentsHistory;
