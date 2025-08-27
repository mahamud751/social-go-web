import React from "react";
import "./ThemeToggle.css";

const ThemeToggle = ({ toggleTheme, theme }) => {
  const isDark = theme === "dark";

  return (
    <div className="theme-toggle-wrapper">
      <div className="theme-toggle-container">
        <div className="theme-toggle-icon-wrapper" onClick={toggleTheme}>
          <i
            className={`fa-solid ${
              isDark ? "fa-sun" : "fa-moon"
            } theme-toggle-icon`}
          ></i>
        </div>
      </div>
    </div>
  );
};

export default ThemeToggle;
