import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  getFriendRequests,
  confirmFriendRequest,
  rejectFriendRequest,
} from "../../api/MessageRequest"; // Updated import
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
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router-dom";

const FriendRequests = () => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Log user for debugging
  console.log("Current user:", user);

  // Fetch pending friend requests
  const fetchRequests = async () => {
    try {
      const { data } = await getFriendRequests();
      console.log("Friend requests data:", data);
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

  // Handle accept friend request
  const handleAccept = async (requestId) => {
    try {
      const { data } = await confirmFriendRequest(requestId);
      console.log("Accept request response:", data);
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
      setError(null);
      // Optionally navigate to chat: navigate(`/chat/${data.chatId}`);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to accept friend request";
      console.error("Accept error:", errorMessage, error.response);
      setError(errorMessage);
    }
  };

  // Handle reject friend request
  const handleReject = async (requestId) => {
    try {
      const { data } = await rejectFriendRequest(requestId);
      console.log("Reject request response:", data);
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
      setError(null);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to reject friend request";
      console.error("Reject error:", errorMessage, error.response);
      setError(errorMessage);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", color: "primary.main" }}
          >
            Friend Requests
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchRequests}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {requests.length === 0 ? (
          <Typography variant="body1" color="text.secondary">
            No pending friend requests.
          </Typography>
        ) : (
          <List sx={{ maxHeight: "60vh", overflowY: "auto" }}>
            {requests.map((request) => (
              <ListItem
                key={request.id}
                sx={{
                  bgcolor: "grey.50",
                  borderRadius: 1,
                  mb: 1,
                  "&:hover": { bgcolor: "grey.100" },
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: "primary.main" }} />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {request.senderName || "Unknown User"}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      Received: {new Date(request.createdAt).toLocaleString()}
                    </Typography>
                  }
                />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => handleAccept(request.id)}
                    sx={{ borderRadius: 2 }}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => handleReject(request.id)}
                    sx={{ borderRadius: 2 }}
                  >
                    Reject
                  </Button>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default FriendRequests;
