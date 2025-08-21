import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import App from "./App";
import store from "./store/ReduxStore";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function Root() {
  // Initialize theme from localStorage or default to dark (based on your .App CSS)
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  // Apply theme to html element and persist in localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Toggle between dark and light themes
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<App toggleTheme={toggleTheme} />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

ReactDOM.render(<Root />, document.getElementById("root"));
