// AdminPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import "./Layout.css";
import "./AdminPage.css";
import Layout from "./Layout";

/*
  Full AdminPage.jsx — retains all original functionality:
  - add/edit/delete components
  - Excel import
  - suggestions
  - pagination
  - contributor normalization and merging
  - pending list and save/cancel
  - notification after save
  Plus responsive tweaks so the page doesn't produce page-level horizontal scroll,
  and Edit/Delete buttons become E/D on small screens.
*/

function AdminPage() {
  const [components, setComponents] = useState([]);
  const [pendingComponents, setPendingComponents] = useState([]);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [addedBy, setAddedBy] = useState("Vijay");
  const [suggestions, setSuggestions] = useState([]);
  const [editingId, setEditingId] = useState(null);
const [saving, setSaving] = useState(false);

  // lastAddSource is kept for previous behavior, but final message uses count
  const [lastAddSource, setLastAddSource] = useState(null);

  // Notification state
  const [notifyText, setNotifyText] = useState("");
  const [notifyVisible, setNotifyVisible] = useState(false);
  const notifyTimerRef = useRef(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const navigate = useNavigate();
  const API_BASE = "http://localhost:5000/api";

  useEffect(() => {
    loadComponents();
    return () => {
      if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------
  // Helper functions for names/contributors
  // -------------------------------

  // Normalize name casing: Convert "sarthak" or "SARTHAK" -> "Sarthak"
  const normalizeNameCase = (name) => {
    if (!name && name !== "") return name;
    const str = String(name).trim();
    if (str.length === 0) return str;
    // Capitalize first character, lower the rest.
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Merge an array of contributor objects (or contributor-like items) case-insensitively.
  const mergeContributorArray = (contributors = []) => {
    // Build a map keyed by lowercased name
    const map = new Map();
    contributors.forEach((c) => {
      if (!c) return;
      const nameRaw = typeof c === "string" ? c : c.name || "";
      const dateRaw = typeof c === "string" ? null : c.date || null;
      const key = nameRaw.toLowerCase();

      if (!map.has(key)) {
        // Preserve original casing of first occurrence but normalize to consistent casing for backend later
        map.set(key, { name: nameRaw, date: dateRaw });
      } else {
        // If already exists, update date to the latest non-null (prefer incoming if present)
        const existing = map.get(key);
        // Prefer the most recent date (if both present)
        if (dateRaw && (!existing.date || new Date(dateRaw) > new Date(existing.date))) {
          existing.date = dateRaw;
        }
        // keep the original stored name casing (so UI shows name as first entered)
        map.set(key, existing);
      }
    });

    // Return array of contributors with preserved casing
    return Array.from(map.values());
  };

  // Before sending to backend, normalize contributor names to consistent casing (so backend merges correctly).
  // Also merge duplicates that may exist in the pending component's contributor array.
  const normalizeAndMergeContributorsForSave = (contributors = []) => {
    // Convert incoming to { name: normalizedName, date }
    const normalized = contributors.map((c) => {
      const rawName = typeof c === "string" ? c : c.name || "";
      const date = typeof c === "string" ? null : c.date || null;
      return { name: normalizeNameCase(rawName), date };
    });

    // Now merge case-insensitively (after normalization, duplicates are exact matches)
    const map = new Map();
    normalized.forEach((c) => {
      const key = c.name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: c.name, date: c.date });
      } else {
        const existing = map.get(key);
        // pick latest date if provided
        if (c.date && (!existing.date || new Date(c.date) > new Date(existing.date))) {
          existing.date = c.date;
        }
        map.set(key, existing);
      }
    });

    return Array.from(map.values());
  };

  // -------------------------------
  // Load components from backend and normalize contributors for UI display
  // -------------------------------
  const loadComponents = async () => {
    try {
      const res = await fetch(`${API_BASE}/components`);
      if (!res.ok) {
        console.error("Failed to fetch components:", res.statusText);
        return;
      }
      const data = await res.json();

      // For display purposes, merge duplicate contributors differing only by case.
      // This doesn't change backend, but prevents duplicates in UI.
      const normalizedForUI = (data || []).map((comp) => {
        const mergedContribs = mergeContributorArray(comp.contributors || []);
        return { ...comp, contributors: mergedContribs };
      });

      setComponents(normalizedForUI);
    } catch (err) {
      console.error("Error loading components:", err);
    }
  };

  // -------------------------------
  // Excel upload
  // -------------------------------
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const nowIso = new Date().toISOString();

        const imported = rows.map((row) => {
          // row may contain "name", "componentName", "price", "quantity", "contributors"
          const rawName = row.name || row.componentName || "";
          const rawPrice = row.price || 0;
          const rawQuantity = row.quantity || 0;
          const rawContributor = row.contributors || row.addedBy || "Admin";

          // normalize contributor object
          const contribObj = {
            name: typeof rawContributor === "string" ? normalizeNameCase(rawContributor) : normalizeNameCase(rawContributor.name || "Admin"),
            date: nowIso,
          };

          return {
            name: rawName,
            price: Number(rawPrice) || 0,
            quantity: Number(rawQuantity) || 0,
            contributors: [contribObj],
          };
        });

        // When importing from Excel, multiple rows might refer to same component.
        // We'll append them to pending; subsequent Save will normalize and merge duplicates.
        setLastAddSource("excel");
        setPendingComponents((prev) => [...prev, ...imported]);
      } catch (err) {
        console.error("Error parsing excel:", err);
        alert("Failed to parse Excel file. Check the file format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // -------------------------------
  // Suggestions for component name
  // -------------------------------
  const handleNameChange = (value) => {
    setNewName(value);
    if (value.length > 0) {
      const filtered = components.filter((c) =>
        c.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (name, price, qty) => {
    setNewName(name);
    setNewPrice(price);
    setNewQuantity(qty || "");
    setSuggestions([]);
  };

  // -------------------------------
  // Date helpers
  // -------------------------------
  const parseDateString = (s) => {
    if (!s) return null;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    const parts = String(s).split("/");
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts.map((p) => Number(p));
      if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) {
        const dt = new Date(yyyy, mm - 1, dd);
        if (!isNaN(dt.getTime())) return dt;
      }
    }
    return null;
  };

  const getLastUpdatedDate = (contributors) => {
    if (!contributors || contributors.length === 0) return "—";
    const parsedDates = contributors
      .map((c) => parseDateString(c.date))
      .filter(Boolean);
    if (parsedDates.length === 0) return "—";
    const latestMs = Math.max(...parsedDates.map((d) => d.getTime()));
    const latest = new Date(latestMs);
    return latest.toLocaleDateString("en-GB");
  };

  // -------------------------------
  // Merge contributor into an existing contributors array case-insensitively.
  // This will preserve the first seen casing for display. It will update the date if the incoming date is newer.
  // -------------------------------
  const mergeOneContributorInto = (contributors = [], incoming = { name: "", date: null }) => {
    if (!incoming || !incoming.name) return contributors || [];
    const lowerIncoming = incoming.name.toLowerCase();

    // copy to avoid mutating input
    const copy = [...(contributors || [])];

    const idx = copy.findIndex((c) => (c?.name || "").toLowerCase() === lowerIncoming);
    if (idx !== -1) {
      // update date if newer
      const existing = { ...copy[idx] };
      if (incoming.date && (!existing.date || new Date(incoming.date) > new Date(existing.date))) {
        existing.date = incoming.date;
      }
      copy[idx] = existing;
      return copy;
    } else {
      // Add incoming but preserve incoming name's casing
      return [...copy, { name: incoming.name, date: incoming.date || null }];
    }
  };

  // -------------------------------
  // Add component (manual)
  // -------------------------------
  const addComponent = () => {
    if (!newName || !newPrice || !newQuantity) {
      alert("Enter component name, price and quantity");
      return;
    }

    setLastAddSource("single");

    const nowIso = new Date().toISOString();

    // find pending component with same name (case-insensitive)
    const existingIndex = pendingComponents.findIndex(
      (c) => (c.name || "").toLowerCase() === newName.toLowerCase()
    );

    if (existingIndex !== -1) {
      const updatedPending = [...pendingComponents];
      // update quantity and price
      updatedPending[existingIndex].quantity = Number(updatedPending[existingIndex].quantity || 0) + Number(newQuantity);
      updatedPending[existingIndex].price = Number(newPrice);

      // merge contributor case-insensitively
      const incomingContributor = { name: normalizeNameCase(addedBy), date: nowIso };
      updatedPending[existingIndex].contributors = mergeOneContributorInto(
        updatedPending[existingIndex].contributors || [],
        incomingContributor
      );

      setPendingComponents(updatedPending);
    } else {
      const newComponent = {
        name: newName,
        price: Number(newPrice),
        quantity: Number(newQuantity),
        contributors: [{ name: normalizeNameCase(addedBy), date: nowIso }],
      };
      setPendingComponents([...pendingComponents, newComponent]);
    }

    // reset inputs
    setNewName("");
    setNewPrice("");
    setNewQuantity("");
    setAddedBy("Vijay");
  };

  // -------------------------------
  // Prepare pendingComponents for saving:
  // - Normalize contributor casing
  // - Merge duplicate contributors (case-insensitive)
  // - Also merge rows in pendingComponents that refer to same component (by name case-insensitive),
  //   summing quantities and merging contributors so we don't send duplicate component docs to backend
  // -------------------------------
  const preparePendingForSave = (pending) => {
    // Step 1: create map by component name lowercased
    const compMap = new Map();

    pending.forEach((comp) => {
      const key = (comp.name || "").toLowerCase();
      const nameOriginal = comp.name || "";
      const price = Number(comp.price || 0);
      const quantity = Number(comp.quantity || 0);
      const incomingContributors = Array.isArray(comp.contributors) ? comp.contributors : [];

      // Normalize and merge contributors for this component
      const normalizedContribs = incomingContributors.map((c) => {
        const cname = typeof c === "string" ? c : c.name || "";
        const date = typeof c === "string" ? null : c.date || null;
        return { name: normalizeNameCase(cname), date };
      });

      const mergedContribs = normalizeAndMergeContributorsForSave(normalizedContribs);

      if (!compMap.has(key)) {
        compMap.set(key, {
          name: nameOriginal,
          price: price,
          quantity: quantity,
          contributors: mergedContribs,
        });
      } else {
        const existing = compMap.get(key);
        // sum quantities
        existing.quantity = Number(existing.quantity || 0) + quantity;
        // prefer latest price if incoming price present
        if (price !== 0) existing.price = price;
        // merge contributors
        const combined = [...(existing.contributors || []), ...mergedContribs];
        existing.contributors = normalizeAndMergeContributorsForSave(combined);
        compMap.set(key, existing);
      }
    });

    // Return array suitable for backend POST
    return Array.from(compMap.values()).map((c) => ({
      name: c.name,
      price: Number(c.price || 0),
      quantity: Number(c.quantity || 0),
      contributors: c.contributors,
    }));
  };

  // -------------------------------
  // Save pending components to backend
  // -------------------------------
const saveComponents = async () => {
  try {
    if (!pendingComponents || pendingComponents.length === 0) return;

    setSaving(true);  // 🔵 Start loader + disable button

    const numberToSave = pendingComponents.length;
    const payload = preparePendingForSave(pendingComponents);

    const resp = await fetch(`${API_BASE}/components`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error("Failed to save components");
    await resp.json();

    await loadComponents();
    setPendingComponents([]);

    const savedCount = payload.length;
    const msg = savedCount === 1 ? "1 component added" : `${savedCount} components added`;
    if (notifyTimerRef.current) {
      clearTimeout(notifyTimerRef.current);
      notifyTimerRef.current = null;
    }
    setNotifyText(msg);
    setNotifyVisible(true);

    notifyTimerRef.current = setTimeout(() => {
      setNotifyVisible(false);
      setNotifyText("");
      notifyTimerRef.current = null;
    }, 1000);

    setLastAddSource(null);
  } catch (err) {
    console.error("Error saving components:", err);
    alert("❌ Failed to save components. Check backend logs.");
  } finally {
    setSaving(false);  // 🔵 Stop loader + enable button
  }
};


  // -------------------------------
  // Cancel pending
  // -------------------------------
  const cancelComponents = () => {
    setPendingComponents([]);
  };

  // -------------------------------
  // Edit a saved component (start)
  // -------------------------------
  const startEdit = (c) => {
    setEditingId(c.id);
    setNewName(c.name);
    setNewPrice(c.price);
    setNewQuantity(c.quantity);
    // If the saved component has contributors, default to last contributor name in select if available
    const lastContributorName = c.contributors && c.contributors.length > 0 ? c.contributors[c.contributors.length - 1].name : "Vijay";
    setAddedBy(lastContributorName || "Vijay");
  };

  // -------------------------------
  // Save edits to an existing component
  // -------------------------------
  const saveEdit = async () => {
    try {
      const nowIso = new Date().toISOString();
      const component = components.find((c) => c.id === editingId);
      if (!component) {
        alert("Component not found for editing.");
        return;
      }

      // Merge the contributor (case-insensitive) into existing contributors
      const incomingContributor = { name: normalizeNameCase(addedBy), date: nowIso };
      const existingContribs = component.contributors || [];
      // merge in-memory first for request
      const mergedForRequest = normalizeAndMergeContributorsForSave([...existingContribs, incomingContributor]);

      const updates = {
        name: newName,
        price: Number(newPrice),
        quantity: Number(newQuantity),
        contributors: mergedForRequest,
      };

      const resp = await fetch(`${API_BASE}/components/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!resp.ok) throw new Error("Failed to update component");

      // Refresh list
      await loadComponents();
      cancelEdit();
    } catch (err) {
      console.error("Error updating:", err);
      alert("❌ Failed to update component");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewName("");
    setNewPrice("");
    setNewQuantity("");
    setAddedBy("Vijay");
  };

  // -------------------------------
  // Delete component
  // -------------------------------
  const deleteComponent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this component?")) return;

    try {
      const resp = await fetch(`${API_BASE}/components/${id}`, { method: "DELETE" });
      if (!resp.ok) throw new Error("Failed to delete component");
      await loadComponents();
    } catch (err) {
      console.error("Error deleting:", err);
      alert("❌ Failed to delete component");
    }
  };

  // -------------------------------
  // Navigation guard if pending exists
  // -------------------------------
  const handleMenuClick = (path) => {
    if (pendingComponents.length > 0) {
      alert("⚠️ Please save or cancel your pending components first!");
    } else {
      navigate(path);
    }
  };

  // -------------------------------
  // Pagination derived values
  // -------------------------------
  const totalPages = Math.max(1, Math.ceil(components.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = components.slice(indexOfFirstRow, indexOfLastRow);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <Layout>
      <div className="admin-wrapper">
        <main className="admin-content">
          {/* Input */}
          <div style={{ marginBottom: "20px", position: "relative" }} className="admin-input-row">
            <input
              type="text"
              placeholder="Component Name"
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              style={{ padding: "10px", marginRight: "10px", width: "250px" }}
            />
            {suggestions.length > 0 && (
              <ul
                className="suggestions-list"
                style={{
                  position: "absolute",
                  top: "42px",
                  left: "0",
                  width: "250px",
                  maxWidth: "calc(100% - 20px)",
                  border: "1px solid #ccc",
                  background: "#fff",
                  listStyle: "none",
                  margin: 0,
                  padding: "5px",
                  zIndex: 1000,
                  boxSizing: "border-box",
                }}
              >
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    onClick={() => selectSuggestion(s.name, s.price, s.quantity)}
                    style={{ padding: "5px", cursor: "pointer" }}
                  >
                    {s.name} (Rs. {s.price}, Qty: {s.quantity || 0})
                  </li>
                ))}
              </ul>
            )}
            <input
              type="number"
              placeholder="Price"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              style={{ padding: "10px", marginRight: "10px", width: "120px" }}
            />
            <input
              type="number"
              placeholder="Quantity"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              style={{ padding: "10px", marginRight: "10px", width: "120px" }}
            />
            <select
              value={addedBy}
              onChange={(e) => setAddedBy(e.target.value)}
              style={{ padding: "10px", marginRight: "10px", width: "150px" }}
            >
              <option value="Vijay">Vijay</option>
              <option value="Om">Om</option>
              <option value="Yash">Yash</option>
             
            </select>

            {editingId ? (
              <>
                <button onClick={saveEdit} style={{ padding: "10px 20px", marginRight: "10px" }}>
                  💾 Save Update
                </button>
                <button onClick={cancelEdit} style={{ padding: "10px 20px" }}>
                  ❌ Cancel
                </button>
              </>
            ) : (
              <button onClick={addComponent} style={{ padding: "10px 20px", marginRight: "10px" }}>
                ➕ Add Component
              </button>
            )}

            {/* Total Components badge — to the right of the add button */}
            <div
              style={{
                position: "absolute",
                right: "0px",
                top: "0px",
                background: "#edd2b2ff",
                padding: "8px 10px",
                borderRadius: "6px",
                boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
              className="total-badge"
            >
              Total Components - {components.length}
            </div>
          </div>

          {/* Excel Upload */}
          <div style={{ marginBottom: "30px" }} className="excel-upload">
            <h3>📥 Bulk Upload from Excel</h3>
            <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} />
          </div>

          {/* Pending */}
          {pendingComponents.length > 0 ? (
            <div style={{ marginBottom: "30px" }} className="table-responsive">
              <h2>🕒 Pending Components</h2>
              <table border="1" cellPadding="10" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Contributors</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingComponents.map((c, i) => (
                    <tr key={i}>
                      <td>{c.name}</td>
                      <td>{c.price}</td>
                      <td>{c.quantity}</td>
                      <td>{(c.contributors || []).map((cc) => cc.name).join(", ")}</td>
                      <td>{getLastUpdatedDate(c.contributors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: "10px" }}>
                <button
  onClick={saveComponents}
  disabled={saving}   // 🔵 Disable while saving
  style={{ marginRight: "10px", position: "relative", minWidth: "80px" }}
>
  {saving ? (
    <span className="spinner"></span>  // 🔵 Loader animation
  ) : (
    "✅ Save"
  )}
</button>

                <button onClick={cancelComponents}>❌ Cancel</button>
              </div>
            </div>
          ) : notifyVisible ? (
            <div style={{ marginBottom: "30px", textAlign: "center", fontSize: "18px", fontWeight: "700" }} className="notify">
              {notifyText}
            </div>
          ) : null}

          {/* Saved */}
          <h2>📦 All Components</h2>
          {components.length > 0 ? (
            <>
              <div className="table-responsive">
                <table border="1" cellPadding="6" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th>Contributors</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.price}</td>
                        <td>{c.quantity}</td>
                        <td>{(c.contributors || []).map((cc) => cc.name).join(", ")}</td>
                        <td>{getLastUpdatedDate(c.contributors)}</td>
                        <td>
                          <button
                            className="action-btn edit-action"
                            onClick={() => startEdit(c)}
                            style={{ marginRight: "10px" }}
                          >
                            <span className="full-text">✏️ Edit</span>
                            <span className="short-text">✏️E</span>
                          </button>
                          <button
                            className="action-btn delete-action"
                            onClick={() => deleteComponent(c.id)}
                          >
                            <span className="full-text">🗑️ Delete</span>
                            <span className="short-text">🗑️D</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: "10px", alignItems: "center", gap: "20px" }}>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{ padding: "5px 12px" }}
                >
                  ◀ Prev
                </button>
                <span style={{ fontWeight: "bold" }}>
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{ padding: "5px 12px" }}
                >
                  Next ▶
                </button>
              </div>
            </>
          ) : (
            <p>No components added yet.</p>
          )}
        </main>
      </div>
    </Layout>
  );
}

export default AdminPage;
