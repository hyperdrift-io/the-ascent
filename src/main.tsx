import React from "react";
import ReactDOM from "react-dom/client";
import { CitizenGame } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <CitizenGame />
  </React.StrictMode>,
);
