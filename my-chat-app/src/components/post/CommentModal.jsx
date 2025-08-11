import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import API from "../../api/Api";
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
  const [hoverTimeout, setHoverTimeout] = useState(null); // For debouncing hover

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
        sx={{
          pl: 2 + depth * 2,
          bgcolor: depth % 2 === 0 ? "grey.50" : "white",
          borderRadius: 1,
          mb: 1,
          "&:hover": { bgcolor: "grey.100" },
        }}
      >
        <Avatar
          src={users[comment.UserID]?.profilePicture || ""}
          sx={{ width: 32, height: 32, mr: 1 }}
        />
        <ListItemText
          primary={
            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
              {users[comment.UserID]?.username || "Unknown User"}
            </Typography>
          }
          secondary={
            <>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {comment.Text}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
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
                    sx={{
                      cursor: "pointer",
                      bgcolor: "primary.light",
                      color: "white",
                    }}
                  />
                  {showReactions === comment.ID && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: "-40px", // Position above the Chip
                        left: 0,
                        display: "flex",
                        gap: 1,
                        bgcolor: "white",
                        p: 0.5,
                        borderRadius: 2,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        zIndex: 10,
                      }}
                      onMouseEnter={() => handleMouseEnter(comment.ID)} // Keep menu open when hovering over it
                      onMouseLeave={handleMouseLeave}
                    >
                      {Object.keys(reactions).map((type) => (
                        <Chip
                          key={type}
                          label={reactions[type].emoji}
                          onClick={() => handleReaction(comment.ID, type)}
                          sx={{
                            cursor: "pointer",
                            fontSize: "20px",
                            bgcolor:
                              reactionStates[comment.ID] === type
                                ? "primary.main"
                                : "grey.200",
                            color:
                              reactionStates[comment.ID] === type
                                ? "white"
                                : "black",
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
                  sx={{
                    cursor: "pointer",
                    bgcolor: "secondary.light",
                    color: "white",
                  }}
                />
                <Typography variant="caption" color="text.secondary">
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
            sx={{ color: "error.main" }}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </ListItem>
      {comment.children?.map((child) => renderComment(child, depth + 1))}
      <Divider sx={{ mx: 2 + depth * 2 }} />
    </React.Fragment>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          bgcolor: "background.paper",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="h5"
          sx={{ fontWeight: "bold", color: "primary.main" }}
        >
          Comments
        </Typography>
        <IconButton onClick={handleClose} sx={{ color: "grey.600" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <List sx={{ maxHeight: "60vh", overflowY: "auto", p: 0 }}>
          {comments.length > 0 ? (
            comments.map((comment) => renderComment(comment))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No comments yet.
            </Typography>
          )}
        </List>
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: "grey.50" }}>
        <Box
          component="form"
          onSubmit={handleCommentSubmit}
          sx={{ display: "flex", gap: 1, width: "100%" }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder={
              replyTo
                ? `Replying to ${
                    users[replyTo.UserID]?.username || "comment"
                  }...`
                : "Write a comment..."
            }
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "white",
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!newComment.trim()}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {replyTo ? "Reply" : "Post"}
          </Button>
          {replyTo && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setReplyTo(null)}
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CommentModal;
