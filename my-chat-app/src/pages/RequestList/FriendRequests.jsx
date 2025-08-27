import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  getFriendRequests,
  confirmFriendRequest,
  rejectFriendRequest,
} from "../../api/MessageRequest";
import { getAllUser } from "../../api/UserRequest";
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Alert,
  Box,
  Paper,
  Fade,
  Zoom,
  Slide,
  Chip,
  Badge,
  Tooltip,
  IconButton,
  Skeleton,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  TrendingUp as TrendingIcon,
} from "@mui/icons-material";
import HomeMenu from "../../components/HomeMenu/HomeMenu";
import "./FriendRequests.css";

const FriendRequests = () => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState([]);
  const [animationDelay, setAnimationDelay] = useState(0);

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

  // Initialize animations
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Log user for debugging
  console.log("Current user:", user);

  // Fetch pending friend requests with enhanced loading states
  const fetchRequests = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const { data } = await getFriendRequests();
      console.log("Friend requests data:", data);

      // Simulate loading for better UX
      await new Promise((resolve) => setTimeout(resolve, 600));

      setRequests(
        data.map((request) => ({
          id: request.id,
          senderId: request.senderId,
          receiverId: request.receiverId,
          status: request.status,
          createdAt: request.createdAt,
          senderName: request.senderName || null,
        }))
      );
      setError(null);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to fetch friend requests";
      console.error("Fetch requests error:", errorMessage, error.response);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial fetch and optional polling
  useEffect(() => {
    if (user?.ID) fetchRequests();
    // Optional polling (uncomment to enable)
    /*
    const interval = setInterval(() => {
      if (user?.ID) fetchRequests();
    }, 30000); // Fetch every 30 seconds
    return () => clearInterval(interval);
    */
  }, [user?.ID]);

  // Fetch sender usernames
  useEffect(() => {
    const fetchUsernames = async () => {
      try {
        const senderIds = requests
          .filter((request) => request.senderId && !request.senderName)
          .map((request) => request.senderId);
        console.log("Sender IDs to fetch:", senderIds);
        if (senderIds.length === 0) return;
        const { data } = await getAllUser();
        console.log("All users data:", data);
        const userMap = data.reduce((map, user) => {
          map[user.ID] = user.Username;
          return map;
        }, {});
        setRequests((prev) =>
          prev.map((request) => ({
            ...request,
            senderName:
              userMap[request.senderId] || request.senderName || "Unknown User",
          }))
        );
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Failed to fetch usernames";
        console.error("Fetch usernames error:", errorMessage, error.response);
        setError(errorMessage);
      }
    };
    if (requests.length > 0) fetchUsernames();
  }, [requests]);

  // Handle accept friend request with enhanced UX
  const handleAccept = async (requestId) => {
    try {
      setProcessingIds((prev) => [...prev, requestId]);
      const { data } = await confirmFriendRequest(requestId);
      console.log("Accept request response:", data);

      // Animate removal
      setTimeout(() => {
        setRequests((prev) =>
          prev.filter((request) => request.id !== requestId)
        );
        setProcessingIds((prev) => prev.filter((id) => id !== requestId));
      }, 500);

      setError(null);
      // Optionally navigate to chat: navigate(`/chat/${data.chatId}`);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to accept friend request";
      console.error("Accept error:", errorMessage, error.response);
      setError(errorMessage);
      setProcessingIds((prev) => prev.filter((id) => id !== requestId));
    }
  };

  // Handle reject friend request with enhanced UX
  const handleReject = async (requestId) => {
    try {
      setProcessingIds((prev) => [...prev, requestId]);
      const { data } = await rejectFriendRequest(requestId);
      console.log("Reject request response:", data);

      // Animate removal
      setTimeout(() => {
        setRequests((prev) =>
          prev.filter((request) => request.id !== requestId)
        );
        setProcessingIds((prev) => prev.filter((id) => id !== requestId));
      }, 500);

      setError(null);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to reject friend request";
      console.error("Reject error:", errorMessage, error.response);
      setError(errorMessage);
      setProcessingIds((prev) => prev.filter((id) => id !== requestId));
    }
  };

  // Handle refresh with animation
  const handleRefresh = () => {
    fetchRequests(true);
  };

  return (
    <div className={`friend-requests-page ${isDarkTheme ? "dark" : "light"}`}>
      {/* Sidebar */}
      <div>
        <HomeMenu />
      </div>

      {/* Main Content */}
      <div className="main-content">
        <Container className="content-container" maxWidth="lg">
          {/* Enhanced Header Section */}
          <Fade in={isVisible} timeout={600}>
            <div className="page-header">
              <div className="header-content">
                <div className="title-section">
                  <div className="icon-container">
                    <PeopleIcon className="header-icon" />
                    <div className="icon-glow"></div>
                  </div>
                  <div className="title-text">
                    <Typography
                      variant="h3"
                      component="h1"
                      className="main-title"
                      sx={{
                        color: isDarkTheme
                          ? "#ffffff !important"
                          : "var(--friend-requests-text) !important",
                        background: `linear-gradient(45deg, var(--friend-requests-accent), var(--friend-requests-primary))`,
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundSize: "200% 200%",
                        animation: "textShimmer 3s ease-in-out infinite",
                        fontWeight: 800,
                        margin: 0,
                      }}
                    >
                      Friend Requests
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      className="subtitle"
                      sx={{
                        color: isDarkTheme
                          ? "#e0e0e0 !important"
                          : "var(--friend-requests-secondary-text) !important",
                        margin: 0,
                        fontWeight: 500,
                      }}
                    >
                      Manage your incoming friend requests
                    </Typography>
                  </div>
                </div>

                <div className="header-actions">
                  <div className="stats-panel">
                    <Chip
                      icon={<NotificationsIcon />}
                      label={`${requests.length} Pending`}
                      className="stats-chip"
                      sx={{
                        backgroundColor: "var(--friend-requests-accent)",
                        color: "var(--friend-requests-card-bg)",
                        fontWeight: 600,
                        "& .MuiChip-icon": {
                          color: "var(--friend-requests-card-bg)",
                        },
                      }}
                    />
                  </div>

                  <Tooltip title="Refresh Requests" arrow>
                    <IconButton
                      onClick={handleRefresh}
                      className={`refresh-button ${
                        isRefreshing ? "refreshing" : ""
                      }`}
                      sx={{
                        color: "var(--friend-requests-accent)",
                        "&:hover": {
                          backgroundColor: "var(--friend-requests-hover-bg)",
                          transform: "scale(1.1)",
                        },
                      }}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>
            </div>
          </Fade>

          {/* Enhanced Content Section */}
          <Zoom in={isVisible} style={{ transitionDelay: "300ms" }}>
            <Paper className="requests-container">
              {/* Error Alert */}
              {error && (
                <Slide direction="down" in={!!error} mountOnEnter unmountOnExit>
                  <Alert
                    severity="error"
                    className="error-alert"
                    sx={{
                      backgroundColor: "var(--friend-requests-error-bg)",
                      color: "var(--friend-requests-error)",
                      border: "1px solid var(--friend-requests-error)",
                      borderRadius: "12px",
                      mb: 3,
                    }}
                  >
                    {error}
                  </Alert>
                </Slide>
              )}

              {/* Loading State */}
              {isLoading ? (
                <div className="loading-container">
                  {[...Array(3)].map((_, index) => (
                    <Fade
                      in={isLoading}
                      key={index}
                      style={{ transitionDelay: `${index * 200}ms` }}
                    >
                      <div className="skeleton-item">
                        <Skeleton
                          variant="circular"
                          width={56}
                          height={56}
                          className="skeleton-avatar"
                        />
                        <div className="skeleton-content">
                          <Skeleton
                            variant="text"
                            width="60%"
                            height={24}
                            className="skeleton-title"
                          />
                          <Skeleton
                            variant="text"
                            width="40%"
                            height={16}
                            className="skeleton-subtitle"
                          />
                        </div>
                        <div className="skeleton-actions">
                          <Skeleton
                            variant="rectangular"
                            width={70}
                            height={32}
                            className="skeleton-button"
                          />
                          <Skeleton
                            variant="rectangular"
                            width={70}
                            height={32}
                            className="skeleton-button"
                          />
                        </div>
                      </div>
                    </Fade>
                  ))}
                </div>
              ) : (
                <>
                  {/* Empty State */}
                  {requests.length === 0 ? (
                    <Fade in={!isLoading} timeout={800}>
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
                              : "var(--friend-requests-text) !important",
                            fontWeight: 600,
                            mb: 1,
                          }}
                        >
                          No Pending Requests
                        </Typography>
                        <Typography
                          variant="body1"
                          className="empty-description"
                          sx={{
                            color: isDarkTheme
                              ? "#e0e0e0 !important"
                              : "var(--friend-requests-secondary-text) !important",
                            mb: 3,
                          }}
                        >
                          You're all caught up! New friend requests will appear
                          here.
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<TrendingIcon />}
                          onClick={() => navigate("/friend")}
                          className="explore-button"
                          sx={{
                            borderColor: isDarkTheme
                              ? "#f5c32c !important"
                              : "var(--friend-requests-accent) !important",
                            color: isDarkTheme
                              ? "#f5c32c !important"
                              : "var(--friend-requests-accent) !important",
                            "&:hover": {
                              backgroundColor: isDarkTheme
                                ? "#f5c32c !important"
                                : "var(--friend-requests-accent) !important",
                              color: isDarkTheme
                                ? "#000000 !important"
                                : "var(--friend-requests-card-bg) !important",
                              borderColor: isDarkTheme
                                ? "#f5c32c !important"
                                : "var(--friend-requests-accent) !important",
                            },
                            "& .MuiButton-startIcon": {
                              color: isDarkTheme
                                ? "#f5c32c !important"
                                : "var(--friend-requests-accent) !important",
                            },
                            "&:hover .MuiButton-startIcon": {
                              color: isDarkTheme
                                ? "#000000 !important"
                                : "var(--friend-requests-card-bg) !important",
                            },
                          }}
                        >
                          Discover Friends
                        </Button>
                      </div>
                    </Fade>
                  ) : (
                    /* Requests List */
                    <List className="requests-list">
                      {requests.map((request, index) => {
                        const isProcessing = processingIds.includes(request.id);
                        return (
                          <Zoom
                            in={!isLoading}
                            key={request.id}
                            style={{
                              transitionDelay: `${index * 100}ms`,
                            }}
                          >
                            <ListItem
                              className={`request-item ${
                                isProcessing ? "processing" : ""
                              }`}
                            >
                              <div className="request-content">
                                <ListItemAvatar className="avatar-container">
                                  <Badge
                                    overlap="circular"
                                    anchorOrigin={{
                                      vertical: "bottom",
                                      horizontal: "right",
                                    }}
                                    badgeContent={
                                      <div className="new-indicator"></div>
                                    }
                                  >
                                    <Avatar
                                      className="user-avatar"
                                      sx={{
                                        width: 56,
                                        height: 56,
                                        backgroundColor:
                                          "var(--friend-requests-primary)",
                                        border:
                                          "3px solid var(--friend-requests-accent)",
                                      }}
                                    >
                                      {(request.senderName ||
                                        "U")[0].toUpperCase()}
                                    </Avatar>
                                  </Badge>
                                </ListItemAvatar>

                                <ListItemText
                                  className="request-info"
                                  primary={
                                    <Typography
                                      variant="h6"
                                      className="sender-name"
                                      sx={{
                                        color:
                                          "var(--friend-requests-text) !important",
                                        fontWeight: 600,
                                        mb: 0.5,
                                      }}
                                    >
                                      {request.senderName || "Unknown User"}
                                    </Typography>
                                  }
                                  secondary={
                                    <div className="request-details">
                                      <div className="timestamp">
                                        <ScheduleIcon className="time-icon" />
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color:
                                              "var(--friend-requests-secondary-text) !important",
                                            fontWeight: 500,
                                          }}
                                        >
                                          {new Date(
                                            request.createdAt
                                          ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </Typography>
                                      </div>
                                      <Chip
                                        label="Pending"
                                        size="small"
                                        className="status-chip"
                                        sx={{
                                          backgroundColor:
                                            "var(--friend-requests-warning)",
                                          color:
                                            "var(--friend-requests-card-bg)",
                                          fontSize: "0.7rem",
                                          fontWeight: 600,
                                        }}
                                      />
                                    </div>
                                  }
                                />

                                <div className="action-buttons">
                                  <Tooltip title="Accept Request" arrow>
                                    <Button
                                      variant="contained"
                                      size="small"
                                      onClick={() => handleAccept(request.id)}
                                      disabled={isProcessing}
                                      className="accept-button"
                                      startIcon={
                                        isProcessing ? null : <CheckIcon />
                                      }
                                      sx={{
                                        backgroundColor:
                                          "var(--friend-requests-success)",
                                        color: "var(--friend-requests-card-bg)",
                                        "&:hover": {
                                          backgroundColor:
                                            "var(--friend-requests-success)",
                                          transform: "scale(1.05)",
                                        },
                                        "&:disabled": {
                                          backgroundColor:
                                            "var(--friend-requests-border)",
                                        },
                                      }}
                                    >
                                      {isProcessing ? "..." : "Accept"}
                                    </Button>
                                  </Tooltip>

                                  <Tooltip title="Reject Request" arrow>
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => handleReject(request.id)}
                                      disabled={isProcessing}
                                      className="reject-button"
                                      startIcon={
                                        isProcessing ? null : <CloseIcon />
                                      }
                                      sx={{
                                        borderColor:
                                          "var(--friend-requests-error)",
                                        color: "var(--friend-requests-error)",
                                        "&:hover": {
                                          backgroundColor:
                                            "var(--friend-requests-error)",
                                          color:
                                            "var(--friend-requests-card-bg)",
                                          transform: "scale(1.05)",
                                        },
                                        "&:disabled": {
                                          borderColor:
                                            "var(--friend-requests-border)",
                                          color:
                                            "var(--friend-requests-border)",
                                        },
                                      }}
                                    >
                                      {isProcessing ? "..." : "Reject"}
                                    </Button>
                                  </Tooltip>
                                </div>
                              </div>

                              {/* Processing Overlay */}
                              {isProcessing && (
                                <div className="processing-overlay">
                                  <div className="processing-spinner"></div>
                                </div>
                              )}
                            </ListItem>
                          </Zoom>
                        );
                      })}
                    </List>
                  )}
                </>
              )}
            </Paper>
          </Zoom>
        </Container>
      </div>

      {/* Background Effects */}
      <div className="background-effects">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
    </div>
  );
};

export default FriendRequests;
