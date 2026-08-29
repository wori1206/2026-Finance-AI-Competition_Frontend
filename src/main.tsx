import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import CheckumaitApp from "./app/checkumait-app";
import "./app/globals.css";
import "./app/semantic-colors.css";

const container = document.getElementById("root");
if (!container) throw new Error("#root 를 찾지 못했습니다");

createRoot(container).render(
  <StrictMode>
    <CheckumaitApp />
  </StrictMode>,
);
