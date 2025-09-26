import { useNavigate } from "react-router-dom";
import Layout from "./Layout";
import "./HomePage.css"; // ✅ New CSS for responsiveness

function HomePage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="home-container">
        <h2 className="home-title">Welcome to SmartTech Solutions</h2>
        <p className="home-text">
          Select an option from the left sidebar to continue.
        </p>

        {/* Optional call-to-action button for quick navigation */}
        <button
          className="home-btn"
          onClick={() => navigate("/all-projects")}
        >
          View All Projects
        </button>
      </div>
    </Layout>
  );
}

export default HomePage;
