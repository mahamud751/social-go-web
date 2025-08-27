import {
  Chat as ChatIcon,
  Group as GroupIcon,
  Home as HomeIcon,
  ExitToApp as LogoutIcon,
  Menu as MenuIcon,
  Message as MessageIcon,
  PeopleAlt as PeopleAltIcon,
  PersonAdd as PersonAddIcon,
  School as SchoolIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Badge,
  Box,
  Divider,
  Fade,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  Tooltip,
  Typography,
  Zoom,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { logout } from "../../actions/AuthAction";
import "./HomeMenu.css";

const HomeMenu = ({ location }) => {
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeItem, setActiveItem] = useState(location || "home");
  const [isAnimating, setIsAnimating] = useState(false);

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

  const { user } = useSelector((state) => state.authReducer.authData);
  const admin = user?.IsAdmin;
  const serverPublic = process.env.REACT_APP_PUBLIC_FOLDER;
  const dispatch = useDispatch();

  // Initialize animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
    setIsAnimating(true);
  };

  const handleCloseUserMenu = () => {
    setIsAnimating(false);
    setTimeout(() => setAnchorElUser(null), 200);
  };

  const handleLogOut = () => {
    setIsAnimating(true);
    setTimeout(() => {
      dispatch(logout());
    }, 300);
  };

  const handleItemClick = (itemName) => {
    setActiveItem(itemName);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  // Menu items configuration
  const menuItems = [
    {
      id: "home",
      label: "Feed",
      path: "/",
      icon: <HomeIcon />,
      color: "var(--home-menu-accent)",
    },
    {
      id: "find-friends",
      label: "Find Friends",
      path: "/friend",
      icon: <PersonAddIcon />,
      color: "var(--home-menu-primary)",
    },
    {
      id: "friend-request",
      label: "Friend Request",
      path: "/friend-request",
      icon: <PeopleAltIcon />,
      color: "var(--home-menu-success)",
    },
    {
      id: "add-messenger",
      label: "Add Messenger",
      path: "/addMessenger",
      icon: <MessageIcon />,
      color: "var(--home-menu-info)",
    },
    {
      id: "messenger",
      label: "Messenger",
      path: "/chat",
      icon: <ChatIcon />,
      color: "var(--home-menu-warning)",
    },
  ];

  const shortcuts = [
    {
      id: "talkjs",
      label: "Talk.js",
      url: "https://www.facebook.com/groups/talkjs.net",
      icon: <SchoolIcon />,
    },
    {
      id: "cse-jobs",
      label: "CSE/EEE/IT Jobs in Bangladesh",
      url: "https://www.facebook.com/groups/161616437580654",
      icon: <GroupIcon />,
    },
  ];

  return (
    <>
      {/* Mobile Navigation */}
      <div className={`navbar_lg ${isDarkTheme ? "dark" : "light"}`}>
        <Fade in={isVisible} timeout={600}>
          <div className="mobile-header">
            <div className="mobile-header-content">
              <Tooltip title="Open Menu" arrow>
                <IconButton
                  className="menu-button"
                  data-bs-toggle="offcanvas"
                  data-bs-target="#offcanvasExample"
                  aria-controls="offcanvasExample"
                  sx={{
                    color: "var(--home-menu-text)",
                    "&:hover": {
                      backgroundColor: "var(--home-menu-hover-bg)",
                      transform: "scale(1.1)",
                    },
                  }}
                >
                  <MenuIcon fontSize="large" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Profile Menu" arrow>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  badgeContent={<div className="online-indicator-small"></div>}
                >
                  <Avatar
                    src={
                      user?.ProfilePicture ||
                      "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                    }
                    alt={user?.Username}
                    onClick={handleOpenUserMenu}
                    className="profile-avatar mobile"
                    sx={{
                      width: 40,
                      height: 40,
                      cursor: "pointer",
                      border: "2px solid var(--home-menu-accent)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        transform: "scale(1.1)",
                        boxShadow: "0 0 20px var(--home-menu-glow)",
                      },
                    }}
                  />
                </Badge>
              </Tooltip>
            </div>

            {/* Enhanced User Menu */}
            <Menu
              anchorEl={anchorElUser}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
              className="user-menu"
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              sx={{
                "& .MuiPaper-root": {
                  backgroundColor: "var(--home-menu-card-bg)",
                  border: "1px solid var(--home-menu-border)",
                  borderRadius: "16px",
                  boxShadow: "var(--home-menu-shadow)",
                  backdropFilter: "blur(20px)",
                  minWidth: "200px",
                  mt: 1,
                },
              }}
            >
              {location !== "profilePage" && (
                <Zoom
                  in={Boolean(anchorElUser)}
                  style={{ transitionDelay: "100ms" }}
                >
                  <ListItem className="menu-item">
                    <Link
                      to={`/profile/${user?.ID}`}
                      className="menu-link"
                      onClick={handleCloseUserMenu}
                    >
                      <ListItemButton className="menu-button-item">
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
                              color: "var(--home-menu-text)",
                              textTransform: "capitalize",
                              fontWeight: 600,
                            },
                          }}
                        />
                      </ListItemButton>
                    </Link>
                  </ListItem>
                </Zoom>
              )}

              <Divider sx={{ backgroundColor: "var(--home-menu-border)" }} />

              <Zoom
                in={Boolean(anchorElUser)}
                style={{ transitionDelay: "200ms" }}
              >
                <ListItem className="menu-item">
                  <ListItemButton
                    onClick={handleLogOut}
                    className="menu-button-item logout"
                  >
                    <ListItemIcon>
                      <LogoutIcon sx={{ color: "var(--home-menu-error)" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Log Out"
                      sx={{
                        "& .MuiListItemText-primary": {
                          color: "var(--home-menu-error)",
                          fontWeight: 600,
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              </Zoom>
            </Menu>
          </div>
        </Fade>

        {/* Enhanced Offcanvas */}
        <div
          className={`offcanvas offcanvas-start ${
            isDarkTheme ? "dark" : "light"
          }`}
          tabIndex={-1}
          id="offcanvasExample"
          aria-labelledby="offcanvasExampleLabel"
        >
          <div className="offcanvas-body">
            <Box className="offcanvas-content">
              <nav aria-label="main navigation">
                <List className="nav-list">
                  {menuItems.map((item, index) => (
                    <Zoom
                      in={true}
                      key={item.id}
                      style={{ transitionDelay: `${index * 100}ms` }}
                    >
                      <ListItem className="nav-item">
                        <Link
                          to={item.path}
                          className="nav-link"
                          onClick={() => handleItemClick(item.id)}
                        >
                          <ListItemButton
                            className={`nav-button ${
                              activeItem === item.id ? "active" : ""
                            }`}
                          >
                            <ListItemIcon className="nav-icon">
                              {item.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={item.label}
                              sx={{
                                "& .MuiListItemText-primary": {
                                  color: "var(--home-menu-text)",
                                  fontWeight:
                                    activeItem === item.id ? 700 : 500,
                                },
                              }}
                            />
                          </ListItemButton>
                        </Link>
                      </ListItem>
                    </Zoom>
                  ))}
                </List>
              </nav>
            </Box>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className={`navbar_sm ${isDarkTheme ? "dark" : "light"}`}>
        <Fade in={isVisible} timeout={800}>
          <Box className="sidebar-container" style={{ marginTop: "80px" }}>
            {/* Enhanced Profile Section */}
            {location !== "profilePage" && (
              <Zoom in={isVisible} style={{ transitionDelay: "200ms" }}>
                <div className="profile-section">
                  <div className="profile-header">
                    <Link to={`/profile/${user?.ID}`} className="profile-link">
                      <Badge
                        overlap="circular"
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "right",
                        }}
                        badgeContent={<div className="online-indicator"></div>}
                      >
                        <Avatar
                          src={
                            user?.ProfilePicture ||
                            "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                          }
                          alt={user?.Username}
                          className="profile-avatar desktop"
                          sx={{
                            width: 56,
                            height: 56,
                            border: "3px solid var(--home-menu-accent)",
                          }}
                        />
                      </Badge>
                      <Typography
                        variant="h6"
                        className="profile-name"
                        sx={{
                          color: "var(--home-menu-text)",
                          fontWeight: 700,
                          textTransform: "capitalize",
                        }}
                      >
                        {user?.Username}
                      </Typography>
                    </Link>
                  </div>

                  <div className="followers-section">
                    <div className="follower-stat">
                      <Typography variant="h5" className="stat-number">
                        {user?.Followers?.length || 0}
                      </Typography>
                      <Typography variant="body2" className="stat-label">
                        Followers
                      </Typography>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="follower-stat">
                      <Typography variant="h5" className="stat-number">
                        {user?.Following?.length || 0}
                      </Typography>
                      <Typography variant="body2" className="stat-label">
                        Following
                      </Typography>
                    </div>
                  </div>
                </div>
              </Zoom>
            )}

            <Divider
              sx={{ backgroundColor: "var(--home-menu-border)", my: 2 }}
            />

            {/* Enhanced Navigation */}
            <nav aria-label="main navigation">
              <List className="sidebar-nav">
                {menuItems.map((item, index) => (
                  <Zoom
                    in={isVisible}
                    key={item.id}
                    style={{ transitionDelay: `${(index + 2) * 100}ms` }}
                  >
                    <ListItem className="sidebar-item">
                      <Link
                        to={item.path}
                        className="sidebar-link"
                        onClick={() => handleItemClick(item.id)}
                      >
                        <ListItemButton
                          className={`sidebar-button ${
                            activeItem === item.id ? "active" : ""
                          }`}
                        >
                          <ListItemIcon className="sidebar-icon">
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.label}
                            sx={{
                              "& .MuiListItemText-primary": {
                                color: "var(--home-menu-text)",
                                fontWeight: activeItem === item.id ? 700 : 500,
                              },
                            }}
                          />
                        </ListItemButton>
                      </Link>
                    </ListItem>
                  </Zoom>
                ))}
              </List>
            </nav>
          </Box>
        </Fade>
      </div>
    </>
  );
};

export default HomeMenu;
