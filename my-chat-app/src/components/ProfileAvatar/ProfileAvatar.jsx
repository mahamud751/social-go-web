import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import {
  Avatar,
  Badge,
  Tooltip,
  Menu,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Zoom,
} from "@mui/material";
import { ExitToApp as LogoutIcon } from "@mui/icons-material";
import { logout } from "../../actions/AuthAction";
import "./ProfileAvatar.css";

const ProfileAvatar = ({
  size = 40,
  showOnlineIndicator = true,
  onClick,
  showMenu = false,
}) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

  const handleClick = (event) => {
    if (onClick) {
      onClick(event);
    } else if (showMenu) {
      setAnchorEl(event.currentTarget);
    } else {
      navigate(`/profile/${user?.ID || 1}`);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogOut = () => {
    handleClose();
    setTimeout(() => {
      dispatch(logout());
    }, 300);
  };

  const handleProfileClick = () => {
    handleClose();
    navigate(`/profile/${user?.ID}`);
  };

  return (
    <>
      <Tooltip title="Profile" arrow>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          badgeContent={
            showOnlineIndicator ? (
              <div className="online-indicator-small"></div>
            ) : null
          }
        >
          <Avatar
            src={
              user?.ProfilePicture ||
              "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
            }
            alt={user?.Username}
            onClick={handleClick}
            className="profile-avatar-component"
            sx={{
              width: size,
              height: size,
              cursor: "pointer",
              border: "2px solid var(--home-menu-accent, #667eea)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                transform: "scale(1.1)",
                boxShadow:
                  "0 0 20px var(--home-menu-glow, rgba(102, 126, 234, 0.5))",
              },
            }}
          />
        </Badge>
      </Tooltip>

      {/* User Menu */}
      {showMenu && (
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          className="profile-avatar-menu"
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          sx={{
            "& .MuiPaper-root": {
              backgroundColor: isDarkTheme ? "#2c2c2c" : "#ffffff",
              border: isDarkTheme ? "1px solid #404040" : "1px solid #e0e0e0",
              borderRadius: "16px",
              boxShadow: isDarkTheme
                ? "0 8px 32px rgba(0, 0, 0, 0.3)"
                : "0 8px 32px rgba(0, 0, 0, 0.1)",
              backdropFilter: "blur(20px)",
              minWidth: "200px",
              mt: 1,
            },
          }}
        >
          <Zoom in={open} style={{ transitionDelay: "100ms" }}>
            <ListItem className="menu-item">
              <ListItemButton
                onClick={handleProfileClick}
                className="menu-button-item"
                sx={{
                  padding: "12px 16px !important",
                  transition:
                    "all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important",
                  borderRadius: "8px !important",
                  margin: "4px 8px !important",
                  "&:hover": {
                    backgroundColor: isDarkTheme ? "#383838" : "#f5f5f5",
                    transform: "translateX(8px)",
                  },
                }}
              >
                <ListItemIcon>
                  <Avatar
                    src={
                      user?.ProfilePicture ||
                      "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                    }
                    sx={{ width: 24, height: 24 }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={user?.Username}
                  sx={{
                    "& .MuiListItemText-primary": {
                      color: isDarkTheme ? "#ffffff" : "#000000",
                      textTransform: "capitalize",
                      fontWeight: 600,
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          </Zoom>

          <Divider
            sx={{
              backgroundColor: isDarkTheme ? "#404040" : "#e0e0e0",
            }}
          />

          <Zoom in={open} style={{ transitionDelay: "200ms" }}>
            <ListItem className="menu-item">
              <ListItemButton
                onClick={handleLogOut}
                className="menu-button-item logout"
                sx={{
                  padding: "12px 16px !important",
                  transition:
                    "all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important",
                  borderRadius: "8px !important",
                  margin: "4px 8px !important",
                  "&:hover": {
                    backgroundColor: "rgba(255, 120, 117, 0.1) !important",
                    transform: "translateX(8px)",
                  },
                }}
              >
                <ListItemIcon>
                  <LogoutIcon
                    sx={{
                      color: isDarkTheme ? "#ff7875" : "#d32f2f",
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Log Out"
                  sx={{
                    "& .MuiListItemText-primary": {
                      color: isDarkTheme ? "#ff7875" : "#d32f2f",
                      fontWeight: 600,
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          </Zoom>
        </Menu>
      )}
    </>
  );
};

export default ProfileAvatar;
