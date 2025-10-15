import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Button,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InputEmoji from "react-input-emoji";

const suggestedEmojis = [
  "😀",
  "😂",
  "😍",
  "🔥",
  "👏",
  "🎉",
  "🙏",
  "😎",
  "🥳",
  "💯",
];

const TextEnhancerModal = ({ open, onClose, onCancel, value, onChange, onApply }) => {
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDark = currentTheme === "dark";

  const handleEmojiAppend = (emoji) => {
    const newVal = `${value || ""}${emoji}`;
    onChange(newVal);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      keepMounted
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: isDark
            ? "0 12px 48px rgba(0,0,0,0.6)"
            : "0 12px 48px rgba(0,0,0,0.15)",
          bgcolor: isDark ? "#2c2c2c" : "#ffffff",
          border: isDark ? "1px solid #404040" : "1px solid #e0e0e0",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: isDark ? "#383838" : "#f8f9fa",
          borderBottom: isDark ? "1px solid #404040" : "1px solid #e0e0e0",
        }}
      >
        <Typography sx={{ fontWeight: 700, color: "var(--text-color)" }}>
          ✨ Enhance your post
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ color: "var(--text-color)" }}
          aria-label="Close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          bgcolor: isDark ? "#2c2c2c" : "#ffffff",
        }}
      >
        <Typography sx={{ mb: 1, color: "var(--text-color)" }}>
          Add emojis or type your message below
        </Typography>
        <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          {suggestedEmojis.map((e) => (
            <Chip
              key={e}
              label={e}
              onClick={() => handleEmojiAppend(e)}
              sx={{
                cursor: "pointer",
                bgcolor: isDark ? "#404040" : "#e0e0e0",
                color: "var(--text-color)",
                fontSize: "1rem",
              }}
            />
          ))}
        </Box>
        <Box
          sx={{
            p: 1,
            borderRadius: 3,
            bgcolor: isDark ? "#404040" : "#ffffff",
            border: isDark ? "1px solid #555" : "1px solid #ccc",
            minHeight: 140,
          }}
        >
          <InputEmoji
            value={value}
            onChange={onChange}
            placeholder="Type something and pick emojis..."
            theme={isDark ? "dark" : "light"}
            borderColor={isDark ? "#555" : "#ccc"}
            fontSize={16}
          />
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          bgcolor: isDark ? "#383838" : "#f8f9fa",
          borderTop: isDark ? "1px solid #404040" : "1px solid #e0e0e0",
        }}
      >
        <Button
          onClick={() => (onCancel ? onCancel() : onClose())}
          sx={{
            bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            color: "var(--text-color)",
            border: isDark ? "1px solid #555" : "1px solid #ccc",
            textTransform: "none",
            px: 2,
            '&:hover': {
              bgcolor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
            }
          }}
        >
          Clear
        </Button>
        <Button
          onClick={() => onApply(value)}
          className="button"
          sx={{
            background: "var(--buttonBg)",
            color: "var(--buttonColor)",
            textTransform: "none",
            px: 2,
            '&:hover': {
              boxShadow: isDark
                ? "0 8px 24px rgba(0,0,0,0.6)"
                : "0 8px 24px rgba(0,0,0,0.2)",
            },
          }}
        >
          Insert
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TextEnhancerModal;