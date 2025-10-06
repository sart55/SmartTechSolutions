// server.js
import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import fs from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import dotenv from "dotenv";
dotenv.config();



// ---------- Service account ----------
let serviceAccount;
if (process.env.SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  serviceAccount = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")
  );
} else {
  // expect serviceAccountKey.json in project root
  serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));
}

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const app = express();
app.use(cors({
  origin: "*",          // or your frontend domain
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", cors());
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

app.use(express.json());

// ---------- Helpers ----------
// Safe version of docIdFromName
// Always-safe version
// Always-safe version (prevents .toLowerCase crash)
const docIdFromName = (name) => {
  try {
    if (name === undefined || name === null) return "unnamed";
    if (typeof name !== "string") {
      // Try to stringify object safely
      if (typeof name === "object") {
        name = JSON.stringify(name);
      } else {
        name = String(name);
      }
    }
    return name.trim().toLowerCase().replace(/\s+/g, "-");
  } catch (err) {
    console.error("❌ docIdFromName failed:", err, "for name:", name);
    return "invalid-name";
  }
};


const mergeContributors = (existing = [], incoming = []) => {
  const map = {};

  [...existing, ...incoming].forEach((c) => {
    const rawName = c?.name ?? "";
    const name = String(rawName);

    if (!name.trim()) {
      console.warn("⚠️ Contributor skipped (invalid name):", c);
      return;
    }

    if (!map[name]) {
      map[name] = { name, date: null };
    }

    if (c?.date) {
      map[name].date = c.date; // overwrite with latest
    }
  });

  return Object.values(map);
};



// =====================================================
// ================  Admins API  =======================
// =====================================================

// ✅ Ensure collection exists (sample admin account)
(async () => {
  const snapshot = await db.collection("admins").limit(1).get();
  if (snapshot.empty) {
    await db.collection("admins").add({
      username: "admin",
      password: "admin123", // ⚠️ in production: hash this
      phoneNo: "+911234567890", // replace with valid test phone number
      lastPasswordChange: new Date().toISOString(),
    });
    console.log("✅ Default admin created: username=admin, password=admin123");
  }
})();

// Login with username + password
app.post("/api/admins/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const snapshot = await db
      .collection("admins")
      .where("username", "==", username)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const adminDoc = snapshot.docs[0];
    const admin = adminDoc.data();

    if (admin.password !== password) {
      return res.status(401).json({ error: "Invalid password" });
    }

    res.json({
      success: true,
      username: admin.username,
      phoneNo: admin.phoneNo,
      lastPasswordChange: admin.lastPasswordChange,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get admin phone by username
app.get("/api/admins/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const snapshot = await db
      .collection("admins")
      .where("username", "==", username)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const admin = snapshot.docs[0].data();
    res.json({ phoneNo: admin.phoneNo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset password
app.post("/api/admins/reset-password", async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    if (!username || !newPassword) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const snapshot = await db
      .collection("admins")
      .where("username", "==", username)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const adminDoc = snapshot.docs[0];
    await db.collection("admins").doc(adminDoc.id).update({
      password: newPassword,
      lastPasswordChange: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change password
app.post("/api/admins/change-password", async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const snapshot = await db
      .collection("admins")
      .where("username", "==", username)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const adminDoc = snapshot.docs[0];
    const admin = adminDoc.data();

    if (admin.password !== oldPassword) {
      return res.status(401).json({ error: "Old password incorrect" });
    }

    await db.collection("admins").doc(adminDoc.id).update({
      password: newPassword,
      lastPasswordChange: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// ================  Components API  ===================
// =====================================================
app.get("/api/components", async (req, res) => {
  try {
    const snapshot = await db.collection("components").get();
    const components = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(components);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/components", async (req, res) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (const comp of payload) {
      if (!comp.name) continue;
      const id = docIdFromName(comp.name);
      const docRef = db.collection("components").doc(id);
      const snap = await docRef.get();

      let finalPrice = comp.price ?? 0;
      let finalQuantity = comp.quantity ?? 0;

      if (snap.exists) {
        const existing = snap.data();
        finalPrice = comp.price ?? existing.price ?? 0;
        finalQuantity = (existing.quantity || 0) + (comp.quantity || 0);

        const updatedContributors = mergeContributors(
          existing.contributors || [],
          comp.contributors || []
        );

        await docRef.set(
          {
            name: comp.name,
            price: finalPrice,
            quantity: finalQuantity,
            contributors: updatedContributors,
          },
          { merge: true }
        );
        results.push({ id, name: comp.name, merged: true });
      } else {
        await docRef.set({
          name: comp.name,
          price: finalPrice,
          quantity: finalQuantity,
          contributors: comp.contributors || [],
        });
        results.push({ id, name: comp.name, merged: false });
      }

      await db.collection("componentHistory").add({
        name: comp.name,
        quantity: comp.quantity,
        price: comp.price ?? finalPrice ?? 0,
        addedBy: comp.contributors?.[0]?.name || "Admin",
        date: comp.contributors?.[0]?.date || new Date().toISOString(),
        edit: false,
      });
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/components/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const docRef = db.collection("components").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Not found" });

    const latestData = snap.data();

    if (updates.contributors) {
      updates.contributors = mergeContributors(
        latestData.contributors || [],
        updates.contributors
      );
    }

    const finalPrice = updates.price ?? latestData.price ?? 0;
    const finalQuantity =
      updates.quantity !== undefined ? updates.quantity : latestData.quantity;

    await docRef.set(
      { ...updates, price: finalPrice, quantity: finalQuantity },
      { merge: true }
    );

    if (updates.quantity !== undefined) {
      if (updates.quantity !== latestData.quantity) {
        await db.collection("componentHistory").add({
          name: updates.name || latestData.name,
          quantity: `${latestData.quantity} > ${updates.quantity} (E)`,
          price: finalPrice,
          addedBy: updates.contributors?.slice(-1)[0]?.name || "Admin",
          date:
            updates.contributors?.slice(-1)[0]?.date ||
            new Date().toISOString(),
          edit: true,
        });
      } else {
        await db.collection("componentHistory").add({
          name: updates.name || latestData.name,
          quantity: updates.quantity,
          price: finalPrice,
          addedBy: updates.contributors?.slice(-1)[0]?.name || "Admin",
          date:
            updates.contributors?.slice(-1)[0]?.date ||
            new Date().toISOString(),
          edit: false,
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/components/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("components").doc(id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/components-history", async (req, res) => {
  try {
    const snapshot = await db
      .collection("componentHistory")
      .orderBy("date", "desc")
      .get();
    const history = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/update-stock", async (req, res) => {
  try {
    const { usedItems } = req.body;
    if (!Array.isArray(usedItems)) {
      return res.status(400).json({ error: "usedItems must be an array" });
    }

    for (const item of usedItems) {
      const id = typeof item.name === "string"
  ? item.name.toLowerCase()
  : String(item.name || "").toLowerCase();

      const ref = db.collection("components").doc(id);
      const snap = await ref.get();
      if (snap.exists) {
        const data = snap.data();
        const newQty = (data.quantity || 0) - (item.quantity || 0);
        await ref.set({ quantity: newQty >= 0 ? newQty : 0 }, { merge: true });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// ================  Customers API  ====================
// =====================================================
// ➕ Add this below Customers API in server.js
// =====================================================
// ================  Customers API  ====================
// =====================================================

// ➕ Add a payment entry for a specific customer
app.post("/api/customers/:id/payments", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method, adminName } = req.body;

    // Basic validation
    if (!amount || !method || !adminName) {
      return res
        .status(400)
        .json({ error: "Amount, method, and admin name required" });
    }

    const customerRef = db.collection("customers").doc(id);
    const snap = await customerRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const newPayment = {
      amount: Number(amount),
      method,                   // "cash" or "online"
      admin: adminName,         // admin name/initials
      date: new Date().toISOString()
    };

    await customerRef.update({
      payments: FieldValue.arrayUnion(newPayment)
    });

    res.json({ success: true, payment: newPayment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➕ Delete all payment history for a customer
// ➕ Delete all payment history for a customer
app.delete("/api/customers/:id/payments", async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection("customers").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Customer not found" });

    // Remove the entire payments array and set a deleted flag
    await ref.update({
      payments: [],
      paymentsDeleted: true,        // ✅ add this line
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting payments:", err);
    res.status(500).json({ error: err.message });
  }
});



// ➕ Create or update a customer (merge)
app.post("/api/customers", async (req, res) => {
  try {
    const data = req.body;
    if (!data.projectName) {
      return res.status(400).json({ error: "Project name is required" });
    }
    const id = data.projectId ? data.projectId : docIdFromName(data.projectName);
    await db.collection("customers").doc(id).set(data, { merge: true });
    res.json({ id, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➕ Get a single customer by ID
app.get("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("customers").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➕ Update a customer (partial update)
app.patch("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await db.collection("customers").doc(id).set(updates, { merge: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =====================================================
// ================  Projects API  =====================
// =====================================================
app.get("/api/projects", async (req, res) => {
  try {
    const snapshot = await db.collection("customers").get();
    const projects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/projects/:id/history", async (req, res) => {
  try {
    const { id } = req.params;

    const customerDoc = await db.collection("customers").doc(id).get();
    if (!customerDoc.exists) {
      return res.status(404).json({ error: "Customer not found" });
    }
    const customer = { id: customerDoc.id, ...customerDoc.data() };

    const snapshot = await db
      .collection("quotations")
      .where("projectId", "==", id)
      .get();

    const quotations = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ customer, quotations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// ================  Quotations API  ===================
// =====================================================
app.post("/api/quotations", async (req, res) => {
  try {
    const data = req.body;
    if (!data.date) {
      data.date = new Date().toISOString();
    }
    const ref = await db.collection("quotations").add(data);
    res.json({ id: ref.id, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/quotations/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const snapshot = await db
      .collection("quotations")
      .where("projectId", "==", projectId)
      .get();

    const quotations = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(quotations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comments
app.post("/api/comments", async (req, res) => {
  const { projectId, text, admin, date } = req.body;
  if (!projectId || !text || !admin) {
    return res.status(400).json({ error: "projectId, text and admin required" });
  }

  const docRef = await db.collection("comments").add({
    projectId,
    text,
    admin,                          // ✅ store admin name
    date: date || new Date().toISOString(),
  });

  res.json({ id: docRef.id, projectId, text, admin, date });
});

// DELETE all comments for a project
// server.js
// server.js
app.delete("/api/comments/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const snapshot = await db.collection("comments")
      .where("projectId", "==", projectId)
      .get();

    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // Return success + count
    res.json({ success: true, deleted: snapshot.size });
  } catch (err) {
    console.error("Error deleting comments:", err);
    res.status(500).json({ error: err.message });
  }
});




// GET /api/comments/:projectId
app.get("/api/comments/:projectId", async (req, res) => {
  const { projectId } = req.params;
  const snapshot = await db.collection("comments")
  .where("projectId", "==", projectId)
  .orderBy("date", "asc")   // or "desc" for newest first
  .get();


  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(items);
});

// await db.collection("comments")
//     .where("projectId", "==", projectId)
//     .orderBy("date", "asc")
//     .get();

// =====================================================
// ================  Root  =============================
// =====================================================
app.get("/", (req, res) =>
  res.send("✅ Backend server is running...")
);

// =====================================================
// ================  Start  ============================
// =====================================================
const PORT = process.env.PORT || 5000;

// simple in-memory store for demo; use a DB/Redis in production
const emailOtpStore = {};

// Gmail transporter (use an App Password if 2FA is on)
const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// console.log("GMAIL_USER:", process.env.GMAIL_USER);
// console.log("GMAIL_APP_PASSWORD:", process.env.GMAIL_APP_PASSWORD);

// get admin email by username
app.get("/api/admins/email/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const snap = await db.collection("admins")
      .where("username", "==", username).get();

    if (snap.empty) return res.status(404).json({ error: "Admin not found" });
    const admin = snap.docs[0].data();
    if (!admin.mail) return res.status(400).json({ error: "No email on file" });
    res.json({ email: admin.mail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// send email OTP
app.post("/api/admins/send-email-otp", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });

    const snap = await db.collection("admins")
      .where("username", "==", username).get();
    if (snap.empty) return res.status(404).json({ error: "Admin not found" });

    const adminDoc = snap.docs[0];
    const admin = adminDoc.data();
    if (!admin.mail) return res.status(400).json({ error: "No email on file" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    emailOtpStore[username] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    await mailTransporter.sendMail({
      from: "smarttechsolutions81@gmail.com",
      to: admin.mail,
      subject: "Your Password Reset OTP",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// verify email OTP
app.post("/api/admins/verify-email-otp", async (req, res) => {
  try {
    const { username, otp } = req.body;
    const record = emailOtpStore[username];
    if (!record) return res.status(400).json({ error: "OTP not requested" });
    if (Date.now() > record.expires) return res.status(400).json({ error: "OTP expired" });
    if (record.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
    delete emailOtpStore[username];
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);






