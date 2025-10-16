import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import API from "../../api/Api";
import ReactionModal from "../reactions/ReactionModal";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  Avatar,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReplyIcon from "@mui/icons-material/Reply";
import DeleteIcon from "@mui/icons-material/Delete";
import "./commentModal.css";

const reactions = {
  like: { emoji: "👍", label: "Like" },
  love: { emoji: "❤️", label: "Love" },
  haha: { emoji: "😂", label: "Haha" },
  wow: { emoji: "😮", label: "Wow" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😣", label: "Angry" },
  care: { emoji: "🤗", label: "Care" },
};

const CommentModal = ({ open, handleClose, postId, setCommentCount }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [users, setUsers] = useState({});
  const [reactionStates, setReactionStates] = useState({});
  const [showReactions, setShowReactions] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [selectedCommentReactions, setSelectedCommentReactions] =
    useState(null);
  const [reactionTriggerElement, setReactionTriggerElement] = useState(null);

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const { data } = await API.get(`/comment/post/${postId}`);
        const commentTree = buildCommentTree(data);
        setComments(commentTree);
        const initialReactions = {};
        data.forEach((comment) => {
          if (comment.Reactions && user?.ID) {
            Object.keys(comment.Reactions).forEach((type) => {
              if (comment.Reactions[type]?.includes(user.ID)) {
                initialReactions[comment.ID] = type;
              }
            });
          }
        });
        setReactionStates(initialReactions);
      } catch (error) {
        console.error(
          "Failed to fetch comments:",
          error.response?.data || error.message
        );
      }
    };
    if (open) fetchComments();
  }, [postId, open, user]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await API.get("/user");
        const userMap = data.reduce((map, user) => {
          map[user.ID] = {
            username: user.Username,
            profilePicture: user.ProfilePicture,
          };
          return map;
        }, {});
        setUsers(userMap);
      } catch (error) {
        console.error(
          "Failed to fetch users:",
          error.response?.data || error.message
        );
      }
    };
    fetchUsers();
  }, []);

  // Build comment tree
  const buildCommentTree = (comments) => {
    const commentMap = new Map();
    const tree = [];
    comments.forEach((comment) => {
      comment.children = [];
      commentMap.set(comment.ID, comment);
    });
    comments.forEach((comment) => {
      if (comment.ParentID) {
        const parent = commentMap.get(comment.ParentID);
        if (parent) {
          parent.children.push(comment);
        } else {
          tree.push(comment);
        }
      } else {
        tree.push(comment);
      }
    });
    return tree;
  };

  // Handle comment submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const commentData = {
        postId,
        userId: user.ID,
        text: newComment,
        parentId: replyTo ? replyTo.ID : null,
      };
      const { data } = await API.post("/comment", commentData);
      setComments((prev) => {
        if (replyTo) {
          const updatedComments = [...prev];
          const parent = findComment(updatedComments, replyTo.ID);
          if (parent) {
            parent.children = [
              ...(parent.children || []),
              { ...data, children: [] },
            ];
          }
          return updatedComments;
        }
        return [...prev, { ...data, children: [] }];
      });
      setCommentCount((prev) => prev + 1);
      setNewComment("");
      setReplyTo(null);
    } catch (error) {
      console.error(
        "Failed to create comment:",
        error.response?.data || error.message
      );
    }
  };

  // Handle comment reaction
  const handleReaction = async (commentId, reactionType) => {
    try {
      const currentReaction = reactionStates[commentId];
      const payload = {
        userId: user.ID,
        reactionType: currentReaction === reactionType ? "" : reactionType,
      };
      await API.post(`/comment/${commentId}/like`, payload);
      setReactionStates((prev) => ({
        ...prev,
        [commentId]: currentReaction === reactionType ? null : reactionType,
      }));
      setComments((prev) => {
        const updatedComments = [...prev];
        const comment = findComment(updatedComments, commentId);
        if (comment) {
          comment.Reactions = comment.Reactions || {};
          if (currentReaction === reactionType) {
            comment.Reactions[currentReaction] = comment.Reactions[
              currentReaction
            ].filter((id) => id !== user.ID);
            if (comment.Reactions[currentReaction].length === 0) {
              delete comment.Reactions[currentReaction];
            }
          } else {
            if (currentReaction) {
              comment.Reactions[currentReaction] = comment.Reactions[
                currentReaction
              ].filter((id) => id !== user.ID);
              if (comment.Reactions[currentReaction].length === 0) {
                delete comment.Reactions[currentReaction];
              }
            }
            if (reactionType) {
              comment.Reactions[reactionType] =
                comment.Reactions[reactionType] || [];
              if (!comment.Reactions[reactionType].includes(user.ID)) {
                comment.Reactions[reactionType].push(user.ID);
              }
            }
          }
        }
        return updatedComments;
      });
    } catch (error) {
      console.error(
        "Failed to update reaction:",
        error.response?.data || error.message
      );
    }
  };

  // Handle comment deletion
  const handleDeleteComment = async (commentId) => {
    try {
      await API.delete(`/comment/${commentId}`);
      setComments((prev) => {
        const updatedComments = prev.filter((c) => c.ID !== commentId);
        return buildCommentTree(updatedComments.flatMap(flattenComment));
      });
      setCommentCount((prev) => prev - 1);
      setReactionStates((prev) => {
        const newStates = { ...prev };
        delete newStates[commentId];
        return newStates;
      });
    } catch (error) {
      console.error(
        "Failed to delete comment:",
        error.response?.data || error.message
      );
    }
  };

  // Helper to find a comment by ID
  const findComment = (comments, id) => {
    for (const comment of comments) {
      if (comment.ID === id) return comment;
      const found = findComment(comment.children || [], id);
      if (found) return found;
    }
    return null;
  };

  // Helper to flatten comment tree
  const flattenComment = (comment) => {
    return [comment, ...(comment.children || [])];
  };

  // Get reaction emojis and count
  const getReactionEmojis = (comment) => {
    const activeReactions = Object.keys(comment.Reactions || {}).filter(
      (type) => comment.Reactions[type]?.length > 0
    );
    return (
      activeReactions.map((type) => reactions[type].emoji).join(" ") || "👍"
    );
  };

  const getTotalReactions = (comment) => {
    return Object.values(comment.Reactions || {}).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );
  };

  const handleOpenReactionModal = (commentReactions, triggerElement) => {
    setSelectedCommentReactions(commentReactions);
    setReactionTriggerElement(triggerElement);
    setShowReactionModal(true);
  };

  // Handle hover with debounce
  const handleMouseEnter = (commentId) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoverTimeout(
      setTimeout(() => {
        setShowReactions(commentId);
      }, 100)
    );
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoverTimeout(
      setTimeout(() => {
        setShowReactions(null);
      }, 100)
    );
  };

  // Render comment
  const renderComment = (comment, depth = 0) => (
    <React.Fragment key={comment.ID}>
      <ListItem
        className={`comment-item depth-${depth} ${
          isDarkTheme ? "dark" : "light"
        }`}
        sx={{
          pl: 2 + depth * 2,
          bgcolor: isDarkTheme
            ? depth % 2 === 0
              ? "#383838"
              : "#2c2c2c"
            : depth % 2 === 0
            ? "#f8f9fa"
            : "#ffffff",
          borderRadius: 2,
          mb: 1,
          border: isDarkTheme ? "1px solid #404040" : "1px solid #e0e0e0",
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            bgcolor: isDarkTheme ? "#404040" : "#f0f2f5",
            transform: "translateY(-1px)",
            boxShadow: isDarkTheme
              ? "0 4px 12px rgba(0, 0, 0, 0.3)"
              : "0 4px 12px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <Avatar
          src={users[comment.UserID]?.profilePicture || ""}
          className="comment-avatar"
          sx={{
            width: 36,
            height: 36,
            mr: 1.5,
            border: isDarkTheme ? "2px solid #555" : "2px solid #e0e0e0",
            transition: "all 0.3s ease-in-out",
            "&:hover": {
              transform: "scale(1.1)",
              boxShadow: isDarkTheme
                ? "0 4px 12px rgba(255, 255, 255, 0.1)"
                : "0 4px 12px rgba(0, 0, 0, 0.2)",
            },
          }}
        />
        <ListItemText
          primary={
            <Typography
              variant="subtitle2"
              className="comment-username"
              sx={{
                fontWeight: "bold",
                color: "var(--text-color)",
                fontSize: "0.95rem",
              }}
            >
              {users[comment.UserID]?.username || "Unknown User"}
            </Typography>
          }
          secondary={
            <>
              <Typography
                variant="body2"
                className="comment-text"
                sx={{
                  mb: 1,
                  color: "var(--text-color)",
                  lineHeight: 1.5,
                  wordWrap: "break-word",
                }}
              >
                {comment.Text}
              </Typography>
              <Box
                className="comment-actions"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <Box
                  className="reaction-container"
                  sx={{ position: "relative" }}
                  onMouseEnter={() => handleMouseEnter(comment.ID)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Chip
                    label={
                      <>
                        {getReactionEmojis(comment)}{" "}
                        {getTotalReactions(comment)}
                      </>
                    }
                    size="small"
                    className="reaction-chip"
                    onClick={(e) =>
                      handleOpenReactionModal(
                        comment.Reactions,
                        e.currentTarget
                      )
                    }
                    sx={{
                      cursor: "pointer",
                      bgcolor: isDarkTheme ? "#4a90e2" : "#1976d2",
                      color: "#ffffff",
                      fontSize: "0.8rem",
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        bgcolor: isDarkTheme ? "#5ba3f5" : "#1565c0",
                        transform: "scale(1.05)",
                      },
                    }}
                  />
                  {showReactions === comment.ID && (
                    <Box
                      className="reaction-menu"
                      sx={{
                        position: "absolute",
                        top: "-50px",
                        left: 0,
                        display: "flex",
                        gap: 0.5,
                        bgcolor: isDarkTheme ? "#2c2c2c" : "#ffffff",
                        p: 1,
                        borderRadius: 3,
                        boxShadow: isDarkTheme
                          ? "0 4px 20px rgba(0, 0, 0, 0.5)"
                          : "0 4px 20px rgba(0, 0, 0, 0.15)",
                        border: isDarkTheme
                          ? "1px solid #404040"
                          : "1px solid #e0e0e0",
                        zIndex: 10,
                        animation: "slideIn 0.2s ease-out",
                      }}
                      onMouseEnter={() => handleMouseEnter(comment.ID)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {Object.keys(reactions).map((type) => (
                        <Chip
                          key={type}
                          label={reactions[type].emoji}
                          onClick={() => handleReaction(comment.ID, type)}
                          className={`reaction-option ${
                            reactionStates[comment.ID] === type ? "active" : ""
                          }`}
                          sx={{
                            cursor: "pointer",
                            fontSize: "18px",
                            minWidth: "40px",
                            height: "40px",
                            transition: "all 0.2s ease-in-out",
                            bgcolor:
                              reactionStates[comment.ID] === type
                                ? isDarkTheme
                                  ? "var(--yellow)"
                                  : "#1976d2"
                                : isDarkTheme
                                ? "#404040"
                                : "#f5f5f5",
                            color:
                              reactionStates[comment.ID] === type
                                ? isDarkTheme
                                  ? "#000"
                                  : "#fff"
                                : "var(--text-color)",
                            "&:hover": {
                              transform: "scale(1.2)",
                              bgcolor:
                                reactionStates[comment.ID] === type
                                  ? isDarkTheme
                                    ? "var(--yellow)"
                                    : "#1565c0"
                                  : isDarkTheme
                                  ? "#555"
                                  : "#e0e0e0",
                            },
                          }}
                          title={reactions[type].label}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
                <Chip
                  icon={<ReplyIcon fontSize="small" />}
                  label="Reply"
                  size="small"
                  onClick={() => setReplyTo(comment)}
                  className="reply-chip"
                  sx={{
                    cursor: "pointer",
                    bgcolor: isDarkTheme ? "#2ECC71" : "#4caf50",
                    color: "#ffffff",
                    fontSize: "0.75rem",
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      bgcolor: isDarkTheme ? "#27AE60" : "#388e3c",
                      transform: "scale(1.05)",
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  className="comment-timestamp"
                  sx={{
                    color: isDarkTheme ? "#b0b0b0" : "#666",
                    fontSize: "0.7rem",
                    fontStyle: "italic",
                  }}
                >
                  {new Date(comment.CreatedAt).toLocaleString()}
                </Typography>
              </Box>
            </>
          }
        />
        {comment.UserID === user.ID && (
          <IconButton
            edge="end"
            onClick={() => handleDeleteComment(comment.ID)}
            className="delete-button"
            sx={{
              color: "var(--orange)",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                color: isDarkTheme ? "#ff7875" : "#d32f2f",
                bgcolor: isDarkTheme ? "#4a1f1f" : "#ffebee",
                transform: "scale(1.1)",
              },
            }}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </ListItem>
      {comment.children?.map((child) => renderComment(child, depth + 1))}
      <Divider
        className="comment-divider"
        sx={{
          mx: 2 + depth * 2,
          bgcolor: isDarkTheme ? "#404040" : "#e0e0e0",
          opacity: 0.7,
        }}
      />
    </React.Fragment>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      className={`comments-modal ${isDarkTheme ? "dark" : "light"}`}
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 3,
          boxShadow: isDarkTheme
            ? "0 8px 32px rgba(0, 0, 0, 0.6)"
            : "0 8px 32px rgba(0, 0, 0, 0.15)",
          bgcolor: isDarkTheme ? "#2c2c2c" : "#ffffff",
          border: isDarkTheme ? "1px solid #404040" : "none",
          maxHeight: "40vh",
          margin: 0,
        },
      }}
    >
      <DialogTitle
        className="comments-modal-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: isDarkTheme ? "#383838" : "#f8f9fa",
          borderBottom: isDarkTheme ? "1px solid #404040" : "1px solid #e0e0e0",
          py: 2,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: "bold",
            color: "var(--text-color)",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          💬 Comments
        </Typography>
        <IconButton
          onClick={handleClose}
          className="close-button"
          sx={{
            color: "var(--text-color)",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              bgcolor: isDarkTheme ? "#4a1f1f" : "#ffebee",
              color: "var(--orange)",
              transform: "rotate(90deg)",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        className="comments-modal-content"
        sx={{
          bgcolor: isDarkTheme ? "#2c2c2c" : "#ffffff",
          borderColor: isDarkTheme ? "#404040" : "#e0e0e0",
        }}
      >
        <List
          className="comments-list"
          sx={{
            maxHeight: "60vh",
            overflowY: "auto",
            p: 0,
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: isDarkTheme ? "#555" : "#ccc",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "var(--yellow)",
            },
          }}
        >
          {comments.length > 0 ? (
            comments.map((comment) => renderComment(comment))
          ) : (
            <Typography
              variant="body2"
              className="empty-comments"
              sx={{
                p: 3,
                textAlign: "center",
                color: isDarkTheme ? "#b0b0b0" : "#666",
                fontStyle: "italic",
                fontSize: "1rem",
              }}
            >
              🗨️ No comments yet. Be the first to share your thoughts!
            </Typography>
          )}
        </List>
      </DialogContent>
      <DialogActions
        className="comments-modal-actions"
        sx={{
          p: 2,
          bgcolor: isDarkTheme ? "#383838" : "#f8f9fa",
          borderTop: isDarkTheme ? "1px solid #404040" : "1px solid #e0e0e0",
        }}
      >
        <Box
          component="form"
          onSubmit={handleCommentSubmit}
          className="comment-form"
          sx={{
            display: "flex",
            gap: 1.5,
            width: "100%",
            alignItems: "flex-end",
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder={
              replyTo
                ? `💬 Replying to ${
                    users[replyTo.UserID]?.username || "comment"
                  }...`
                : "✍️ Write a comment..."
            }
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            size="small"
            multiline
            maxRows={3}
            className="comment-input"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                bgcolor: isDarkTheme ? "#404040" : "#ffffff",
                color: "var(--text-color)",
                transition: "all 0.2s ease-in-out",
                "& fieldset": {
                  borderColor: isDarkTheme ? "#555" : "#ccc",
                },
                "&:hover fieldset": {
                  borderColor: isDarkTheme ? "var(--yellow)" : "#1976d2",
                },
                "&.Mui-focused fieldset": {
                  borderColor: isDarkTheme ? "var(--yellow)" : "#1976d2",
                  borderWidth: "2px",
                },
              },
              "& .MuiInputBase-input": {
                color: "var(--text-color)",
              },
              "& .MuiInputBase-input::placeholder": {
                color: isDarkTheme ? "#b0b0b0" : "#666",
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!newComment.trim()}
            className="submit-button"
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1,
              bgcolor: isDarkTheme ? "#4a90e2" : "#1976d2",
              color: "#ffffff",
              fontWeight: "bold",
              minWidth: "80px",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                bgcolor: isDarkTheme ? "#5ba3f5" : "#1565c0",
                transform: "scale(1.05)",
              },
              "&:disabled": {
                bgcolor: isDarkTheme ? "#555" : "#ccc",
                color: isDarkTheme ? "#888" : "#999",
              },
            }}
          >
            {replyTo ? "💬 Reply" : "📝 Post"}
          </Button>
          {replyTo && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setReplyTo(null)}
              className="cancel-button"
              sx={{
                borderRadius: 3,
                px: 2,
                py: 1,
                borderColor: "var(--orange)",
                color: "var(--orange)",
                fontWeight: "bold",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  bgcolor: isDarkTheme ? "#4a1f1f" : "#ffebee",
                  borderColor: isDarkTheme ? "#ff7875" : "#d32f2f",
                  color: isDarkTheme ? "#ff7875" : "#d32f2f",
                  transform: "scale(1.05)",
                },
              }}
            >
              ❌ Cancel
            </Button>
          )}
        </Box>
      </DialogActions>

      {/* Reaction Modal */}
    </Dialog>
  );
};

export default CommentModal;
