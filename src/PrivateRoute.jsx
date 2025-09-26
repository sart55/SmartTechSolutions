import { Navigate } from "react-router-dom";

function PrivateRoute({ children }) {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  const lastPasswordChange = localStorage.getItem("lastPasswordChange");

  // Force password change every 15 days
  if (isAuthenticated && lastPasswordChange) {
    const lastChange = new Date(lastPasswordChange);
    const now = new Date();
    const diffDays = (now - lastChange) / (1000 * 60 * 60 * 24);

    if (diffDays >= 15) {
      return <Navigate to="/change-password" replace />;
    }
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default PrivateRoute;
