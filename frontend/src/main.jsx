import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

function render(Component) {
  root.render(
    <React.StrictMode>
      <Component />
    </React.StrictMode>,
  );
}

if (import.meta.env.DEV && window.location.pathname === "/__fixtures/charts") {
  import("./dev/ChartFixtureGallery").then(({ default: ChartFixtureGallery }) => {
    render(ChartFixtureGallery);
  });
} else {
  render(App);
}
