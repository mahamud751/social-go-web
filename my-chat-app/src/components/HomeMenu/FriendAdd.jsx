import Grid from "@mui/material/Unstable_Grid2";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getAllUser } from "../../api/UserRequest";
import User from "../User/User";
import {
  CircularProgress,
  Typography,
  Box,
  Fade,
  Zoom,
  TextField,
  InputAdornment,
  Chip,
  Skeleton,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GroupIcon from "@mui/icons-material/Group";
import "./friendAdd.css";

const FriendAdd = ({ location }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name, recent, mutual
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [animationDelay, setAnimationDelay] = useState(0);

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

  useEffect(() => {
    const fetchPersons = async () => {
      try {
        setLoading(true);
        const { data } = await getAllUser();

        // Simulate network delay for smooth animation
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Filter out current user and add mock data for better demo
        const filteredData = data
          .filter((person) => person.ID !== user.ID)
          .map((person) => ({
            ...person,
            isOnline: Math.random() > 0.3, // Mock online status
            mutualFriends: Math.floor(Math.random() * 10), // Mock mutual friends
            lastSeen: new Date(
              Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
            ), // Mock last seen
          }));

        setPersons(filteredData);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.ID) {
      fetchPersons();
    }
  }, [user]);

  // Handle sort change
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
  };

  // Filter and sort users based on search and filters
  const filteredUsers = persons
    .filter((person) => {
      // Search filter
      const matchesSearch =
        person.Username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.FirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.LastName?.toLowerCase().includes(searchTerm.toLowerCase());

      // Online filter
      const matchesOnline = !showOnlineOnly || person.isOnline;

      return matchesSearch && matchesOnline;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.Username || "").localeCompare(b.Username || "");
        case "recent":
          return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
        case "mutual":
          return (b.mutualFriends || 0) - (a.mutualFriends || 0);
        default:
          return 0;
      }
    });

  // Count online users
  const onlineCount = filteredUsers.filter((person) => person.isOnline).length;

  return (
    <div className={`friend-add-container ${isDarkTheme ? "dark" : "light"}`}>
      {/* Header Section */}
      <Fade in={true} timeout={200}>
        <div className="friend-add-header">
          <div className="header-content">
            <div className="title-section">
              <div className="title-icon-container">
                <PeopleIcon className="title-icon" />
                <div className="icon-pulse"></div>
              </div>
              <div className="title-text">
                <Typography
                  variant="h3"
                  component="h1"
                  className="main-title"
                  sx={{
                    color: isDarkTheme
                      ? "#ffffff !important"
                      : "var(--friend-add-text) !important",
                    background: `linear-gradient(45deg, var(--friend-add-accent), var(--friend-add-primary))`,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundSize: "200% 200%",
                    animation: "textShimmer 3s ease-in-out infinite",
                    fontWeight: 800,
                    margin: 0,
                  }}
                >
                  Discover Friends
                </Typography>
                <Typography
                  variant="subtitle1"
                  className="subtitle"
                  sx={{
                    color: isDarkTheme
                      ? "#e0e0e0 !important"
                      : "var(--friend-add-secondary-text) !important",
                    margin: 0,
                    fontWeight: 500,
                  }}
                >
                  Connect with people you may know
                </Typography>
              </div>
            </div>

            <div className="stats-panel">
              <div className="stat-item">
                <GroupIcon className="stat-icon" />
                <div className="stat-content">
                  <span className="stat-number">{filteredUsers.length}</span>
                  <span className="stat-label">Available</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="online-indicator"></div>
                <div className="stat-content">
                  <span className="stat-number">{onlineCount}</span>
                  <span className="stat-label">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Fade>

      {/* Controls Section */}
      <Fade in={true} timeout={800}>
        <div className="controls-section">
          <div className="search-container">
            <TextField
              placeholder="Search friends by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      className="search-icon"
                      sx={{
                        color: isDarkTheme
                          ? "#f5c32c !important"
                          : "var(--friend-add-accent) !important",
                      }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: isDarkTheme ? "#383838" : "#ffffff",
                  borderRadius: "16px",
                  "& fieldset": {
                    borderColor: isDarkTheme ? "#555555" : "#e0e0e0",
                  },
                  "&:hover fieldset": {
                    borderColor: isDarkTheme ? "#f5c32c" : "#1976d2",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: isDarkTheme ? "#f5c32c" : "#1976d2",
                    borderWidth: "2px",
                  },
                },
                "& .MuiInputBase-input": {
                  color: isDarkTheme
                    ? "#ffffff !important"
                    : "#000000 !important",
                  padding: "16px 14px",
                },
                "& .MuiInputBase-input::placeholder": {
                  color: isDarkTheme
                    ? "#e0e0e0 !important"
                    : "#666666 !important",
                  opacity: 1,
                },
              }}
            />
          </div>

          <div className="filter-controls">
            <div className="sort-chips">
              {[
                { value: "name", label: "A-Z", icon: "🔤" },
                { value: "recent", label: "Recent", icon: "⏰" },
                { value: "mutual", label: "Mutual", icon: "👥" },
              ].map((sort) => (
                <Chip
                  key={sort.value}
                  label={`${sort.icon} ${sort.label}`}
                  onClick={() => handleSortChange(sort.value)}
                  className={`sort-chip ${
                    sortBy === sort.value ? "active" : ""
                  }`}
                  sx={{
                    backgroundColor:
                      sortBy === sort.value
                        ? isDarkTheme
                          ? "#f5c32c"
                          : "#1976d2"
                        : isDarkTheme
                        ? "#404040"
                        : "#f5f5f5",
                    color:
                      sortBy === sort.value
                        ? isDarkTheme
                          ? "#000000"
                          : "#ffffff"
                        : isDarkTheme
                        ? "#ffffff"
                        : "#000000",
                    "&:hover": {
                      backgroundColor:
                        sortBy === sort.value
                          ? isDarkTheme
                            ? "#f5c32c"
                            : "#1976d2"
                          : isDarkTheme
                          ? "#505050"
                          : "#e0e0e0",
                    },
                  }}
                />
              ))}
            </div>

            <button
              className={`online-filter-btn ${showOnlineOnly ? "active" : ""}`}
              onClick={() => setShowOnlineOnly(!showOnlineOnly)}
              aria-label="Toggle online only filter"
            >
              <div className="filter-icon">
                <FilterListIcon />
              </div>
              <span>Online Only</span>
              <div
                className={`toggle-indicator ${showOnlineOnly ? "on" : "off"}`}
              ></div>
            </button>
          </div>
        </div>
      </Fade>

      {/* Results Section */}
      {filteredUsers.length === 0 ? (
        <Fade in={true} timeout={1000}>
          <div className="empty-state">
            <div className="empty-animation">
              <PersonAddIcon className="empty-icon" />
              <div className="ripple-effect"></div>
            </div>
            <Typography
              variant="h5"
              className="empty-title"
              sx={{
                color: isDarkTheme
                  ? "#ffffff !important"
                  : "var(--friend-add-text) !important",
                fontWeight: 600,
                mb: 1,
              }}
            >
              {searchTerm ? "No matches found" : "No friends to discover"}
            </Typography>
            <Typography
              variant="body1"
              className="empty-description"
              sx={{
                color: isDarkTheme
                  ? "#e0e0e0 !important"
                  : "var(--friend-add-secondary-text) !important",
                mb: 2,
              }}
            >
              {searchTerm
                ? "Try adjusting your search terms or filters"
                : "Check back later for new friend suggestions"}
            </Typography>
            {searchTerm && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchTerm("")}
              >
                Clear Search
              </button>
            )}
          </div>
        </Fade>
      ) : (
        <Fade in={true} timeout={1000}>
          <div className="friends-grid">
            <Grid container spacing={3}>
              {filteredUsers.map((person, index) => (
                <Zoom
                  in={true}
                  key={person.ID}
                  style={{
                    transitionDelay: `${index * 100}ms`,
                  }}
                >
                  <Grid item xs={12} sm={6} md={4} lg={4}>
                    <User person={person} />
                  </Grid>
                </Zoom>
              ))}
            </Grid>
          </div>
        </Fade>
      )}
    </div>
  );
};

export default FriendAdd;
