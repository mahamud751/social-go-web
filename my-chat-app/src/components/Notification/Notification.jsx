import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getAllUser } from "../../api/UserRequest";
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

const Notification = () => {
  const [modalOpened, setModalOpened] = useState(false);
  const [persons, setPersons] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
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
      WebSocketService.disconnect();
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
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== requestId)
      );
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
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== requestId)
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

  return (
    <div className="rightSide5" style={{ width: "22%", padding: "0 16px" }}>
      <div
        className="rightSide"
        style={{ display: "flex", alignItems: "center" }}
      >
        <div className="navIcons">
          <Badge
            badgeContent={unreadCount}
            sx={{
              "& .MuiBadge-badge": {
                backgroundColor: "#FF4D4F", // Red for badge
                color: "#FFFFFF",
                fontSize: "0.75rem",
                minWidth: "18px",
                height: "18px",
                padding: "0 4px",
              },
            }}
          >
            <NotificationsIcon
              className="navIcons-img"
              onClick={() => setModalOpened(true)}
              sx={{
                fontSize: "28px",
                color: "#1890FF", // Blue for icon
                cursor: "pointer",
                "&:hover": {
                  color: "#40A9FF",
                  transform: "scale(1.1)",
                  transition: "all 0.2s ease-in-out",
                },
              }}
            />
          </Badge>
        </div>
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
          sx={{
            width: "90%",
            maxWidth: 500,
            bgcolor: "#FFFFFF", // White background
            p: 3,
            borderRadius: 3,
            maxHeight: "85vh",
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            transform: modalOpened ? "scale(1)" : "scale(0.95)",
            transition: "transform 0.3s ease-in-out",
          }}
        >
          <p
            style={{
              mb: 2,
              color: "#1F2A44", // Dark navy for title
              borderBottom: "1px solid #E8ECEF", // Light gray border
              pb: 1,
              fontSize: "1.5rem",
              fontWeight: "bold",
            }}
          >
            Notifications
          </p>
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                borderRadius: 2,
                bgcolor: "#FFF1F0", // Light red for error
                color: "#CF1322", // Dark red text
              }}
            >
              {error}
            </Alert>
          )}
          {notifications.length === 0 ? (
            <Typography
              variant="body1"
              sx={{
                color: "#6B7280", // Gray for empty state
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
                  sx={{
                    bgcolor: notification.read ? "#EDF2F7" : "#BAE0FF", // Light gray for read, light blue for unread
                    borderRadius: 2,
                    mb: 1.5,
                    p: 2,
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      bgcolor: notification.read ? "#EDF2F7" : "#BAE0FF",
                      transform: "translateY(-2px)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
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
                        sx={{
                          bgcolor: "#1890FF", // Blue avatar
                          width: 40,
                          height: 40,
                          border: `2px solid ${
                            notification.read ? "#E8ECEF" : "#40A9FF"
                          }`, // Gray or blue border
                        }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 500,
                            color: notification.read ? "#6B7280" : "#1F2A44", // Gray for read, dark navy for unread
                            lineHeight: 1.4,
                          }}
                        >
                          {notification.message}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#8B95A6", // Lighter gray for timestamp
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
                    {notification.type === "friend_request" && (
                      <>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAccept(notification.id);
                          }}
                          sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 500,
                            px: 2,
                            bgcolor: "#2ECC71", // Green for Accept
                            color: "#FFFFFF",
                            "&:hover": {
                              bgcolor: "#27AE60", // Darker green on hover
                              transform: "scale(1.05)",
                              transition: "all 0.2s ease-in-out",
                            },
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Cancel />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(notification.id);
                          }}
                          sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 500,
                            px: 2,
                            borderColor: "#FF4D4F", // Red border for Reject
                            color: "#FF4D4F", // Red text
                            "&:hover": {
                              bgcolor: "#FFF1F0", // Light red background on hover
                              color: "#CF1322", // Darker red
                              transform: "scale(1.05)",
                              transition: "all 0.2s ease-in-out",
                            },
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {!notification.read && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 500,
                          px: 2,
                          borderColor: "#8B95A6", // Gray border for Mark as Read
                          color: "#8B95A6", // Gray text
                          "&:hover": {
                            bgcolor: "#F7FAFC", // Light gray background on hover
                            color: "#1F2A44", // Dark navy text
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
