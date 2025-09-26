import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Layout.css";

function AdminPage() {
  const [components, setComponents] = useState([]); // saved
  const [pendingComponents, setPendingComponents] = useState([]); // unsaved
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [addedBy, setAddedBy] = useState("Sarthak");
  const [suggestions, setSuggestions] = useState([]);

  const navigate = useNavigate();

  // Load stored components
  useEffect(() => {
    const stored = localStorage.getItem("components");
    if (stored) {
      setComponents(JSON.parse(stored));
    }
  }, []);

  // Save whenever components change
  useEffect(() => {
    localStorage.setItem("components", JSON.stringify(components));
  }, [components]);

  // Handle typing in name field → generate suggestions
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

  const addComponent = () => {
    if (!newName || !newPrice || !newQuantity) {
      alert("Enter component name, price and quantity");
      return;
    }

    const dateNow = new Date().toLocaleDateString();

    // Check if component already in pending list
    const existingIndex = pendingComponents.findIndex(
      (c) => c.name.toLowerCase() === newName.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Update existing pending component
      const updatedPending = [...pendingComponents];
      updatedPending[existingIndex].quantity += Number(newQuantity);
      updatedPending[existingIndex].price = Number(newPrice);
      updatedPending[existingIndex].date = dateNow;

      // Update contributors
      const contribIndex = updatedPending[existingIndex].contributors.findIndex(
        (c) => c.name === addedBy
      );
      if (contribIndex !== -1) {
        updatedPending[existingIndex].contributors[contribIndex].qty += Number(newQuantity);
      } else {
        updatedPending[existingIndex].contributors.push({ name: addedBy, qty: Number(newQuantity) });
      }

      setPendingComponents(updatedPending);
    } else {
      // Add as new entry
      const newComponent = {
        name: newName,
        price: Number(newPrice),
        quantity: Number(newQuantity),
        date: dateNow,
        contributors: [{ name: addedBy, qty: Number(newQuantity) }],
      };
      setPendingComponents([...pendingComponents, newComponent]);
    }

    // reset inputs
    setNewName("");
    setNewPrice("");
    setNewQuantity("");
    setAddedBy("Sarthak");
  };

  const saveComponents = () => {
    let updatedComponents = [...components];

    pendingComponents.forEach((pending) => {
      const index = updatedComponents.findIndex(
        (c) => c.name.toLowerCase() === pending.name.toLowerCase()
      );

      if (index !== -1) {
        // Merge with existing saved component
        updatedComponents[index].quantity += pending.quantity;
        updatedComponents[index].price = pending.price;
        updatedComponents[index].date = pending.date;

        // Merge contributors
        pending.contributors.forEach((pc) => {
          const contribIndex = updatedComponents[index].contributors.findIndex(
            (c) => c.name === pc.name
          );
          if (contribIndex !== -1) {
            updatedComponents[index].contributors[contribIndex].qty += pc.qty;
          } else {
            updatedComponents[index].contributors.push(pc);
          }
        });
      } else {
        updatedComponents.push(pending);
      }
    });

    setComponents(updatedComponents);
    setPendingComponents([]);
  };

  const cancelComponents = () => {
    setPendingComponents([]);
  };

  // Handle sidebar clicks
  const handleMenuClick = (path) => {
    if (pendingComponents.length > 0) {
      alert("⚠️ Please save or cancel your pending components first!");
    } else {
      navigate(path);
    }
  };

  // Helper to format contributors
  const formatContributors = (contributors) =>
    contributors.map((c) => `${c.name} (${c.qty})`).join(", ");

  return (
    <div className="layout">
      {/* Header */}
      <header className="header">
        <h1>⚙️ Admin - Manage Components</h1>
        <p className="tagline">Add & Manage Available Components</p>
      </header>

      <div className="body">
        {/* Sidebar */}
        <aside className="sidebar">
          <span onClick={() => handleMenuClick("/")}>🏠 Home</span>
          <span onClick={() => handleMenuClick("/all-projects")}>📂 All Projects</span>
          <span onClick={() => handleMenuClick("/quotation/new")}>➕ New Project</span>
          <span onClick={() => handleMenuClick("/temp-quotation")}>📝 Temporary Quotation</span>
          <span onClick={() => handleMenuClick("/admin")} className="active">
            ⚙️ Admin
          </span>
        </aside>

        <main className="content">
          {/* Input Row */}
          <div style={{ marginBottom: "20px", position: "relative" }}>
            <input
              type="text"
              placeholder="Search or Enter Component Name"
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              style={{ padding: "10px", marginRight: "10px", width: "250px" }}
            />
            {suggestions.length > 0 && (
              <ul
                style={{
                  position: "absolute",
                  top: "40px",
                  left: "0",
                  width: "250px",
                  border: "1px solid #ccc",
                  background: "#fff",
                  listStyle: "none",
                  margin: 0,
                  padding: "5px",
                  zIndex: 10,
                }}
              >
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    onClick={() => selectSuggestion(s.name, s.price, s.quantity)}
                    style={{
                      padding: "5px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                    }}
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
              <option value="Sarthak">Sarthak</option>
              <option value="Vijay">Vijay</option>
            </select>
            <button onClick={addComponent} style={{ padding: "10px 20px" }}>
              ➕ Add Component
            </button>
          </div>

          {/* Pending Components */}
          {pendingComponents.length > 0 && (
            <div style={{ marginBottom: "30px" }}>
              <h2>🕒 Pending Components (Not Saved Yet)</h2>
              <table border="1" cellPadding="10" style={{ width: "100%", marginTop: "10px" }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price (Rs.)</th>
                    <th>Quantity</th>
                    <th>Date Added</th>
                    <th>Added By</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingComponents.map((c, i) => (
                    <tr key={i}>
                      <td>{c.name}</td>
                      <td>{c.price}</td>
                      <td>{c.quantity}</td>
                      <td>{c.date}</td>
                      <td>{formatContributors(c.contributors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: "15px" }}>
                <button
                  onClick={saveComponents}
                  style={{
                    padding: "10px 20px",
                    marginRight: "10px",
                    backgroundColor: "green",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                  }}
                >
                  ✅ Save
                </button>
                <button
                  onClick={cancelComponents}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "red",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                  }}
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          )}

          {/* Saved Components */}
          <h2>📦 All Components</h2>
          {components.length > 0 ? (
            <table border="1" cellPadding="10" style={{ width: "100%", marginTop: "10px" }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price (Rs.)</th>
                  <th>Quantity</th>
                  <th>Date Added</th>
                  <th>Added By</th>
                </tr>
              </thead>
              <tbody>
                {components.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td>{c.price}</td>
                    <td>{c.quantity}</td>
                    <td>{c.date}</td>
                    <td>{formatContributors(c.contributors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No components added yet.</p>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminPage;
