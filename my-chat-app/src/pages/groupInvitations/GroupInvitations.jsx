import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Avatar,
  Box,
  Chip,
} from "@mui/material";
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Group as GroupIcon,
} from "@mui/icons-material";
import {
  getGroupInvitations,
  acceptGroupInvite,
  rejectGroupInvite,
  getGroup,
} from "../../api/GroupRequest";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import "./GroupInvitations.css";

const GroupInvitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem("profile"));
  const isDarkTheme =
    document.documentElement.getAttribute("data-theme") === "dark";

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const { data } = await getGroupInvitations(currentUser.user.ID);

      // Fetch full group details for each invitation
      const invitationsWithDetails = await Promise.all(
        data.map(async (groupId) => {
          try {
            const groupRes = await getGroup(groupId);
            return groupRes.data;
          } catch (error) {
            console.error(`Error fetching group ${groupId}:`, error);
            return null;
          }
        })
      );

      setInvitations(invitationsWithDetails.filter((inv) => inv !== null));
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (groupId) => {
    setProcessing(groupId);
    try {
      await acceptGroupInvite(groupId);
      showSuccessToast("🎉 Success!", "Successfully joined the group!");
      fetchInvitations();
    } catch (error) {
      console.error("Error accepting invitation:", error);
      showErrorToast(
        "Error",
        error.response?.data?.message || "Failed to accept invitation"
      );
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (groupId) => {
    setProcessing(groupId);
    try {
      await rejectGroupInvite(groupId);
      showSuccessToast("✅ Success!", "Invitation declined");
      fetchInvitations();
    } catch (error) {
      console.error("Error rejecting invitation:", error);
      showErrorToast(
        "Error",
        error.response?.data?.message || "Failed to reject invitation"
      );
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div
        className={`group-invitations-container ${
          isDarkTheme ? "dark" : "light"
        }`}
      >
        <Typography
          sx={{
            textAlign: "center",
            py: 4,
            color: isDarkTheme ? "#fff" : "#000",
          }}
        >
          Loading invitations...
        </Typography>
      </div>
    );
  }

  return (
    <div
      className={`group-invitations-container ${
        isDarkTheme ? "dark" : "light"
      }`}
    >
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            color: isDarkTheme ? "#f5c32c" : "#1976d2",
            fontWeight: 700,
            mb: 1,
          }}
        >
          Group Invitations
        </Typography>
        <Typography sx={{ color: isDarkTheme ? "#aaa" : "#666" }}>
          {invitations.length} pending invitation(s)
        </Typography>
      </Box>

      {invitations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state"
        >
          <GroupIcon sx={{ fontSize: 60, color: "#888", mb: 2 }} />
          <Typography
            variant="h6"
            sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 1 }}
          >
            No pending invitations
          </Typography>
          <Typography sx={{ color: "#888" }}>
            You'll see group invitations here when someone invites you
          </Typography>
        </motion.div>
      ) : (
        <div className="invitations-grid">
          {invitations.map((group, index) => (
            <motion.div
              key={group.ID}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`invitation-card ${isDarkTheme ? "dark" : "light"}`}
                sx={{
                  backgroundColor: isDarkTheme ? "#2c2c2c" : "#ffffff",
                  borderRadius: "12px",
                  border: `1px solid ${isDarkTheme ? "#444" : "#e0e0e0"}`,
                }}
              >
                <Box
                  sx={{
                    height: 120,
                    backgroundImage: `url(${
                      group.CoverPicture ||
                      "https://i.ibb.co/FqHhTwR8/Blue-and-Red-Neon-Coming-Soon-Announcement-Facebook-Cover.png"
                    })`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    borderTopLeftRadius: "12px",
                    borderTopRightRadius: "12px",
                    position: "relative",
                  }}
                >
                  <Avatar
                    src={
                      group.ProfilePicture ||
                      "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                    }
                    sx={{
                      width: 80,
                      height: 80,
                      border: `4px solid ${
                        isDarkTheme ? "#1a1a1a" : "#ffffff"
                      }`,
                      position: "absolute",
                      bottom: -40,
                      left: 20,
                    }}
                  />
                </Box>

                <CardContent sx={{ pt: 6 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: isDarkTheme ? "#fff" : "#000",
                      fontWeight: 700,
                      mb: 1,
                    }}
                  >
                    {group.Name}
                  </Typography>

                  <Typography
                    sx={{
                      color: isDarkTheme ? "#aaa" : "#666",
                      fontSize: "0.9rem",
                      mb: 2,
                    }}
                  >
                    {group.Description || "No description"}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <Chip
                      label={group.Privacy}
                      size="small"
                      sx={{
                        backgroundColor: isDarkTheme ? "#f5c32c" : "#1976d2",
                        color: isDarkTheme ? "#000" : "#fff",
                        textTransform: "capitalize",
                      }}
                    />
                    <Chip
                      label={`${group.Members?.length || 0} members`}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: isDarkTheme ? "#666" : "#ccc",
                        color: isDarkTheme ? "#fff" : "#000",
                      }}
                    />
                  </Box>
                </CardContent>

                <CardActions
                  sx={{ justifyContent: "space-between", px: 2, pb: 2 }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<CloseIcon />}
                    onClick={() => handleReject(group.ID)}
                    disabled={processing === group.ID}
                    sx={{
                      color: "#dc3545",
                      borderColor: "#dc3545",
                      "&:hover": {
                        backgroundColor: "rgba(220, 53, 69, 0.1)",
                        borderColor: "#c82333",
                      },
                    }}
                  >
                    Decline
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CheckIcon />}
                    onClick={() => handleAccept(group.ID)}
                    disabled={processing === group.ID}
                    sx={{
                      backgroundColor: isDarkTheme ? "#f5c32c" : "#1976d2",
                      color: isDarkTheme ? "#000" : "#fff",
                      "&:hover": {
                        backgroundColor: isDarkTheme ? "#ffd700" : "#1565c0",
                      },
                    }}
                  >
                    Accept
                  </Button>
                </CardActions>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupInvitations;
