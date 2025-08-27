import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./NavIcons.css";

const NavIcons = () => {
  const location = useLocation();

  const isActive = (path) => {
    return (
      location.pathname === path ||
      (path === "/home" && location.pathname === "/")
    );
  };

  return (
    <div className="navIcons">
      <Link to="/home" className={isActive("/home") ? "active" : ""}>
        <i className="fa-solid fa-house icon_bg"></i>
      </Link>
      <Link to="/chat" className={isActive("/chat") ? "active" : ""}>
        <i className="fa-solid fa-message icon_bg"></i>
      </Link>
      <Link to="/friend" className={isActive("/friend") ? "active" : ""}>
        <i className="fa-solid fa-user-group icon_bg"></i>
      </Link>
      <Link
        to="/profile/1"
        className={location.pathname.startsWith("/profile") ? "active" : ""}
      >
        <i className="fa-solid fa-user icon_bg"></i>
      </Link>
    </div>
  );
};

export default NavIcons;
