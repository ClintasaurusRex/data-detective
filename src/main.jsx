import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ProgressSession } from "./components/ProgressSession.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ProgressSession />
  </StrictMode>,
);
