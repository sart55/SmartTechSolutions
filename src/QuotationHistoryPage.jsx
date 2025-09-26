// QuotationHistoryPage.jsx
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Layout from "./Layout";

function QuotationHistoryPage() {
  const { projectId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Comments states
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentsDeleted, setCommentsDeleted] = useState(false);

  // 🔹 Payments states
  const [payments, setPayments] = useState([]);
const [loadingPayments, setLoadingPayments] = useState(true);
const [paymentsDeleted, setPaymentsDeleted] = useState(false);

  // ✅ Check if comments/payments were previously deleted (persisted)
  useEffect(() => {
    const deletedCommentsFlag = localStorage.getItem(`commentsDeleted:${projectId}`);
    if (deletedCommentsFlag) setCommentsDeleted(JSON.parse(deletedCommentsFlag));

      const pFlag = localStorage.getItem(`paymentsDeleted:${projectId}`);
  setPaymentsDeleted(pFlag ? JSON.parse(pFlag) : false);
  }, [projectId]);

  // Fetch customer & quotations history
  useEffect(() => {
  fetch(`http://localhost:5000/api/projects/${projectId}/history`)
    .then((res) => res.json())
    .then((data) => {
      if (data.customer) {
        setCustomer(data.customer);
        if (data.customer.paymentsDeleted) setPaymentsDeleted(true); // ✅
      }
      if (data.quotations) setQuotations(data.quotations);
    })
    .catch((err) => console.error("Error fetching quotation history:", err))
    .finally(() => setLoading(false));
}, [projectId]);

  // Fetch comments if not deleted
  useEffect(() => {
    if (commentsDeleted) {
      setComments([]);
      setLoadingComments(false);
      return;
    }
    fetch(`http://localhost:5000/api/comments/${projectId}`)
      .then((res) => res.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching comments:", err))
      .finally(() => setLoadingComments(false));
  }, [projectId, commentsDeleted]);

  // Fetch payments if not deleted
  useEffect(() => {
  if (customer && customer.payments && !paymentsDeleted) {
    setPayments(customer.payments);
  }
  setLoadingPayments(false);
}, [customer, paymentsDeleted]);

  // Delete all comments for this project
  const handleDeleteComments = async () => {
    if (!window.confirm("Do you want to delete all comments for this project?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/comments/${projectId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setComments([]);
        setCommentsDeleted(true);
        localStorage.setItem(`commentsDeleted:${projectId}`, "true");
        alert(`Deleted ${data.deleted} comment(s).`);
      } else {
        alert("Failed to delete comments");
      }
    } catch (err) {
      console.error("Error deleting comments:", err);
      alert("Error deleting comments");
    }
  };

  // 🔹 Delete all payments for this project
  // 🔹 Payment states
// const [payments, setPayments] = useState([]);
// const [loadingPayments, setLoadingPayments] = useState(true);
// const [paymentsDeleted, setPaymentsDeleted] = useState(false);

// On mount fetch payments from customer doc
useEffect(() => {
  if (customer && customer.payments && !paymentsDeleted) {
    setPayments(customer.payments);
  }
  setLoadingPayments(false);
}, [customer, paymentsDeleted]);

// Delete payments
const handleDeletePayments = async () => {
  if (!window.confirm("Delete all payment history for this project?")) return;
  try {
    const res = await fetch(
      `http://localhost:5000/api/customers/${projectId}/payments`,
      { method: "DELETE" }
    );
    const data = await res.json();
    if (data.success) {
      setPayments([]);
      setPaymentsDeleted(true);     // ✅ reflects instantly
      alert("All payments deleted.");
    } else {
      alert("Failed to delete payments");
    }
  } catch (err) {
    console.error("Error deleting payments:", err);
    alert("Error deleting payments");
  }
};



  // Generate and download final invoice (unchanged)
  const downloadInvoice = () => {
    if (quotations.length === 0) {
      alert("No quotations available.");
      return;
    }
    if (!customer) {
      alert("No customer details found.");
      return;
    }

    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 87, 34);
    doc.text("SmartTech Solutions", 20, 20);

    doc.setFontSize(12);
    doc.setFont("times", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("We provide exactly what you want.", 20, 28);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("FINAL INVOICE", 150, 20);

    doc.setFontSize(10);
    doc.text(`Project End Date: ${customer.endDate || ""}`, 150, 28);

    // Customer details box
    let startY = 40;
    doc.setFillColor(255, 229, 204);
    doc.setDrawColor(255, 87, 34);
    doc.roundedRect(15, startY, 180, 60, 5, 5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 87, 34);
    doc.text("Customer Details", 20, startY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    let y = startY + 18;
    doc.text(`Project Name: ${customer.projectName || ""}`, 20, y); y += 7;
    doc.text(`Customer Name: ${customer.customerName || ""}`, 20, y); y += 7;
    doc.text(`Contact: ${customer.customerContact || ""}`, 20, y); y += 7;
    doc.text(`Email: ${customer.customerEmail || ""}`, 20, y); y += 7;
    doc.text(`College: ${customer.customerCollege || ""}`, 20, y); y += 7;
    doc.text(`Branch: ${customer.customerBranch || ""}`, 20, y);

    // Collect and total components/charges
    const allUsed = {};
    let total = 0;
    let totalSetupCharges = 0;
    let totalDevelopmentCharges = 0;

    quotations.forEach((q) => {
      (q.items || []).forEach((item) => {
        if (!allUsed[item.name])
          allUsed[item.name] = { price: item.price, qty: 0 };
        allUsed[item.name].qty += item.quantity;
        total += item.price * item.quantity;
      });
      totalSetupCharges += Number(q.setupCharges || 0);
      totalDevelopmentCharges += Number(q.developmentCharges || 0);
      total += Number(q.setupCharges || 0) + Number(q.developmentCharges || 0);
    });

    y += 15;
    autoTable(doc, {
      startY: y,
      head: [["Component", "Qty", "Price", "Total"]],
      body: Object.keys(allUsed).map((key) => [
        key,
        allUsed[key].qty.toString(),
        `${allUsed[key].price}`,
        `${allUsed[key].price * allUsed[key].qty}`,
      ]),
      styles: { fontSize: 11 },
      headStyles: { fillColor: [255, 87, 34] },
    });

    let finalY = doc.lastAutoTable?.finalY || y + 50;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Setup Charges: Rs. ${totalSetupCharges}`, 20, finalY + 8);
    doc.text(`Total Development Charges: Rs. ${totalDevelopmentCharges}`, 20, finalY + 16);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 87, 34);
    doc.text(`Grand Total (All Quotations + Charges): Rs. ${total}`, 20, finalY + 30);

    // Footer
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Contact Details:", 20, finalY + 45);
    doc.text("8805205049", 20, finalY + 55);
    doc.text("8055335650", 20, finalY + 65);
    doc.text("8446052814", 20, finalY + 75);

    doc.save(
      `${customer.projectName || "customer"}-${customer.customerContact || "contact"}-invoice.pdf`
    );
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: "20px" }}>
          <h2>Loading...</h2>
        </div>
      </Layout>
    );
  }

  if (!customer) {
    return (
      <Layout>
        <div style={{ padding: "20px" }}>
          <h2>No project found.</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: "20px" }}>
        <h2>Quotation History</h2>

        {/* Customer Info */}
        <div
          style={{
            border: "1px solid gray",
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "20px",
            background: "#f3f3f3",
          }}
        >
          <h3>
            Project Name: <span style={{ color: "red" }}>{customer.projectName}</span>
          </h3>
          <p>
            <b>Customer:</b> {customer.customerName}
          </p>
          <p>
            <b>Phone:</b> {customer.customerContact}
          </p>
          <p>
            <b>Status:</b> {customer.status}
          </p>
        </div>

        {/* Quotations */}
        {quotations.length === 0 && <p>No quotations available.</p>}
        {quotations.map((q, idx) => (
          <div
            key={q.id || idx}
            style={{
              border: "1px solid gray",
              margin: "10px 0",
              padding: "10px",
              borderRadius: "6px",
              background: "#f9f9f9",
            }}
          >
            <p>
              <b>Date:</b> {q.date ? new Date(q.date).toLocaleString() : "N/A"}
            </p>
            <ul>
              {(q.items || []).map((item, i) => (
                <li key={i}>
                  {item.name} | Qty: {item.quantity} | Rs. {item.price * item.quantity}
                </li>
              ))}
            </ul>
            <p>Setup Charges: {q.setupCharges || 0}</p>
            <p>Development Charges: {q.developmentCharges || 0}</p>
            <b>Grand Total: {q.grandTotal || 0}</b>
          </div>
        ))}

        {quotations.length > 0 && (
          <button
            onClick={downloadInvoice}
            style={{
              marginTop: "20px",
              background: "#ff7043",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Download Invoice
          </button>
        )}

        {/* Comments Section */}
        <div
          style={{
            marginTop: "30px",
            padding: "15px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            background: "#fafafa",
          }}
        >
          <h3>Comments</h3>
          {loadingComments ? (
            <div>Loading comments...</div>
          ) : commentsDeleted ? (
            <div style={{ color: "#e53935", fontWeight: "bold" }}>Comments deleted.</div>
          ) : comments.length === 0 ? (
            <div style={{ color: "#777" }}>No comments yet.</div>
          ) : (
            <ul style={{ paddingLeft: 18 }}>
              {comments.map((c, idx) => (
                <li key={idx} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 14 }}>
                    {c.text || c.commentText || c.body || c.message}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {c.admin || c.author || "Admin"} •{" "}
                    {c.date
                      ? new Date(c.date).toLocaleString()
                      : c.createdAt
                      ? new Date(c.createdAt).toLocaleString()
                      : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!commentsDeleted && comments.length > 0 && (
            <button
              onClick={handleDeleteComments}
              style={{
                marginTop: 12,
                backgroundColor: "#e53935",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              🗑 Delete Comments
            </button>
          )}
        </div>

        {/* Payments Section */}
        {/* Payments Section */}
<div
  style={{
    marginTop: "30px",
    padding: "15px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    background: "#fafafa",
  }}
>
  <h3>Payment History</h3>
  {loadingPayments ? (
    <div>Loading payments...</div>
  ) : paymentsDeleted ? (
    <div style={{ color: "#e53935", fontWeight: "bold" }}>Payments deleted.</div>
  ) : payments.length === 0 ? (
    <div style={{ color: "#777" }}>No payments recorded.</div>
  ) : (
    <ul style={{ paddingLeft: 18 }}>
      {payments.map((p, idx) => (
        <li key={idx} style={{ marginBottom: 6 }}>
          {p.method} – Rs.{p.amount} • {p.admin} •{" "}
          {p.date ? new Date(p.date).toLocaleString() : ""}
        </li>
      ))}
    </ul>
  )}

  {!paymentsDeleted && payments.length > 0 && (
    <button
      onClick={handleDeletePayments}
      style={{
        marginTop: 12,
        backgroundColor: "#e53935",
        color: "white",
        border: "none",
        padding: "10px 16px",
        borderRadius: "6px",
        cursor: "pointer",
        fontWeight: "bold",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      }}
    >
      🗑 Delete Payments
    </button>
  )}
</div>

      </div>
    </Layout>
  );
}

export default QuotationHistoryPage;
