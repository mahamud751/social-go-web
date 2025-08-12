import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import API from "../../api/Api";

import StoryCreate from "./StoryCreate";
import StoryModal from "./StoryModal";
import "./story.css";
import { Box, Modal, Typography, IconButton, Avatar } from "@mui/material";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AddCircleIcon from "@mui/icons-material/AddCircle";

const Story = () => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const storiesFromStore = useSelector(
    (state) => state.postReducer.stories || []
  );
  const [stories, setStories] = useState([]);
  const [users, setUsers] = useState({});
  const [currentSlide, setCurrentSlide] = useState(0);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedUserStories, setSelectedUserStories] = useState([]);
  const storiesPerSlide = 4;

  // Fetch stories
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const { data } = await API.get("/story");
        setStories(data);
      } catch (error) {
        console.error(
          "Failed to fetch stories:",
          error.response?.data || error.message
        );
      }
    };
    fetchStories();
  }, []);

  // Update stories from WebSocket
  useEffect(() => {
    if (!Array.isArray(storiesFromStore)) {
      console.warn("storiesFromStore is not an array:", storiesFromStore);
      return;
    }
    storiesFromStore.forEach((newStory) => {
      if (!stories.some((s) => s.ID === newStory.ID)) {
        setStories((prev) => [newStory, ...prev]);
      }
    });
  }, [storiesFromStore]);

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

  // Handle new story creation
  const handleStoryCreated = (newStory) => {
    setStories((prev) => [newStory, ...prev]);
    setOpenCreateModal(false);
  };

  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.UserID]) {
      acc[story.UserID] = [];
    }
    acc[story.UserID].push(story);
    return acc;
  }, {});

  // Sort each user's stories by CreatedAt (newest first)
  Object.keys(groupedStories).forEach((userID) => {
    groupedStories[userID].sort(
      (a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt)
    );
  });

  // Create list of cards: "Create Story" first, then current user's stories (if any), then others
  const cardItems = [
    { type: "create", userID: user.ID }, // Create Story card
  ];
  if (groupedStories[user.ID]?.length > 0) {
    cardItems.push({ type: "story", userID: user.ID }); // Current user's stories
  }
  Object.keys(groupedStories)
    .filter((id) => id !== user.ID)
    .forEach((id) => cardItems.push({ type: "story", userID: id })); // Other users' stories

  const totalSlides = Math.ceil(cardItems.length / storiesPerSlide);
  const visibleCardItems = cardItems.slice(
    currentSlide * storiesPerSlide,
    (currentSlide + 1) * storiesPerSlide
  );

  const handleNextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleViewStories = (userID) => {
    setSelectedUserStories(groupedStories[userID] || []);
    setOpenViewModal(true);
  };

  return (
    <div className="postSide">
      <Box sx={{ mb: 2, position: "relative" }}>
        <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
          My Day
        </Typography>
        <Box sx={{ display: "flex", gap: 2, overflow: "hidden" }}>
          {visibleCardItems.map((item, index) => {
            if (item.type === "create") {
              return (
                <Box
                  key="create-story"
                  className="story-card"
                  sx={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    overflow: "hidden",
                    position: "relative",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    border: "2px solid #ccc",
                  }}
                  onClick={() => setOpenCreateModal(true)}
                >
                  <Avatar
                    src={users[user.ID]?.profilePicture || ""}
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      bgcolor: "rgba(255,255,255,0.8)",
                      borderRadius: "50%",
                      p: 1,
                    }}
                  >
                    <AddCircleIcon sx={{ fontSize: 30, color: "#4267B2" }} />
                  </Box>
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      width: "100%",
                      bgcolor: "rgba(0,0,0,0.5)",
                      color: "white",
                      textAlign: "center",
                      py: 0.5,
                    }}
                  >
                    <Typography variant="caption">Create Story</Typography>
                  </Box>
                </Box>
              );
            }

            const userStories = groupedStories[item.userID] || [];
            const latestStory = userStories[0];

            return (
              <Box
                key={item.userID}
                className="story-card"
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  overflow: "hidden",
                  position: "relative",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  border: "3px solid #4267B2",
                }}
                onClick={() => handleViewStories(item.userID)}
              >
                <Avatar
                  src={
                    latestStory?.Image
                      ? `${latestStory.Image}`
                      : users[item.userID]?.profilePicture || ""
                  }
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    width: "100%",
                    bgcolor: "rgba(0,0,0,0.5)",
                    color: "white",
                    textAlign: "center",
                    py: 0.5,
                  }}
                >
                  <Typography variant="caption">
                    {item.userID === user.ID
                      ? "Your Story"
                      : users[item.userID]?.username || "Unknown"}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
        {totalSlides > 1 && (
          <>
            <IconButton
              onClick={handlePrevSlide}
              disabled={currentSlide === 0}
              sx={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                bgcolor: "rgba(255,255,255,0.7)",
              }}
            >
              <ArrowBackIosIcon />
            </IconButton>
            <IconButton
              onClick={handleNextSlide}
              disabled={currentSlide >= totalSlides - 1}
              sx={{
                position: "absolute",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                bgcolor: "rgba(255,255,255,0.7)",
              }}
            >
              <ArrowForwardIosIcon />
            </IconButton>
          </>
        )}
      </Box>
      <Modal
        open={openCreateModal}
        onClose={() => setOpenCreateModal(false)}
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Box sx={{ bgcolor: "white", p: 3, borderRadius: 2, width: 400 }}>
          <StoryCreate
            onClose={() => setOpenCreateModal(false)}
            onStoryCreated={handleStoryCreated}
          />
        </Box>
      </Modal>
      <StoryModal
        open={openViewModal}
        onClose={() => setOpenViewModal(false)}
        stories={selectedUserStories}
        users={users}
      />
    </div>
  );
};

export default Story;
