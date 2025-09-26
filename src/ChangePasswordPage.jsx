import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ChangePasswordPage.css";

const BASE_URL = "https://smarttechsolutions-4df8.onrender.com";
 

function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [animate, setAnimate] = useState(false);
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  useEffect(() => {
    // trigger title animation on mount
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${BASE_URL}/api/admins/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, oldPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Password change failed");
        return;
      }

      localStorage.setItem("lastPasswordChange", new Date().toISOString());
      alert("✅ Password changed successfully!");
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Error changing password");
    }
  };

  return (
    <div className="change-wrapper">
      <h1 className={`company-title ${animate ? "animate" : ""}`}>
        Smart<span>Tech</span> Solutions
      </h1>

      <div className="change-card">
        <h2 className="change-heading">Change Password</h2>
        <form onSubmit={handleChangePassword} className="change-form">
          <input
            type="password"
            className="change-input"
            placeholder="Current Password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="change-input"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <button type="submit" className="change-button">
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordPage;

