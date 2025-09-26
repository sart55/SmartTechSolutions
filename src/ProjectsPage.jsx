import { useNavigate } from "react-router-dom";
import { useState } from "react";

function ProjectsPage() {
  const navigate = useNavigate();

  // Example projects data
  const [projects] = useState([
    { id: 1, name: "Website Redesign", lead: "9876543210", status: "current" },
    { id: 2, name: "College App", lead: "9123456780", status: "closed" },
    { id: 3, name: "E-Commerce Store", lead: "9001122334", status: "current" },
  ]);

  const goToProject = (project) => {
    navigate(`/quotation/${project.id}`, { state: { project } });
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" , backgroundColor:"black"}}>
      <h1>All Projects</h1>

      {/* Current Projects */}
      <div style={{ marginBottom: "15px" }}>
        <h3>Current Projects</h3>
        <ul>
          {projects
            .filter((p) => p.status === "current")
            .map((p) => (
              <li
                key={p.id}
                style={{ cursor: "pointer", marginBottom: "5px" }}
                onClick={() => goToProject(p)}
              >
                {p.name} ({p.lead})
              </li>
            ))}
        </ul>
      </div>

      {/* Closed Projects */}
      <div>
        <h3>Closed Projects</h3>
        <ul>
          {projects
            .filter((p) => p.status === "closed")
            .map((p) => (
              <li
                key={p.id}
                style={{
                  cursor: "pointer",
                  marginBottom: "5px",
                  color: "gray",
                }}
                onClick={() => goToProject(p)}
              >
                {p.name} ({p.lead})
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

export default ProjectsPage;
