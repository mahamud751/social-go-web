import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getAllUser, getUser } from "../../api/UserRequest";
import {
  confirmFriendRequest,
  rejectFriendRequest,
} from "../../api/MessageRequest";
import {
  getNotifications,
  markNotificationAsRead,
} from "../../api/Notification";
import {
  Modal,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Alert,
  Badge,
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";
import WebSocketService from "../../actions/WebSocketService";
import "./notification.css";

const Notification = () => {
  const [modalOpened, setModalOpened] = useState(false);
  const [persons, setPersons] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [currentUserFriends, setCurrentUserFriends] = useState([]);
  const authData = useSelector((state) => state?.authReducer?.authData);
  const user = authData?.user;
  const navigate = useNavigate();

  // Fetch suggested users
  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const { data } = await getAllUser();
        setPersons(data);
      } catch (error) {
        console.error(
          "Fetch persons error:",
          error.response?.data?.message || " FAILED to fetch users"
        );
      }
    };
    fetchPersons();
  }, [user]);

  // Fetch current user's friends for action visibility logic
  useEffect(() => {
    const fetchMyFriends = async () => {
      try {
        if (!user?.ID) return;
        const { data } = await getUser(user.ID);
        setCurrentUserFriends(data?.Friends || []);
      } catch (error) {
        console.error("Failed to fetch current user for friends:", error);
      }
    };
    fetchMyFriends();
  }, [user?.ID]);

  // WebSocket setup
  useEffect(() => {
    if (!user?.ID) return;

    const handleMessage = (message) => {
      if (message.type === "notification") {
        setNotifications((prev) => [message.data, ...prev]);
      }
    };

    const handleError = (error) => {
      setError("WebSocket connection error");
    };

    const handleClose = () => {
      setError("WebSocket connection closed");
    };

    WebSocketService.connect(user?.ID, handleMessage, handleError, handleClose);

    return () => {
      // Do not disconnect the shared WebSocket; just remove this handler
      WebSocketService.removeMessageHandler(handleMessage);
    };
  }, [user?.ID]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const { data } = await getNotifications();
      setNotifications(data);
      setError(null);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to fetch notifications";
      console.error("Fetch notifications error:", errorMessage);
      setError(errorMessage);
    }
  };

  useEffect(() => {
    if (modalOpened && user?.ID) fetchNotifications();
    const interval = setInterval(() => {
      if (user?.ID) fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [modalOpened, user?.ID]);

  // Handle accept friend request
  const handleAccept = async (requestId) => {
    try {
      await confirmFriendRequest(requestId);

      // Update notifications to mark this request as accepted
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === requestId ? { ...notif, status: "accepted" } : notif
        )
      );

      // Refetch current user's friends to update the UI
      const { data } = await getUser(user.ID);
      setCurrentUserFriends(data?.Friends || []);

      setError(null);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to accept friend request";
      console.error("Accept error:", errorMessage);
      setError(errorMessage);
    }
  };

  // Handle reject friend request
  const handleReject = async (requestId) => {
    try {
      await rejectFriendRequest(requestId);

      // Update notifications to mark this request as rejected
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === requestId ? { ...notif, status: "rejected" } : notif
        )
      );

      setError(null);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to reject friend request";
      console.error("Reject error:", errorMessage);
      setError(errorMessage);
    }
  };

  // Handle mark as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setError(null);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to mark notification as read";
      console.error("Mark as read error:", errorMessage);
      setError(errorMessage);
    }
  };

  // Handle navigation for post-related notifications
  const handleNotificationClick = (notification) => {
    if (notification.postId) {
      navigate(`/post/${notification.postId}`);
      setModalOpened(false);
    }
  };

  // Calculate unread notification count
  const unreadCount = notifications.filter((notif) => !notif.read).length;

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

  return (
    <div className="notification-wrapper">
      <div className="notification-container">
        <Badge
          badgeContent={unreadCount}
          sx={{
            "& .MuiBadge-badge": {
              backgroundColor: "var(--orange)",
              color: "#FFFFFF",
              fontSize: "0.7rem",
              minWidth: "16px",
              height: "16px",
              padding: "0 2px",
              top: "6px",
              right: "6px",
            },
          }}
        >
          <div className="notification-icon-wrapper">
            <i
              className="fa-solid fa-bell notification-icon"
              onClick={() => setModalOpened(true)}
            ></i>
          </div>
        </Badge>
      </div>

      <Modal
        open={modalOpened}
        onClose={() => setModalOpened(false)}
        aria-labelledby="notifications-modal"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(5px)",
        }}
      >
        <Box
          className="notification-modal"
          sx={{
            width: "90%",
            maxWidth: 500,
            bgcolor: isDarkTheme ? "#2c2c2c" : "#FFFFFF",
            p: 3,
            borderRadius: 3,
            maxHeight: "85vh",
            overflowY: "auto",
            boxShadow: isDarkTheme
              ? "0 8px 24px rgba(0, 0, 0, 0.5)"
              : "0 8px 24px rgba(0, 0, 0, 0.15)",
            transform: modalOpened ? "scale(1)" : "scale(0.95)",
            transition: "transform 0.3s ease-in-out",
            border: isDarkTheme ? "1px solid #404040" : "none",
          }}
        >
          <Typography
            variant="h5"
            className="notification-title"
            sx={{
              mb: 2,
              color: "var(--text-color)",
              borderBottom: isDarkTheme
                ? "1px solid #404040"
                : "1px solid #E8ECEF",
              pb: 1,
              fontSize: "1.5rem",
              fontWeight: "bold",
            }}
          >
            Notifications
          </Typography>
          {error && (
            <Alert
              severity="error"
              className="notification-error"
              sx={{
                mb: 2,
                borderRadius: 2,
                bgcolor: isDarkTheme ? "#4a1f1f" : "#FFF1F0",
                color: isDarkTheme ? "#ff7875" : "#CF1322",
                border: isDarkTheme ? "1px solid #ff4d4f" : "none",
                "& .MuiAlert-icon": {
                  color: isDarkTheme ? "#ff7875" : "#CF1322",
                },
              }}
            >
              {error}
            </Alert>
          )}
          {notifications.length === 0 ? (
            <Typography
              variant="body1"
              className="notification-empty"
              sx={{
                color: isDarkTheme ? "#b0b0b0" : "#6B7280",
                textAlign: "center",
                py: 4,
                fontStyle: "italic",
              }}
            >
              No notifications yet.
            </Typography>
          ) : (
            <List sx={{ padding: 0 }}>
              {notifications.map((notification) => (
                <Box
                  className={`notification-item ${
                    notification.read ? "read" : "unread"
                  } ${isDarkTheme ? "dark" : "light"}`}
                  sx={{
                    bgcolor: isDarkTheme
                      ? notification.read
                        ? "#383838"
                        : "#1f3a5f"
                      : notification.read
                      ? "#EDF2F7"
                      : "#BAE0FF",
                    borderRadius: 2,
                    mb: 1.5,
                    p: 2,
                    transition: "all 0.2s ease-in-out",
                    border: isDarkTheme
                      ? notification.read
                        ? "1px solid #505050"
                        : "1px solid #4a90e2"
                      : "none",
                    "&:hover": {
                      bgcolor: isDarkTheme
                        ? notification.read
                          ? "#404040"
                          : "#2a4a70"
                        : notification.read
                        ? "#E2E8F0"
                        : "#91D5FF",
                      transform: "translateY(-2px)",
                      boxShadow: isDarkTheme
                        ? "0 4px 12px rgba(0, 0, 0, 0.3)"
                        : "0 4px 12px rgba(0, 0, 0, 0.1)",
                      cursor: notification.postId ? "pointer" : "default",
                    },
                  }}
                >
                  <ListItem
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <ListItemAvatar>
                      <Avatar
                        className="notification-avatar"
                        sx={{
                          bgcolor: isDarkTheme ? "var(--yellow)" : "#1890FF",
                          width: 40,
                          height: 40,
                          border: isDarkTheme
                            ? `2px solid ${
                                notification.read ? "#606060" : "var(--yellow)"
                              }`
                            : `2px solid ${
                                notification.read ? "#E8ECEF" : "#40A9FF"
                              }`,
                          color: isDarkTheme ? "#000" : "#fff",
                        }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          variant="subtitle1"
                          className="notification-message"
                          sx={{
                            fontWeight: 500,
                            color: isDarkTheme
                              ? notification.read
                                ? "#b0b0b0"
                                : "#ffffff"
                              : notification.read
                              ? "#6B7280"
                              : "#1F2A44",
                            lineHeight: 1.4,
                          }}
                        >
                          {notification.message}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          className="notification-timestamp"
                          sx={{
                            color: isDarkTheme ? "#909090" : "#8B95A6",
                            mt: 0.5,
                            display: "block",
                          }}
                        >
                          {new Date(notification.createdAt).toLocaleString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "numeric",
                              hour12: true,
                            }
                          )}
                        </Typography>
                      }
                    />
                  </ListItem>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      flexShrink: 0,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Friend Request Actions */}
                    {(() => {
                      // Check if this is a friend request
                      if (notification.type !== "friend_request") {
                        return null;
                      }

                      // Extract sender ID from notification (could be senderId, senderID, userId, or sender_id)
                      const senderId =
                        notification.senderId ||
                        notification.senderID ||
                        notification.userId ||
                        notification.sender_id;

                      // Check if already friends
                      const isAlreadyFriend =
                        senderId && currentUserFriends.includes(senderId);

                      // Check if status is accepted or rejected
                      const isAccepted = notification.status === "accepted";
                      const isRejected = notification.status === "rejected";

                      // Show Accept/Reject buttons only if:
                      // - Status is NOT accepted or rejected
                      // - User is NOT already a friend

                      // Show "Already Friends" badge
                      if (isAccepted || isAlreadyFriend) {
                        return (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#2ECC71",
                              fontWeight: 600,
                              bgcolor: isDarkTheme ? "#1a4d2e" : "#d4edda",
                              px: 2,
                              py: 0.5,
                              borderRadius: 2,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <CheckCircle sx={{ fontSize: 16 }} />
                            Already Friends
                          </Typography>
                        );
                      }

                      // Show "Rejected" badge
                      if (isRejected) {
                        return (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "var(--orange)",
                              fontWeight: 600,
                              bgcolor: isDarkTheme ? "#4a1f1f" : "#FFF1F0",
                              px: 2,
                              py: 0.5,
                              borderRadius: 2,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Cancel sx={{ fontSize: 16 }} />
                            Rejected
                          </Typography>
                        );
                      }

                      return null;
                    })()}

                    {/* Mark as Read Button */}
                    {!notification.read && (
                      <Button
                        variant="outlined"
                        size="small"
                        className="notification-read-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 500,
                          px: 2,
                          borderColor: isDarkTheme ? "#707070" : "#8B95A6",
                          color: isDarkTheme ? "#b0b0b0" : "#8B95A6",
                          "&:hover": {
                            bgcolor: isDarkTheme ? "#404040" : "#F7FAFC",
                            color: "var(--text-color)",
                            borderColor: "var(--text-color)",
                            transform: "scale(1.05)",
                            transition: "all 0.2s ease-in-out",
                          },
                        }}
                      >
                        Mark as Read
                      </Button>
                    )}
                  </Box>
                </Box>
              ))}
            </List>
          )}
        </Box>
      </Modal>
    </div>
  );
};

export default Notification;
