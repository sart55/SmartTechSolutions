// QuotationPage.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable, { Row } from "jspdf-autotable";
import Layout from "./Layout";
import "./Layout.css";
import "./QuotationPage.css";
import sendIcon from "./assets/send.jpg"; // <-- adjust relative to this file

function QuotationPage() {
  const { projectId } = useParams();

  const [allComponents, setAllComponents] = useState([]); // fetched from backend
  const [selected, setSelected] = useState([]);
  const [searchName, setSearchName] = useState("");
  const [searchQty, setSearchQty] = useState(1);
  const [selectedPrice, setSelectedPrice] = useState("");
  const [availableStock, setAvailableStock] = useState(null);
  const [setupCharges, setSetupCharges] = useState(0);
  const [developmentCharges, setDevelopmentCharges] = useState(0);
  const [quotations, setQuotations] = useState([]);
  const [projectClosed, setProjectClosed] = useState(false);
  const [projectEndDate, setProjectEndDate] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  // Customer details (persisted to localStorage; backend save happens on first Save Quotation)
  const [customerDetails, setCustomerDetails] = useState(null);

  // Editing states for customer details
  const [customerEditable, setCustomerEditable] = useState(false); // currently editing?
  const [customerEditAllowed, setCustomerEditAllowed] = useState(true); // allowed until first quotation is saved
  const [customerDraft, setCustomerDraft] = useState(null); // local draft while editing

  // 🔹 Payment states (NEW)
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Comments
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState([]); // comments list for this project
  const [loadingComments, setLoadingComments] = useState(false);
  //spinner
    const [loadingQuotation, setLoadingQuotation] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // UI helpers

  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const API_BASE = "https://smarttechsolutions-4df8.onrender.com/api";

  // helper to create projectId: projectname-phoneno (sanitized)
  const makeProjectId = (projectName = "", phone = "") => {
    const namePart = (projectName || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
    const phoneDigits = (phone || "").toString().replace(/\D/g, "");
    return `${namePart}-${phoneDigits}`;
  };

  // fetch components
  useEffect(() => {
    const fetchComponents = async () => {
      try {
        const res = await fetch(`${API_BASE}/components`);

        if (!res.ok) {
          console.warn("components fetch returned non-ok status", res.status);

          return;
        }
        const data = await res.json();
        setAllComponents(data);
      } catch (err) {
        console.error("Failed to fetch components:", err);
      }
    };
    fetchComponents();
  }, []);

  // load quotations (localStorage) - original behaviour retained for projects without projectId
  useEffect(() => {
    if (!projectId) {
      const storedQ = localStorage.getItem("quotations");
      if (storedQ) {
        try {
          const parsed = JSON.parse(storedQ);
          setQuotations(parsed);
          // If there are existing quotations, disable customer editing (we assume first quotation already saved)
          setCustomerEditAllowed(!(Array.isArray(parsed) && parsed.length > 0));
        } catch {
          setQuotations([]);
          setCustomerEditAllowed(true);
        }
      } else {
        setQuotations([]);
        setCustomerEditAllowed(true);
      }
    }
  }, [projectId]);

  // NEW: if opened with projectId (from AllProjectsPage), fetch customer & quotations from backend
 useEffect(() => {
  if (!projectId) return;

  // ✅ Skip fetch if this is a *new* project that isn't yet saved to backend
  const isNewProject =
    !customerDetails && (!quotations || quotations.length === 0);
  if (isNewProject) {
    console.log("Skipping backend fetch — new project (no data yet)");
    setInitialLoading(false);
    return;
  }

  const fetchHistory = async () => {
    setInitialLoading(true);
    try {
      // ---------------- FETCH CUSTOMER DETAILS ----------------
      const custRes = await fetch(
        `${API_BASE}/customers/${encodeURIComponent(projectId)}`
      );

      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomerDetails(custData);

        // Check if project is closed
        if (custData && custData.status === "closed") {
          setProjectClosed(true);
          if (custData.endDate) {
            const formatted = new Date(custData.endDate).toLocaleString();
            setProjectEndDate(formatted);
            try {
              localStorage.setItem(
                `projectClosed:${projectId}`,
                JSON.stringify(true)
              );
              localStorage.setItem(
                `projectEndDate:${projectId}`,
                JSON.stringify(formatted)
              );
            } catch (e) {
              console.warn(
                "Failed to persist project closed state for projectId:",
                projectId,
                e
              );
            }
          }
        }
      } else {
        console.warn(
          `Customer ${projectId} not found (status ${custRes.status})`
        );
      }
    } catch (err) {
      console.error("Error fetching customer details:", err);
    }

    // ---------------- FETCH QUOTATIONS ----------------
    try {
      const qRes = await fetch(
        `${API_BASE}/quotations/${encodeURIComponent(projectId)}`
      );
      if (qRes.ok) {
        const qData = await qRes.json();
        setQuotations(Array.isArray(qData) ? qData : []);
      } else {
        console.warn(
          `Quotations for ${projectId} not found (status ${qRes.status})`
        );
      }
    } catch (err) {
      console.error("Error fetching quotations:", err);
    }

    // ---------------- FETCH COMMENTS ----------------
    try {
      setLoadingComments(true);
      const key = projectId || (customerDetails && customerDetails.projectId);
      if (key) {
        const res = await fetch(
          `${API_BASE}/comments/${encodeURIComponent(key)}`
        );
        if (res.ok) {
          const data = await res.json();
          setComments(Array.isArray(data) ? data : []);
        } else {
          console.warn(
            "Failed to fetch comments for project",
            key,
            res.status
          );
        }
      } else {
        console.warn("No valid project key for comments fetch");
      }
    } catch (err) {
      console.warn("Failed to fetch comments:", err);
    } finally {
      setLoadingComments(false);
      setInitialLoading(false);
    }

    // lock editing when opened from backend
    setCustomerEditAllowed(false);
    setCustomerEditable(false);
  };

  fetchHistory();
  // 👇 added dependencies so new project detection re-evaluates properly
}, [projectId, customerDetails, quotations]);


  useEffect(() => {
    const key = projectId || (customerDetails && customerDetails.projectId);
    if (!key) return;
    if (quotations.length > 0) {
      const fetchComments = async () => {
        try {
          setLoadingComments(true);
          const res = await fetch(
            `${API_BASE}/comments/${encodeURIComponent(key)}`
          );
          if (res.ok) {
            const data = await res.json();
            setComments(Array.isArray(data) ? data : []);
          }
        } catch (err) {
          console.error("Failed to refetch comments:", err);
        } finally {
          setLoadingComments(false);
        }
      };
      fetchComments();
    }
  }, [quotations]); // ✅ run whenever quotations change

  // persist quotations locally (only for projects not loaded from backend)
  useEffect(() => {
    if (!projectId) {
      localStorage.setItem("quotations", JSON.stringify(quotations));
    }
  }, [quotations, projectId]);

  // load customer details from localStorage (local only)
  useEffect(() => {
    if (!projectId) {
      const stored = localStorage.getItem("customerDetails");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCustomerDetails(parsed);
        } catch {
          setCustomerDetails(null);
        }
      }
    }
  }, [projectId]);

  // persist customer details locally whenever they change (only for local/new projects)
  useEffect(() => {
    if (!projectId) {
      if (customerDetails) {
        localStorage.setItem(
          "customerDetails",
          JSON.stringify(customerDetails)
        );
      } else {
        localStorage.removeItem("customerDetails");
      }
    }
  }, [customerDetails, projectId]);

  // If no route projectId but there is a saved customerDetails with projectId, fetch its quotations so history persists after refresh
  useEffect(() => {
    if (projectId) return; // handled by other effect
    if (!customerDetails || !customerDetails.projectId) return;
    const fetchSavedProject = async () => {
      try {
        const qRes = await fetch(
          `${API_BASE}/quotations/${encodeURIComponent(
            customerDetails.projectId
          )}`
        );
        if (qRes.ok) {
          const qData = await qRes.json();
          const arr = Array.isArray(qData) ? qData : [];
          setQuotations(arr);
          // ✅ Only lock if at least one quotation actually exists
          if (arr.length > 0) {
            setCustomerEditAllowed(false);
            setCustomerEditable(false);
          }
        }
      } catch (err) {
        console.warn("Failed to load saved project quotations:", err);
      }
    };
    fetchSavedProject();
  }, [projectId, customerDetails]);

  // 🔹 NEW: Load persisted projectClosed & projectEndDate for the current project (route projectId or local saved projectId)
  useEffect(() => {
    const key =
      projectId || (customerDetails && customerDetails.projectId) || null;
    if (!key) return;
    try {
      const closedRaw = localStorage.getItem(`projectClosed:${key}`);
      const endRaw = localStorage.getItem(`projectEndDate:${key}`);
      if (closedRaw !== null) {
        try {
          setProjectClosed(JSON.parse(closedRaw));
        } catch (e) {
          console.warn(
            "Failed to parse persisted projectClosed value for key:",
            key,
            e
          );
        }
      }
      if (endRaw) {
        try {
          setProjectEndDate(JSON.parse(endRaw));
        } catch (e) {
          console.warn(
            "Failed to parse persisted projectEndDate value for key:",
            key,
            e
          );
        }
      }
    } catch (e) {
      console.warn("Error reading persisted project closed state:", e);
    }
  }, [projectId, customerDetails]);

  // 🔹 NEW: Persist projectClosed when it changes (per-project)
  useEffect(() => {
    const key =
      projectId || (customerDetails && customerDetails.projectId) || null;
    if (!key) return;
    try {
      localStorage.setItem(
        `projectClosed:${key}`,
        JSON.stringify(projectClosed)
      );
    } catch (e) {
      console.warn("Failed to persist projectClosed for key:", key, e);
    }
  }, [projectClosed, projectId, customerDetails]);

  // 🔹 NEW: Persist projectEndDate when it changes (per-project)
  useEffect(() => {
    const key =
      projectId || (customerDetails && customerDetails.projectId) || null;
    if (!key) return;
    try {
      if (projectEndDate) {
        localStorage.setItem(
          `projectEndDate:${key}`,
          JSON.stringify(projectEndDate)
        );
      }
    } catch (e) {
      console.warn("Failed to persist projectEndDate for key:", key, e);
    }
  }, [projectEndDate, projectId, customerDetails]);

  // suggestions filter for components
  // -----------------------------
  // States and logic
  // -----------------------------

  // Filter suggestions every time user types
  useEffect(() => {
    if (searchName) {
      const filtered = allComponents.filter((c) =>
        c.name.toLowerCase().includes(searchName.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [searchName, allComponents]);

  // Auto-fill price/stock when there's an exact match
  useEffect(() => {
    if (!searchName) {
      setSelectedPrice("");
      setAvailableStock(null);
      return;
    }
    const exact = allComponents.find(
      (c) => c.name.toLowerCase() === searchName.toLowerCase()
    );
    if (exact) {
      setSelectedPrice(exact.price);
      setAvailableStock(exact.quantity ?? null);
    } else {
      setSelectedPrice("");
      setAvailableStock(null);
    }
  }, [searchName, allComponents]);

  // Handle click on a suggestion
  const onSelectSuggestion = (comp) => {
    setSearchName(comp.name);
    setSelectedPrice(comp.price);
    setAvailableStock(comp.quantity ?? null);
    setSearchQty(1);
    setSuggestions([]); // ✅ instantly hide the dropdown
  };

  const addComponent = () => {
    if (!searchName) {
      alert("Enter or select a component name.");
      return;
    }
    const comp = allComponents.find(
      (c) => c.name.toLowerCase() === searchName.toLowerCase()
    );
    if (!comp) {
      alert("Component not found in database. Ask admin to add it.");
      return;
    }
    const qty = Number(searchQty || 0);
    if (!qty || qty <= 0) {
      alert("Enter a valid quantity.");
      return;
    }
    if (comp.quantity !== undefined && qty > comp.quantity) {
      alert(`Only ${comp.quantity} available in stock.`);
      return;
    }

    const idx = selected.findIndex(
      (s) => s.name.toLowerCase() === comp.name.toLowerCase()
    );
    if (idx !== -1) {
      const updated = [...selected];
      updated[idx].quantity += qty;
      setSelected(updated);
    } else {
      setSelected([
        ...selected,
        { name: comp.name, price: comp.price, quantity: qty },
      ]);
    }

    setSearchName("");
    setSearchQty(1);
    setSelectedPrice("");
    setAvailableStock(null);
  };

  const totalComponents = selected.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const grandTotal =
    totalComponents +
    Number(setupCharges || 0) +
    Number(developmentCharges || 0);

  // SAVE QUOTATION:
  // - If this is the first quotation for this project and there are customerDetails locally,
  //   save the customer to backend first (include projectId and status: "open").
  // - Then update stock on backend and continue as before.
  // - Also save the quotation to backend (with projectId) when saving.
  const saveQuotation = async () => {
    if (selected.length === 0) {
      alert("Add components before saving quotation.");
      return;
    }
setLoadingQuotation(true);
    try {
      // Build projectId if we have customerDetails
      let pid = null;
      if (customerDetails) {
        pid = makeProjectId(
          customerDetails.projectName || "",
          customerDetails.customerContact || ""
        );
      }

      // 1) If this is the first quotation and customer data exists locally, save customer to backend (status: open).
      if (customerEditAllowed && customerDetails) {
        try {
          const payload = { ...customerDetails };
          payload.projectId = pid;
          payload.status = "open";

          const resCust = await fetch(`${API_BASE}/customers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!resCust.ok) {
            console.error(
              "Failed to save customer to backend:",
              resCust.status
            );
            alert(
              "Warning: Failed to save customer details to backend. Quotation will still save locally and stock update will be attempted."
            );
          } else {
            const saved = await resCust.json();
            // Save backend return to local customerDetails (so projectId / id present locally)
            setCustomerDetails(saved);
          }
        } catch (err) {
          console.error("Error saving customer to backend:", err);
          alert(
            "Warning: Error when saving customer to backend. Quotation will still proceed locally."
          );
        }
       
      }

      // 2) Deduct stock in backend
      await fetch(`${API_BASE}/update-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usedItems: selected }),
      });

      // 3) Refresh components from backend to reflect new quantities (best-effort)
      try {
        const res = await fetch(`${API_BASE}/components`);
        const updatedComponents = await res.json();
        setAllComponents(updatedComponents);
      } catch (err) {
        console.warn("Failed to refresh components after update:", err);
      }

      // 4) Prepare quotation object with projectId
      const newQuotation = {
        date: new Date().toLocaleString(),
        items: selected,
        setupCharges,
        developmentCharges,
        totalComponents,
        grandTotal,
        projectId: pid,
      };

      // Save quotation locally
      const updatedQuotations = [newQuotation, ...quotations];
      setQuotations(updatedQuotations);

      // Save quotation to backend (best-effort)
      try {
        await fetch(`${API_BASE}/quotations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newQuotation),
        });
      } catch (err) {
        console.warn("Failed to save quotation to backend:", err);
      }

      // reset selection / charges
      setSelected([]);
      setSetupCharges(0);
      setDevelopmentCharges(0);

      // 5) After the very first Save Quotation, disable editing of customer details
      setCustomerEditAllowed(false);
      setCustomerEditable(false);

      alert("Quotation saved and stock updated.");
    } catch (err) {
      console.error("Failed to save quotation:", err);
      alert("Failed to save quotation. Please try again.");
    }
      finally {
    setLoadingQuotation(false); // 👈 stop spinner
  }
  };

  // Full styled PDF generation (kept intact as in your original file)
  const downloadQuotationPDF = (quotation) => {
    try {
      if (!customerDetails) {
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
      doc.text("PRICE QUOTATION", 150, 20);

      doc.setFontSize(10);
      doc.text(`Date: ${quotation.date}`, 150, 28);

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
      doc.text(`Project Name: ${customerDetails?.projectName || ""}`, 20, y);
      y += 7;
      doc.text(`Customer Name: ${customerDetails?.customerName || ""}`, 20, y);
      y += 7;
      doc.text(`Contact: ${customerDetails?.customerContact || ""}`, 20, y);
      y += 7;
      doc.text(`Email: ${customerDetails?.customerEmail || ""}`, 20, y);
      y += 7;
      doc.text(`College: ${customerDetails?.customerCollege || ""}`, 20, y);
      y += 7;
      doc.text(`Branch: ${customerDetails?.customerBranch || ""}`, 20, y);

      // Components table
      y += 15;
      autoTable(doc, {
        startY: y,
        head: [["Component", "Qty", "Price", "Total"]],
        body: (quotation.items || []).map((item) => [
          item.name,
          item.quantity?.toString() || "0",
          `${item.price}`,
          `${item.price * item.quantity}`,
        ]),
        styles: { fontSize: 11 },
        headStyles: { fillColor: [255, 87, 34] },
      });

      let finalY = doc.lastAutoTable?.finalY || y + 50;
      // Charges
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Setup Charges: ${quotation.setupCharges}`, 20, finalY + 12);
      finalY += 8;
      doc.text(
        `Development Charges: ${quotation.developmentCharges}`,
        20,
        finalY + 12
      );
      finalY += 8;

      // Grand total
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 87, 34);
      doc.text(`Grand Total: Rs ${quotation.grandTotal}`, 20, finalY + 20);

      // Footer
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Contact Details:", 20, finalY + 45);
      doc.text("8805205049", 20, finalY + 55);
      doc.text("8055335650", 20, finalY + 65);
      doc.text("8446052814", 20, finalY + 75);

      // Save
      doc.save(
        `${customerDetails?.projectName || "customer"}-${
          customerDetails?.customerContact || "contact"
        }.pdf`
      );
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Something went wrong while generating the PDF.");
    }
  };

 

  const closeProject = async () => {
  // ✅ Block closing if no quotation is saved
  if (!quotations || quotations.length === 0) {
    alert("You must save at least one quotation before closing this project.");
    return; // stop execution
  }

  // Existing unsaved items check
  if (selected.length > 0) {
    if (
      !window.confirm(
        "You have unsaved items — save the quotation before closing?"
      )
    ) {
      return; // stop if admin cancels
    }
  }

  const end = new Date().toLocaleString();
  setProjectClosed(true);
  setProjectEndDate(end);

  const key =
    projectId || (customerDetails && customerDetails.projectId) || null;

  // 🔹 Persist locally
  try {
    if (key) {
      localStorage.setItem(`projectClosed:${key}`, JSON.stringify(true));
      localStorage.setItem(`projectEndDate:${key}`, JSON.stringify(end));
    }
  } catch (e) {
    console.warn("Failed to persist project closed state on closeProject:", e);
  }

  // 🔹 Update backend status
  try {
    if (key) {
      await fetch(`${API_BASE}/customers/${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed", endDate: end }),
      });

      setCustomerDetails((prev) =>
        prev ? { ...prev, status: "closed", endDate: end } : prev
      );
    }
  } catch (err) {
    console.error("Failed to update backend status to closed:", err);
  }
};


  // Invoice PDF (kept intact)
  const downloadInvoice = () => {
    if (quotations.length === 0) {
      alert("No quotations to make an invoice.");
      return;
    }
    if (!customerDetails) {
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
    doc.text(`Project End Date: ${projectEndDate || ""}`, 150, 28);

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
    doc.text(`Project Name: ${customerDetails?.projectName || ""}`, 20, y);
    y += 7;
    doc.text(`Customer Name: ${customerDetails?.customerName || ""}`, 20, y);
    y += 7;
    doc.text(`Contact: ${customerDetails?.customerContact || ""}`, 20, y);
    y += 7;
    doc.text(`Email: ${customerDetails?.customerEmail || ""}`, 20, y);
    y += 7;
    doc.text(`College: ${customerDetails?.customerCollege || ""}`, 20, y);
    y += 7;
    doc.text(`Branch: ${customerDetails?.customerBranch || ""}`, 20, y);

    // ✅ Combine all quotations
    const allUsed = {};
    let total = 0;
    let totalSetupCharges = 0; // ✅ NEW accumulator
    let totalDevelopmentCharges = 0; // ✅ NEW accumulator

    quotations.forEach((q) => {
      (q.items || []).forEach((item) => {
        if (!allUsed[item.name])
          allUsed[item.name] = { price: item.price, qty: 0 };
        allUsed[item.name].qty += item.quantity;
        total += item.price * item.quantity;
      });
      // accumulate charges
      totalSetupCharges += Number(q.setupCharges || 0);
      totalDevelopmentCharges += Number(q.developmentCharges || 0);
      total += Number(q.setupCharges || 0) + Number(q.developmentCharges || 0);
    });

    // Components table
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

    // ✅ Add total setup and development charges
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Setup Charges: Rs. ${totalSetupCharges}`, 20, finalY + 8);
    doc.text(
      `Total Development Charges: Rs. ${totalDevelopmentCharges}`,
      20,
      finalY + 16
    );

    // ✅ Grand total (including all charges)
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 87, 34);
    doc.text(
      `Grand Total (All Quotations + Charges): Rs. ${total}`,
      20,
      finalY + 30
    );

    // Footer
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Contact Details:", 20, finalY + 45);
    doc.text("8805205049", 20, finalY + 55);
    doc.text("8055335650", 20, finalY + 65);
    doc.text("8446052814", 20, finalY + 75);

    doc.save(
      `${customerDetails?.projectName || "customer"}-${
        customerDetails?.customerContact || "contact"
      }-invoice.pdf`
    );
  };

  // Customer edit handlers (kept unchanged)
  const handleStartEditCustomer = () => {
    if (!customerEditAllowed) return;
    setCustomerDraft(
      customerDetails
        ? { ...customerDetails }
        : {
            projectName: "",
            customerName: "",
            customerContact: "",
            customerEmail: "",
            customerCollege: "",
            customerBranch: "",
          }
    );
    setCustomerEditable(true);
  };

  // NOTE: This no longer saves to backend. It only saves locally.
  // Backend persistence is done in saveQuotation() (first time only).
  const handleSaveCustomer = async () => {
    if (!customerDraft) return;
    if (!customerDraft.projectName || !customerDraft.customerName) {
      alert("Please fill at least Project Name and Customer Name.");
      return;
    }

    // generate projectId and check if exists on backend
    const proposedProjectId = makeProjectId(
      customerDraft.projectName || "",
      customerDraft.customerContact || ""
    );
    try {
      const check = await fetch(
        `${API_BASE}/customers/${encodeURIComponent(proposedProjectId)}`
      );
      if (check.ok) {
        // customer exists -> warn and keep user on details page to change
        alert(
          `Project with id ${proposedProjectId} already exists. Please change project name or contact.`
        );
        return;
      }
    } catch (err) {
      console.warn("Failed to check existing projectId:", err);
      // allow continue if backend check fails (best-effort)
    }

    // attach projectId locally so page knows this project's id
    const updated = { ...customerDraft, projectId: proposedProjectId };
    setCustomerDetails(updated);
    setCustomerDraft(null);
    setCustomerEditable(false);
  };

  const handleCancelCustomerEdit = () => {
    setCustomerDraft(null);
    setCustomerEditable(false);
  };

  // 🔹 NEW: Save Payment handler (posts to backend and updates local state)
  const handleSavePayment = async () => {
    // Decide which key to use for customer: route projectId has priority, otherwise saved customerDetails.projectId
    const key = projectId || (customerDetails && customerDetails.projectId);
    if (quotations.length === 0) {
      alert("Save quotation first");
      return;
    }
    if (!paymentAmount) {
      alert("Please enter an amount.");
      return;
    }
     setLoadingPayment(true); // 👈 start spinner
    if (!key) {
      alert(
        "Customer must be saved before recording payments. Save customer / quotation first."
      );
      return;
    }

    // admin name: try to get from localStorage (you may set this at login)
    const adminName =
      localStorage.getItem("adminName") ||
      localStorage.getItem("username") ||
      "Admin";

    try {
      const res = await fetch(
        `${API_BASE}/customers/${encodeURIComponent(key)}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(paymentAmount),
            method: paymentMethod,
            adminName,
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to save payment");
      }

      const data = await res.json();

      // append to local customerDetails payments array
      setCustomerDetails((prev) => {
        if (!prev) return prev;
        const updatedPayments = [...(prev.payments || []), data.payment];
        return { ...prev, payments: updatedPayments };
      });

      // clear input
      setPaymentAmount("");
      setPaymentMethod("cash");
    } catch (err) {
      console.error("Error saving payment:", err);
      alert("Failed to save payment. Check console for details.");
    }finally {
    setLoadingPayment(false); // ✅ always stop spinner
  }
  };

  // ---------------------------

  // Comments: Save comment handler

  // ---------------------------
  const handleSaveComment = async () => {
    // ⬇️ Must have at least one quotation saved in DB
    if (!quotations || quotations.length === 0) {
      alert("Save quotation first before adding comments.");
      return;
    }

    const key = projectId || (customerDetails && customerDetails.projectId);
    if (!key) {
      alert("Save quotation first before adding comments.");
      return;
    }

    if (!newComment || !newComment.trim()) {
      alert("Enter a comment before saving.");
      return;
    }

    const adminName =
      localStorage.getItem("adminName") ||
      localStorage.getItem("username") ||
      "Admin";

    const payload = {
      projectId: key,
      text: newComment.trim(),
      admin: adminName,
      date: new Date().toISOString(),
    };
  setLoadingComments(true); // 🔵 start spinner
    try {
      const res = await fetch(`${API_BASE}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save comment");
      }

      const saved = await res.json();
      const commentToAdd = saved.comment || { ...payload };
      setComments((prev) => [...(prev || []), commentToAdd]);
      setNewComment("");
    } catch (err) {
      console.error("Failed to save comment:", err);
      alert("Failed to save comment. See console.");
    }
    finally {
    setLoadingComments(false); // 🔵 stop spinner
  }
  };

  // ---------------------------

  // Helper: format admin short name for payments display (initial + last 2 digits)

  // ---------------------------

  const formatAdminShort = (admin) => {
    if (!admin) return "admin";

    // if admin is like "y01" already short, just return it

    if (/^[a-zA-Z]\d{2}$/.test(admin)) return admin;

    // attempt to build initial + last two digits if the admin contains digits

    const alphaMatch = admin.match(/[A-Za-z]/g);

    const digitMatch = admin.match(/\d/g);

    const initials =
      (alphaMatch && alphaMatch.slice(0, 2).join("").substr(0, 2)) ||
      admin.substr(0, 1);

    const lastTwo = digitMatch
      ? digitMatch.slice(-2).join("")
      : admin.length >= 2
      ? admin.substr(-2)
      : "01";

    return `${initials}${lastTwo}`;
  };

  // ---------------------------

  // Render

  // ---------------------------

  return (
    <Layout>
      {initialLoading && (
  <div className="loading-overlay">
    <div className="loader"></div>
  </div>
)}

      <div>
        {/* Customer Details Section */}
        <div
          className="customer-card"
          style={{
            // keep inline layout-related values that are specific in your original file
            border: "1px solid #ccc",
            padding: "10px",
            marginBottom: "16px",
            borderRadius: "6px",
            display: "flex",
            flexDirection: "row",
          }}
        >
          <div
            className="customer-left"
            style={{
              display: "flex",
              flexDirection: "column",
              width: "60%",
              marginRight: "25px",
            }}
          >
            <h2>Customer Details</h2>

            {customerEditable ? (
              <div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    name="projectName"
                    type="text"
                    placeholder="Project Name"
                    value={customerDraft?.projectName || ""}
                    onChange={(e) =>
                      setCustomerDraft({
                        ...customerDraft,
                        projectName: e.target.value,
                      })
                    }
                    style={{ flex: "1 1 300px", padding: "8px" }}
                  />
                  <input
                    name="customerName"
                    type="text"
                    placeholder="Customer Name"
                    value={customerDraft?.customerName || ""}
                    onChange={(e) =>
                      setCustomerDraft({
                        ...customerDraft,
                        customerName: e.target.value,
                      })
                    }
                    style={{ flex: "1 1 300px", padding: "8px" }}
                  />
                  <input
                    name="customerContact"
                    type="text"
                    placeholder="Contact"
                    value={customerDraft?.customerContact || ""}
                    onChange={(e) =>
                      setCustomerDraft({
                        ...customerDraft,
                        customerContact: e.target.value,
                      })
                    }
                    style={{ flex: "1 1 200px", padding: "8px" }}
                  />
                  <input
                    name="customerEmail"
                    type="email"
                    placeholder="Email"
                    value={customerDraft?.customerEmail || ""}
                    onChange={(e) =>
                      setCustomerDraft({
                        ...customerDraft,
                        customerEmail: e.target.value,
                      })
                    }
                    style={{ flex: "1 1 300px", padding: "8px" }}
                  />
                  <input
                    name="customerCollege"
                    type="text"
                    placeholder="College"
                    value={customerDraft?.customerCollege || ""}
                    onChange={(e) =>
                      setCustomerDraft({
                        ...customerDraft,
                        customerCollege: e.target.value,
                      })
                    }
                    style={{ flex: "1 1 300px", padding: "8px" }}
                  />
                  <input
                    name="customerBranch"
                    type="text"
                    placeholder="Branch"
                    value={customerDraft?.customerBranch || ""}
                    onChange={(e) =>
                      setCustomerDraft({
                        ...customerDraft,
                        customerBranch: e.target.value,
                      })
                    }
                    style={{ flex: "1 1 300px", padding: "8px" }}
                  />
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: "15%", padding: "0px" }}
                    onClick={handleSaveCustomer}
                  >
                    Save Details (local)
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={handleCancelCustomerEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // display mode
              <>
                {customerDetails ? (
                  <div>
                    <p>
                      <strong>Project Name:</strong>{" "}
                      {customerDetails.projectName}
                    </p>
                    <p>
                      <strong>Customer Name:</strong>{" "}
                      {customerDetails.customerName}
                    </p>
                    <p>
                      <strong>Contact:</strong>{" "}
                      {customerDetails.customerContact}
                    </p>
                    <p>
                      <strong>Email:</strong> {customerDetails.customerEmail}
                    </p>
                    <p>
                      <strong>College:</strong>{" "}
                      {customerDetails.customerCollege}
                    </p>
                    <p>
                      <strong>Branch:</strong> {customerDetails.customerBranch}
                    </p>
                    {customerDetails.status && (
                      <p>
                        <strong>Status:</strong> {customerDetails.status}
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ color: "#666" }}>
                    No customer details added yet.
                  </p>
                )}

                <div style={{ marginTop: 8 }}>
                  {/* Hide Add/Edit button when opened from AllProjectsPage (projectId present) */}
                  {!projectId ? (
                    <>
                      {customerEditAllowed ? (
                        <button
                          className="btn btn-primary"
                          style={{ width: "30%" }}
                          onClick={handleStartEditCustomer}
                        >
                          {customerDetails
                            ? "Edit Customer Details"
                            : "Add Customer Details"}
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          style={{ width: "30%" }}
                          disabled
                        >
                          (Quotation saved — editing locked)
                        </button>
                      )}
                    </>
                  ) : null}
                </div>
              </>
            )}
          </div>
          <div>
            {/* -------------------- PAYMENTS SECTION (NEW) -------------------- */}
            <div
              style={{
                borderTop: "1px solid #eee",
                marginTop: 12,
                paddingTop: 12,
              }}
            >
              <h3 style={{ margin: "8px 0" }}>Payments</h3>

              {/* Hide the payment entry form if project is closed */}
              {!projectClosed && (
                <div
                  className="payments-section"
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    name="paymentAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    style={{ padding: 8, width: 160 }}
                  />
                  <select
                    name="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ padding: 8 }}
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                  </select>
                 <button
  className="btn btn-primary"
  onClick={handleSavePayment}
  style={{ background: "#1976d2", minWidth: "140px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
  disabled={loadingPayment}
>
  Save Payment
  {loadingPayment && <span className="loader-inline"></span>}
</button>

                   
                </div>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              {customerDetails?.payments?.length ? (
                <div>
                  {customerDetails.payments.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        borderBottom: "1px solid #f0f0f0",
                        padding: "6px 0",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <strong>₹{p.amount}</strong> —{" "}
                        {new Date(p.date).toLocaleDateString()}
                      </div>
                      <div style={{ color: "#555" }}>
                        {p.method === "cash" ? "C" : "O"} • {p.admin}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#666" }}>No payments recorded yet.</p>
              )}
            </div>
          </div>

          {/* ------------------ END PAYMENTS SECTION ------------------ */}
        </div>

        <hr />

        <div className="quotation-grid">
          {!projectClosed && (
            <div className="create-col" style={{ paddingRight: "10px" }}>
              <h2>Create Quotation</h2>

              {/* Component Search Row */}
              <div
                className="component-search-row"
                style={{
                  display: "flex",
                  gap: "40px",
                  marginBottom: "6px",
                  alignItems: "center",
                  border: "1px solid black",
                  padding: "4px",
                  borderRadius: "5px",
                }}
              >
                <div style={{ flex: 2, position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Enter Component Name"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    style={{ width: "100%", padding: "10px" }}
                  />
                  {suggestions.length > 0 && (
                    <ul className="suggestions-list">
                      {suggestions.map((s, idx) => (
                        <li
                          key={idx}
                          onClick={() => onSelectSuggestion(s)}
                          style={{
                            padding: "8px",
                            cursor: "pointer",
                            borderBottom: "1px solid #f0f0f0",
                          }}
                        >
                          <strong>{s.name}</strong> — Rs. {s.price}{" "}
                          <span style={{ color: "#666" }}>
                            (available: {s.quantity ?? 0})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div style={{ width: 100 }}>
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={searchQty}
                    onChange={(e) => setSearchQty(Number(e.target.value))}
                    style={{ width: "100%", padding: "10px" }}
                  />
                </div>

                <div style={{ width: 100 }}>
                  <input
                    type="text"
                    placeholder="Price"
                    value={selectedPrice !== "" ? `₹${selectedPrice}` : ""}
                    readOnly
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "#f5f5f5",
                    }}
                  />
                </div>

                <div style={{ minWidth: 110 }}>
                  <button
                    className="add-btn"
                    onClick={addComponent}
                    onMouseOver={(e) =>
                      (e.target.style.backgroundColor = "#1565c0")
                    }
                    onMouseOut={(e) =>
                      (e.target.style.backgroundColor = "#1976d2")
                    }
                  >
                    Add Component
                  </button>
                </div>
              </div>

              {availableStock !== null && (
                <div style={{ marginBottom: 10, color: "#555" }}>
                  Available in stock: <strong>{availableStock}</strong>
                </div>
              )}

              {/* Table of added components */}
              {selected.length > 0 && (
                <div className="table-wrapper">
                  {" "}
                  {/* ✅ NEW wrapper */}
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Total</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.map((item, i) => (
                        <tr key={i}>
                          <td>{item.name}</td>
                          <td>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => {
                                const updated = [...selected];
                                updated[i].price = Number(e.target.value) || 0;
                                setSelected(updated);
                              }}
                              style={{ width: "80px", padding: "4px" }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...selected];
                                updated[i].quantity =
                                  Number(e.target.value) || 0;
                                setSelected(updated);
                              }}
                              style={{ width: "80px", padding: "4px" }}
                            />
                          </td>
                          <td>₹{item.price * item.quantity}</td>
                          <td>
                            <button
                              onClick={() => {
                                if (window.confirm("Remove this component?")) {
                                  const updated = selected.filter(
                                    (_, idx) => idx !== i
                                  );
                                  setSelected(updated);
                                }
                              }}
                              style={{ color: "white" }}
                            >
                              ✖ Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="total">Total (Components): {totalComponents}</div>

              <div style={{ marginTop: 14 }}>
                <label>
                  Setup Charges:{" "}
                  <input
                    type="number"
                    value={setupCharges}
                    onChange={(e) => setSetupCharges(e.target.value)}
                  />
                </label>
                <br />
                <label>
                  Development Charges:{" "}
                  <input
                    type="number"
                    value={developmentCharges}
                    onChange={(e) => setDevelopmentCharges(e.target.value)}
                  />
                </label>
              </div>

              <div className="total" style={{ marginTop: 12 }}>
                Grand Total: {grandTotal}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <button
  className="btns btn btn-primary"
  style={{ width: "30%", background: "#1976d2", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
  onClick={saveQuotation}
  disabled={loadingQuotation}
>
  Save Quotation
  {loadingQuotation && <span className="loader-inline"></span>}
</button>


                  
                <button className="btns btn btn-primary" onClick={closeProject} style={{backgroundColor:"rgb(229, 57, 53)",width:"30%"}}>
                  Close Project
                </button>
              </div>
              {/* === Comments Section (requested) ===

                  - fixed-height textarea

                  - arrow image / button to save comment

                  - saved comments appear as bullet points below

              */}

              <div
                style={{
                  marginTop: 24,
                  border: "1px solid #e6e6e6",
                  borderRadius: 6,
                  padding: 12,
                }}
              >
                <h3 style={{ marginTop: 0 }}>Comments</h3>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <textarea
                    name="commentText"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    style={{
                      flex: 1,
                      minHeight: 60,
                      maxHeight: 120,
                      resize: "none",
                      padding: 8,
                    }}
                  />

                  {/* Using a simple button fallback in case image path not available.

                      Replace src with your arrow image path if available */}

<div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: 40,
    height: 40,
  }}
>
  <img
    src={sendIcon}
    alt="Save comment"
    title="Save comment"
    onClick={!loadingComments ? handleSaveComment : undefined}
    style={{
      width: 36,
      height: 36,
      cursor: loadingComments ? "not-allowed" : "pointer",
      opacity: loadingComments ? 0.5 : 1,
      objectFit: "contain",
      transition: "opacity 0.3s",
    }}
  />
  {loadingComments && (
    <span
      className="loader-inline"
      style={{
        position: "absolute",
        right: -24,
        top: "50%",
        transform: "translateY(-50%)",
      }}
    ></span>
  )}
</div>


                </div>

                <div style={{ marginTop: 12 }}>
                  {loadingComments ? (
  <div className="loader"></div>
) : comments && comments.length > 0 ? (
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
                  ) : (
                    <div style={{ color: "#666" }}>No comments yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* History / Right column */}
          <div className="history-col">
            <h2 style={{ textAlign: "center" }}>Quotation History</h2>

            {projectClosed && projectEndDate && (
              <h3 style={{ color: "crimson", textAlign: "center" }}>
                Project Closed on: {projectEndDate}
              </h3>
            )}

            {quotations.length === 0 && <p>No quotations yet.</p>}

            {quotations.map((q, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid #ddd",
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <h3 style={{ margin: "0 0 8px" }}>Quotation ({q.date})</h3>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {(q.items || []).map((item, idx) => (
                    <li key={idx}>
                      {item.name} | Qty: {item.quantity} | Rs.{" "}
                      {item.price * item.quantity}
                    </li>
                  ))}
                </ul>
                <div>Setup Charges: Rs. {q.setupCharges}</div>
                <div>Development Charges: Rs. {q.developmentCharges}</div>
                <div style={{ fontWeight: 700, marginTop: 8 }}>
                  Grand Total: Rs. {q.grandTotal}
                </div>
                <div style={{ marginTop: 8 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => downloadQuotationPDF(q)}
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            ))}

            {projectClosed && quotations.length > 0 && (
              <div style={{ marginTop: 8, textAlign: "center" }}>
                <button className="btn btn-primary" onClick={downloadInvoice}>
                  Download Invoice
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default QuotationPage;










