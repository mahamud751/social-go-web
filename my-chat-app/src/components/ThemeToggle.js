import React from "react";
import { UilSun, UilMoon } from "@iconscout/react-unicons";

const ThemeToggle = ({ toggleTheme, theme }) => {
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      style={{
        backgroundColor: isDark ? "#2a2b2c" : "#f0f0f0",
        color: isDark ? "#ffd700" : "#0066cc",
        border: "none",
        borderRadius: "50%",
        padding: "8px",
        cursor: "pointer",
        position: "absolute",
        top: "10px",
        right: "10px",
      }}
    >
      {isDark ? <UilSun size={20} /> : <UilMoon size={20} />}
    </button>
  );
};

export default ThemeToggle;
