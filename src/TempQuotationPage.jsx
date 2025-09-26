import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Layout from "./Layout";
import "./TempQuotation.css"; // keep our styles

function TempQuotationPage() {
  const [allComponents, setAllComponents] = useState([]);
  const [selected, setSelected] = useState([]);

  const [searchName, setSearchName] = useState("");
  const [searchPrice, setSearchPrice] = useState("");
  const [searchQty, setSearchQty] = useState(0);

  const [setupCharges, setSetupCharges] = useState(0);
  const [developmentCharges, setDevelopmentCharges] = useState(0);

  // Project/Customer info
  const [projectName, setProjectName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCollege, setCustomerCollege] = useState("");
  const [customerBranch, setCustomerBranch] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/components")
      .then((res) => res.json())
      .then((data) => setAllComponents(data))
      .catch((err) => console.error("Error fetching components:", err));
  }, []);

  useEffect(() => {
    const found = allComponents.find(
      (c) => c.name.toLowerCase() === searchName.toLowerCase()
    );
    if (found) {
      setSearchPrice(found.price);
    }
  }, [searchName, allComponents]);

  const addComponent = () => {
    if (!searchName || searchPrice === "" || searchQty === "") {
      alert("Enter component, price and quantity.");
      return;
    }

    const qty = Number(searchQty || 0);
    const price = Number(searchPrice || 0);
    if (qty <= 0 || price <= 0) {
      alert("Enter valid price and quantity.");
      return;
    }

    const idx = selected.findIndex(
      (s) => s.name.toLowerCase() === searchName.toLowerCase()
    );
    if (idx !== -1) {
      const updated = [...selected];
      updated[idx].quantity += qty;
      updated[idx].price = price;
      setSelected(updated);
    } else {
      setSelected([...selected, { name: searchName, price, quantity: qty }]);
    }

    setSearchName("");
    setSearchPrice("");
    setSearchQty(0);
  };

  const removeComponent = (index) => {
    const updated = selected.filter((_, i) => i !== index);
    setSelected(updated);
  };

  const totalComponents = selected.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const grandTotal =
    totalComponents +
    Number(setupCharges || 0) +
    Number(developmentCharges || 0);

  const downloadPDF = () => {
    try {
      if (
        !projectName.trim() ||
        !customerName.trim() ||
        !customerContact.trim() ||
        !customerEmail.trim() ||
        !customerCollege.trim() ||
        !customerBranch.trim()
      ) {
        alert("Please fill in all required fields before downloading.");
        return;
      }

      const doc = new jsPDF();

      // Header
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 87, 34);
      doc.text("SmartTech Solutions", 20, 20);

      // Tagline
      doc.setFontSize(12);
      doc.setFont("times", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("We provide exactly what you want.", 20, 28);

      // Right-side heading
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("PRICE QUOTATION", 150, 20);

      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 28);

      // Customer Details
      let startY = 40;
      let boxHeight = 60;
      doc.setFillColor(255, 229, 204);
      doc.setDrawColor(255, 87, 34);
      doc.roundedRect(15, startY, 180, boxHeight, 5, 5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(255, 87, 34);
      doc.text("Customer Details", 20, startY + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);

      let y = startY + 18;
      doc.text(`Project Name: ${projectName}`, 20, y); y += 7;
      doc.text(`Customer Name: ${customerName}`, 20, y); y += 7;
      doc.text(`Contact: ${customerContact}`, 20, y); y += 7;
      doc.text(`Email: ${customerEmail}`, 20, y); y += 7;
      doc.text(`College: ${customerCollege}`, 20, y); y += 7;
      doc.text(`Branch: ${customerBranch}`, 20, y);

      // Components Table
      y += 15;
      autoTable(doc, {
        startY: y,
        head: [["Component", "Qty", "Price", "Total"]],
        body: selected.map((item) => [
          item.name,
          item.quantity.toString(),
          `${item.price}`,
          `${item.price * item.quantity}`,
        ]),
        styles: { fontSize: 11 },
        headStyles: { fillColor: [255, 87, 34] },
      });

      let finalY = doc.lastAutoTable.finalY + 12;

      // Charges
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Setup Charges: ${setupCharges}`, 20, finalY); finalY += 8;
      doc.text(`Development Charges: ${developmentCharges}`, 20, finalY); finalY += 8;

      // Grand Total
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 87, 34);
      doc.text(`Grand Total: Rs ${grandTotal}`, 20, finalY + 12);

      // Footer
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Contact Details:", 20, finalY + 30);
      doc.text("7558679704", 20, finalY + 40);
      doc.text("______________________________", 20, finalY + 50);
      doc.text("______________________________", 20, finalY + 60);

      doc.save(`${customerName}-${customerContact}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Something went wrong while generating the PDF.");
    }
  };

  return (
    <Layout>
      <div
        className="quotation-container"
        style={{
          overflowX: "hidden",    // 🔹 ensure no horizontal scroll
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        <div
          className="quotation-card"
          style={{
            maxWidth: "900px",
            width: "100%",
            boxSizing: "border-box",
            overflowX: "hidden", // 🔹 keep content inside
          }}
        >
          <h2 className="title">Temporary Quotation</h2>
          <p className="subtitle">Fill in customer and project details</p>

          {/* Customer Info */}
          <div
            className="customer-form"
            style={{ overflowX: "hidden", width: "100%", boxSizing: "border-box" }}
          >
            {[
              ["Project Name", projectName, setProjectName],
              ["Customer Name", customerName, setCustomerName],
              ["Customer Contact", customerContact, setCustomerContact],
              ["Customer Email", customerEmail, setCustomerEmail],
              ["Customer College Name", customerCollege, setCustomerCollege],
              ["Customer Branch", customerBranch, setCustomerBranch],
            ].map(([label, value, setter], i) => (
              <div className="form-group" key={i} style={{ minWidth: 0 }}>
                <label>
                  {label} <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  required
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
            ))}
          </div>

          {/* Component Search */}
          <div
            className="components-section"
            style={{
              flexWrap: "wrap",
              overflowX: "hidden",
              boxSizing: "border-box",
              wordBreak: "break-word",
            }}
          >
            <div className="component-name" style={{ minWidth: 0, flex: 1 }}>
              <input
                type="text"
                placeholder="Search or Select Component"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                list="component-list"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
              <datalist id="component-list">
                {allComponents.map((c, i) => (
                  <option key={i} value={c.name}>
                    {c.name} — ₹{c.price}
                  </option>
                ))}
              </datalist>
            </div>

            <div className="component-qty" style={{ minWidth: 0 }}>
              <input
                type="number"
                placeholder="Qty"
                value={searchQty}
                onChange={(e) => setSearchQty(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <div className="component-price" style={{ minWidth: 0 }}>
              <input
                type="number"
                placeholder="Price"
                value={searchPrice}
                onChange={(e) => setSearchPrice(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <button className="add-btn" onClick={addComponent}>➕ Add</button>
          </div>

          {/* Added Components */}
          {selected.length > 0 && (
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table
                className="table"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  tableLayout: "auto",
                  boxSizing: "border-box",
                  wordBreak: "break-word",
                }}
              >
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td>₹{item.price}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.price * item.quantity}</td>
                      <td>
                        <button onClick={() => removeComponent(i)}>🗑 Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="total">Total (Components): ₹{totalComponents}</div>

          <div
            className="charges"
            style={{ flexWrap: "wrap", width: "100%", boxSizing: "border-box" }}
          >
            <label>
              Setup Charges (Rs.):
              <input
                type="number"
                value={setupCharges}
                onChange={(e) => setSetupCharges(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <label>
              Development Charges (Rs.):
              <input
                type="number"
                value={developmentCharges}
                onChange={(e) => setDevelopmentCharges(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </label>
          </div>

          <div className="total">Grand Total: ₹{grandTotal}</div>

          <button className="download-btn" onClick={downloadPDF}>
            Download Quotation
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default TempQuotationPage;
