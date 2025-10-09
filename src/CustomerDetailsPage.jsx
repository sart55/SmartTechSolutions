// CustomerDetailsPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";
import "./CustomerDetailsPage.css";

function CustomerDetailsPage() {
  const [form, setForm] = useState({
    projectName: "",
    customerName: "",
    customerContact: "",
    customerEmail: "",
    customerCollege: "",
    customerBranch: "",
  });
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");
  const navigate = useNavigate();
  const API_BASE = "https://smarttechsolutions-4df8.onrender.com/api";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const makeProjectId = (projectName = "", phone = "") => {
    const namePart = projectName.trim().toLowerCase().replace(/\s+/g, "-");
    const phoneDigits = (phone || "").toString().replace(/\D/g, "");
    return `${namePart}-${phoneDigits}`;
  };

  const checkProjectExists = async (projectId) => {
    const url = `${API_BASE}/customers/${encodeURIComponent(projectId)}`;
    const res = await fetch(url);
    if (res.status === 404) return false;
    const text = await res.text();
    if (!text) return res.ok;
    try {
      const data = JSON.parse(text);
      if (typeof data.exists !== "undefined") return !!data.exists;
      return true;
    } catch {
      return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setWarning("");
    setLoading(true);
    const projectId = makeProjectId(form.projectName, form.customerContact);
    try {
      const exists = await checkProjectExists(projectId);
      if (exists) {
        setDuplicateModalOpen(true);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Validation failed:", err);
      setWarning("Could not verify uniqueness (server unreachable). Proceeding.");
    }
    localStorage.setItem("customerDetails", JSON.stringify(form));
navigate("/quotation/new");


  };

  return (
    <Layout className="Layout">
      <div className="customer-details-container">
        <div className="form-card">
          <div className="card-header">
            <h2>Enter Customer Details</h2>
            <p className="muted">Fill the form below to  to quotation.</p>
          </div>
          {warning && <div className="warning">{warning}</div>}
          <form onSubmit={handleSubmit} className="customer-form">
            <label className="field">
              <span className="label-text">Project Name</span>
              <input
                type="text"
                name="projectName"
                // placeholder="Project Name *"
                required
                value={form.projectName}
                onChange={handleChange}
                className="input-field"
              />
            </label>
            <label className="field">
              <span className="label-text">Customer Name</span>
              <input
                type="text"
                name="customerName"
                // placeholder="Customer Name *"
                required
                value={form.customerName}
                onChange={handleChange}
                className="input-field"
              />
            </label>
            <label className="field">
              <span className="label-text">Contact Number</span>
              <input
                type="text"
                name="customerContact"
                // placeholder="Customer Contact *"
                required
                value={form.customerContact}
                onChange={handleChange}
                className="input-field"
              />
            </label>
            <label className="field">
              <span className="label-text">Email</span>
              <input
                type="email"
                name="customerEmail"
                // placeholder="Customer Email *"
                required
                value={form.customerEmail}
                onChange={handleChange}
                className="input-field"
              />
            </label>
            <label className="field">
              <span className="label-text">College</span>
              <input
                type="text"
                name="customerCollege"
                // placeholder="Customer College Name *"
                required
                value={form.customerCollege}
                onChange={handleChange}
                className="input-field"
              />
            </label>
            <label className="field">
              <span className="label-text">Branch</span>
              <input
                type="text"
                name="customerBranch"
                // placeholder="Customer Branch *"
                required
                value={form.customerBranch}
                onChange={handleChange}
                className="input-field"
              />
            </label>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Checking..." : "Continue to Quotation"}
            </button>
          </form>
        </div>
      </div>
      {duplicateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title">Duplicate Project</h3>
            <p>
              A project with the same <strong>Project Name</strong> and{" "}
              <strong>Contact Number</strong> already exists.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDuplicateModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default CustomerDetailsPage;


// End of file - padded to keep original length






