import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  Avatar,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import {
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";
import { getAllUser } from "../../api/UserRequest";
import { inviteMultipleMembers } from "../../api/GroupRequest";
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
} from "../../utils/toast";
import "./InviteMembersModal.css";

const InviteMembersModal = ({
  open,
  onClose,
  groupId,
  existingMembers,
  pendingInvites,
}) => {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("profile"));
  const isDarkTheme =
    document.documentElement.getAttribute("data-theme") === "dark";

  useEffect(() => {
    if (open) {
      fetchAllUsers();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter((user) =>
        user.Username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, allUsers]);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const { data } = await getAllUser();
      // Filter out current user, existing members, and pending invites
      const availableUsers = data.filter(
        (user) =>
          user.ID !== currentUser.user.ID &&
          !existingMembers?.includes(user.ID) &&
          !pendingInvites?.includes(user.ID)
      );
      setAllUsers(availableUsers);
      setFilteredUsers(availableUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSendInvites = async () => {
    if (selectedUsers.length === 0) {
      showWarningToast("Warning", "Please select at least one user to invite");
      return;
    }

    setSending(true);
    try {
      await inviteMultipleMembers(groupId, selectedUsers);
      showSuccessToast(
        "🎉 Success!",
        `Successfully sent ${selectedUsers.length} invitation(s)!`
      );
      setSelectedUsers([]);
      onClose();
    } catch (error) {
      console.error("Error sending invitations:", error);
      showErrorToast(
        "Error",
        error.response?.data?.message || "Failed to send invitations"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      className={`invite-members-modal ${isDarkTheme ? "dark" : "light"}`}
      PaperProps={{
        sx: {
          backgroundColor: isDarkTheme ? "#1a1a1a" : "#ffffff",
          borderRadius: "16px",
          maxHeight: "80vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          color: isDarkTheme ? "#ffffff" : "#000000",
          borderBottom: `1px solid ${isDarkTheme ? "#333" : "#e0e0e0"}`,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <PersonAddIcon sx={{ color: isDarkTheme ? "#f5c32c" : "#1976d2" }} />
        Invite Members to Group
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Search Bar */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: "#888" }} />,
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: isDarkTheme ? "#2c2c2c" : "#f5f5f5",
                color: isDarkTheme ? "#ffffff" : "#000000",
                "& fieldset": {
                  borderColor: isDarkTheme ? "#444" : "#ddd",
                },
              },
            }}
          />
        </Box>

        {/* Selected Count */}
        {selectedUsers.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Chip
              label={`${selectedUsers.length} user(s) selected`}
              color="primary"
              sx={{
                backgroundColor: isDarkTheme ? "#f5c32c" : "#1976d2",
                color: isDarkTheme ? "#000" : "#fff",
              }}
            />
          </Box>
        )}

        {/* User List */}
        {loading ? (
          <Typography
            sx={{
              textAlign: "center",
              py: 4,
              color: isDarkTheme ? "#fff" : "#000",
            }}
          >
            Loading users...
          </Typography>
        ) : filteredUsers.length === 0 ? (
          <Typography sx={{ textAlign: "center", py: 4, color: "#888" }}>
            {searchQuery ? "No users found" : "No available users to invite"}
          </Typography>
        ) : (
          <List sx={{ maxHeight: "400px", overflow: "auto" }}>
            <AnimatePresence>
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.ID}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ListItem
                    sx={{
                      backgroundColor: selectedUsers.includes(user.ID)
                        ? isDarkTheme
                          ? "rgba(245, 195, 44, 0.1)"
                          : "rgba(25, 118, 210, 0.1)"
                        : "transparent",
                      borderRadius: "8px",
                      mb: 1,
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        backgroundColor: isDarkTheme
                          ? "rgba(245, 195, 44, 0.15)"
                          : "rgba(25, 118, 210, 0.15)",
                      },
                    }}
                    onClick={() => handleToggleUser(user.ID)}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={
                          user.ProfilePicture ||
                          "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                        }
                        alt={user.Username}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.Username}
                      secondary={user.WorksAt || "No bio"}
                      primaryTypographyProps={{
                        sx: {
                          color: isDarkTheme ? "#fff" : "#000",
                          fontWeight: 600,
                          textTransform: "capitalize",
                        },
                      }}
                      secondaryTypographyProps={{
                        sx: { color: isDarkTheme ? "#aaa" : "#666" },
                      }}
                    />
                    <ListItemSecondaryAction>
                      <Checkbox
                        edge="end"
                        checked={selectedUsers.includes(user.ID)}
                        onChange={() => handleToggleUser(user.ID)}
                        sx={{
                          color: isDarkTheme ? "#f5c32c" : "#1976d2",
                          "&.Mui-checked": {
                            color: isDarkTheme ? "#f5c32c" : "#1976d2",
                          },
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </List>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: `1px solid ${isDarkTheme ? "#333" : "#e0e0e0"}`,
          p: 2,
        }}
      >
        <Button onClick={onClose} sx={{ color: isDarkTheme ? "#aaa" : "#666" }}>
          Cancel
        </Button>
        <Button
          onClick={handleSendInvites}
          variant="contained"
          disabled={selectedUsers.length === 0 || sending}
          sx={{
            backgroundColor: isDarkTheme ? "#f5c32c" : "#1976d2",
            color: isDarkTheme ? "#000" : "#fff",
            "&:hover": {
              backgroundColor: isDarkTheme ? "#ffd700" : "#1565c0",
            },
            "&:disabled": {
              backgroundColor: "#888",
              color: "#fff",
            },
          }}
        >
          {sending
            ? "Sending..."
            : `Send ${selectedUsers.length} Invitation(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteMembersModal;
