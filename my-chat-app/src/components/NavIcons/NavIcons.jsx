import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import ProfileAvatar from "../ProfileAvatar";
import "./NavIcons.css";

const NavIcons = ({ isMobileTopBar = false }) => {
  const location = useLocation();
  const user = useSelector((state) => state.authReducer.authData?.user);

  const isActive = (path) => {
    return (
      location.pathname === path ||
      (path === "/home" && location.pathname === "/")
    );
  };

  // If it's for mobile top bar, only show profile avatar
  if (isMobileTopBar) {
    return (
      <div className="navIcons mobile-top-bar-profile">
        <ProfileAvatar size={44} showOnlineIndicator={true} showMenu={true} />
      </div>
    );
  }

  return (
    <div className="navIcons">
      <Link to="/home" className={isActive("/home") ? "active" : ""}>
        <i className="fa-solid fa-house icon_bg"></i>
      </Link>
      <Link to="/chat" className={isActive("/chat") ? "active" : ""}>
        <i className="fa-solid fa-message icon_bg"></i>
      </Link>
      <Link
        to="/pages"
        className={
          isActive("/pages") || location.pathname.startsWith("/page/")
            ? "active"
            : ""
        }
      >
        <i className="fa-solid fa-flag icon_bg"></i>
      </Link>
      <Link
        to="/groups"
        className={
          isActive("/groups") || location.pathname.startsWith("/group/")
            ? "active"
            : ""
        }
      >
        <i className="fa-solid fa-users icon_bg"></i>
      </Link>
      <Link to="/friend" className={isActive("/friend") ? "active" : ""}>
        <i className="fa-solid fa-user-group icon_bg"></i>
      </Link>
      <Link
        to={`/profile/${user?.ID || 1}`}
        className={`profile-link ${
          location.pathname.startsWith("/profile") ? "active" : ""
        }`}
      >
        <i className="fa-solid fa-user icon_bg"></i>
      </Link>
    </div>
  );
};

export default NavIcons;
