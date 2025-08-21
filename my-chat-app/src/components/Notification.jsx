import React, { useState, useEffect } from "react";
import "../components/rightSide/rightSide.css";
import Noti from "../img/noti.png";

import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getAllUser } from "../api/UserRequest";
import {
  confirmFriendRequest,
  rejectFriendRequest,
} from "../api/MessageRequest";
import { getNotifications, markNotificationAsRead } from "../api/Notification";
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
import WebSocketService from "../actions/WebSocketService";

const Notification = () => {
  const [modalOpened, setModalOpened] = useState(false);
  const [persons, setPersons] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const { user } = useSelector((state) => state.authReducer.authData);
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

    WebSocketService.connect(user.ID, handleMessage, handleError, handleClose);

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
    }, 30000); // Fetch every 30 seconds
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
    <div className="rightSide5" style={{ width: "22%" }}>
      <div className="rightSide">
        <div className="navIcons">
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon
              className="navIcons-img"
              onClick={() => setModalOpened(true)}
            />
          </Badge>
        </div>
      </div>

      <Modal
        open={modalOpened}
        onClose={() => setModalOpened(false)}
        aria-labelledby="notifications-modal"
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Box
          sx={{
            width: "90%",
            maxWidth: 400,
            bgcolor: "grey.100",
            p: 3,
            borderRadius: 2,
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: 3,
          }}
        >
          <p>Notifications</p>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {notifications.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No notifications.
            </Typography>
          ) : (
            <List>
              {notifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    bgcolor: notification.read ? "grey.50" : "primary.light",
                    borderRadius: 1,
                    mb: 1,
                    "&:hover": {
                      bgcolor: notification.read ? "grey.100" : "primary.main",
                      cursor: notification.postId ? "pointer" : "default",
                    },
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: "primary.main" }} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: "bold", color: "text.primary" }}
                      >
                        {notification.message}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notification.createdAt).toLocaleString()}
                      </Typography>
                    }
                  />
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {notification.type === "friend_request" && (
                      <>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAccept(notification.id);
                          }}
                          sx={{ borderRadius: 2 }}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<Cancel />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(notification.id);
                          }}
                          sx={{ borderRadius: 2 }}
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
                          color: "secondary.main",
                          borderColor: "secondary.main",
                        }}
                      >
                        Mark as Read
                      </Button>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Modal>
    </div>
  );
};

export default Notification;
