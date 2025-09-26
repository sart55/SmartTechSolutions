import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

const BASE_URL = "https://smarttechsolutions-4df8.onrender.com";
const SESSION_DURATION = 30 * 60 * 1000; // 15 minutes in ms

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [animate, setAnimate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BASE_URL}/api/admins/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Login failed");
        return;
      }

      // ✅ Save session info with expiry time
      const expiresAt = Date.now() + SESSION_DURATION;
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("username", data.username);
      localStorage.setItem("lastPasswordChange", data.lastPasswordChange);
      localStorage.setItem("expiresAt", expiresAt.toString());

      // Password-age check
      const lastChange = new Date(data.lastPasswordChange);
      const diffDays =
        (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays >= 15) navigate("/change-password");
      else navigate("/");
    } catch (err) {
      console.error(err);
      alert("Error logging in");
    }
  };

  return (
    <div className="login-container">
      <h1 className={`company-title ${animate ? "animate" : ""}`}>
        Smart<span>Tech</span> Solutions
      </h1>

      <div className="login-card">
        <h2>Admin Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">
            Login
          </button>
        </form>
        <button
          className="btn-link"
          onClick={() => navigate("/reset-password")}
        >
          Forgot Password?
        </button>
      </div>
    </div>
  );
}

export default LoginPage;

