import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ResetPasswordPage.css";

const BASE_URL = "http://localhost:5000";

function ResetPasswordPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [animate, setAnimate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  const fetchAdminEmail = async () => {
    const res = await fetch(
      `${BASE_URL}/api/admins/email/${encodeURIComponent(username)}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "User not found");
    setEmail(data.email);
    return data.email;
  };

  const sendOtp = async () => {
    try {
      await fetchAdminEmail();
      const res = await fetch(`${BASE_URL}/api/admins/send-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setOtpSent(true);
      alert(`OTP sent to ${email}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const verifyOtpAndReset = async () => {
    try {
      const verifyRes = await fetch(`${BASE_URL}/api/admins/verify-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, otp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Invalid OTP");

      const resetRes = await fetch(`${BASE_URL}/api/admins/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, newPassword }),
      });
      const resetData = await resetRes.json();
      if (!resetRes.ok) throw new Error(resetData.error || "Reset failed");

      alert("Password reset successful!");
      navigate("/login");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="reset-container">
      {/* ✅ Add 'animate' class so gradient text fades in */}
      
      <h1 className={`company-title  ${animate ? "animate" : ""}` }>
        Smart<span>Tech</span> Solutions
    
      </h1>
     
      <div className="reset-card">
        <h2 className="reset-heading">Reset Password</h2>

        {!otpSent ? (
          <>
            <input
              className="reset-input"
              type="text"
              placeholder="Enter Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button className="btn-primary" onClick={sendOtp}>
              Send OTP to Admin Email
            </button>
          </>
        ) : (
          <>
            <input
              className="reset-input"
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <input
              className="reset-input"
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button className="btn-primary" onClick={verifyOtpAndReset}>
              Verify & Reset
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
