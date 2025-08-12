import React, { useState } from "react";
import { Modal, Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

const StoryModal = ({ open, onClose, stories, users }) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  if (!stories || stories.length === 0) return null;

  const currentStory = stories[currentStoryIndex];

  const handleNextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Box
        sx={{
          width: "80%",
          maxWidth: 600,
          height: "80vh",
          bgcolor: currentStory.Color || "black",
          borderRadius: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", top: 8, right: 8, color: "white" }}
        >
          <CloseIcon />
        </IconButton>
        {stories.length > 1 && (
          <>
            <IconButton
              onClick={handlePrevStory}
              disabled={currentStoryIndex === 0}
              sx={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                color: "white",
                bgcolor: "rgba(0,0,0,0.5)",
              }}
            >
              <ArrowBackIosIcon />
            </IconButton>
            <IconButton
              onClick={handleNextStory}
              disabled={currentStoryIndex === stories.length - 1}
              sx={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                color: "white",
                bgcolor: "rgba(0,0,0,0.5)",
              }}
            >
              <ArrowForwardIosIcon />
            </IconButton>
          </>
        )}
        {currentStory.Image ? (
          <img
            src={`${currentStory.Image}`}
            alt="Story"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              p: 2,
            }}
          >
            <Typography
              variant="h5"
              sx={{ color: "white", textAlign: "center" }}
            >
              {currentStory.Text}
            </Typography>
          </Box>
        )}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            width: "100%",
            bgcolor: "rgba(0,0,0,0.5)",
            color: "white",
            p: 1,
            textAlign: "center",
          }}
        >
          <Typography variant="caption">
            {users[currentStory.UserID]?.username || "Unknown"} •{" "}
            {new Date(currentStory.CreatedAt).toLocaleTimeString()}
          </Typography>
        </Box>
      </Box>
    </Modal>
  );
};

export default StoryModal;
