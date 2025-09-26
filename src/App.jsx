import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import HomePage from "./HomePage";
import QuotationPage from "./QuotationPage";
import TempQuotationPage from "./TempQuotationPage";
import AllProjectsPage from "./AllProjectsPage";
import QuotationHistoryPage from "./QuotationHistoryPage";
import AdminPage from "./AdminPage";
import CustomerDetailsPage from "./CustomerDetailsPage";
import ComponentsHistory from "./ComponentsHistory";

// Authentication pages
import LoginPage from "./LoginPage";
import ResetPasswordPage from "./ResetPasswordPage";
import ChangePasswordPage from "./ChangePasswordPage";
import PrivateRoute from "./PrivateRoute";

const SessionWatcher = ({ children }) => {
  const navigate = useNavigate();
  useEffect(() => {
    const checkExpiry = () => {
      const expiresAt = parseInt(localStorage.getItem("expiresAt") || "0", 10);
      if (localStorage.getItem("isAuthenticated") && Date.now() > expiresAt) {
        // ✅ Session expired – clear and redirect
        localStorage.clear();
        navigate("/login");
      }
    };
    checkExpiry();
    const id = setInterval(checkExpiry, 60000); // check every minute
    return () => clearInterval(id);
  }, [navigate]);
  return children;
};

function App() {
  return (
    <Router>
      <SessionWatcher>
        <Routes>
          {/* 🔓 Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          {/* 🔒 Protected routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <HomePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/CustomerDetailsPage"
            element={
              <PrivateRoute>
                <CustomerDetailsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/quotation/new"
            element={
              <PrivateRoute>
                <QuotationPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/quotation/:projectId"
            element={
              <PrivateRoute>
                <QuotationPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/quotation-history/:projectId"
            element={
              <PrivateRoute>
                <QuotationHistoryPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/temp-quotation"
            element={
              <PrivateRoute>
                <TempQuotationPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/all-projects"
            element={
              <PrivateRoute>
                <AllProjectsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/AdminPage"
            element={
              <PrivateRoute>
                <AdminPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/ComponentsHistory"
            element={
              <PrivateRoute>
                <ComponentsHistory />
              </PrivateRoute>
            }
          />
        </Routes>
      </SessionWatcher>
    </Router>
  );
}

export default App;
