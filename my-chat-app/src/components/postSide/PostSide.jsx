import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Container,
  Fade,
  Zoom,
  Slide,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingIcon,
  AutoStories as StoriesIcon,
} from "@mui/icons-material";
import Posts from "../posts/Posts";
import PostShare from "../postShare/PostShare";
import Story from "../story/Story";
import "./postSide.css";

const PostSide = ({ isCurrentUser }) => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState("posts");

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

  const showPostShare = isCurrentUser || location.pathname === "/home";

  // Initialize animations
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle refresh animation
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      // Add refresh logic here if needed
    }, 1500);
  };

  // Section visibility handler
  const handleSectionView = (section) => {
    setActiveSection(section);
  };

  return (
    <div className={`postSide ${isDarkTheme ? "dark" : "light"}`}>
      {/* Enhanced Header Section */}
      <Fade in={isVisible} timeout={600}>
        <div className="postSide-header">
          <div className="header-content">
            <div className="title-section">
              <div className="icon-container">
                <TrendingIcon className="section-icon" />
                <div className="icon-glow"></div>
              </div>
              <Typography
                variant="h4"
                component="h1"
                className="main-title"
                sx={{
                  color: "var(--post-side-text) !important",
                  background: `linear-gradient(45deg, var(--post-side-accent), var(--post-side-primary))`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundSize: "200% 200%",
                  animation: "textShimmer 3s ease-in-out infinite",
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                Feed
              </Typography>
            </div>

            <div className="header-actions">
              <Tooltip title="Refresh Feed" arrow>
                <IconButton
                  onClick={handleRefresh}
                  className={`refresh-button ${
                    isRefreshing ? "refreshing" : ""
                  }`}
                  sx={{
                    color: "var(--post-side-accent)",
                    "&:hover": {
                      backgroundColor: "var(--post-side-hover-bg)",
                      transform: "scale(1.1)",
                    },
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </div>
      </Fade>

      {/* Enhanced Content Container */}
      <Container className="postSide-container" maxWidth={false}>
        {/* Post Share Section */}
        {showPostShare && (
          <Zoom in={isVisible} style={{ transitionDelay: "200ms" }}>
            <div
              className="section-wrapper post-share-section"
              onMouseEnter={() => handleSectionView("share")}
            >
              <div className="section-header">
                <StoriesIcon className="section-icon-small" />
                <Typography
                  variant="h6"
                  className="section-title"
                  sx={{
                    color: "var(--post-side-text) !important",
                    fontWeight: 600,
                  }}
                >
                  Share Your Thoughts
                </Typography>
              </div>
              <div className="content-wrapper">
                <PostShare />
              </div>
            </div>
          </Zoom>
        )}

        {/* Stories Section */}
        <Slide
          direction="up"
          in={isVisible}
          timeout={800}
          style={{ transitionDelay: "400ms" }}
        >
          <div
            className="section-wrapper story-section"
            onMouseEnter={() => handleSectionView("stories")}
          >
            <div className="section-header">
              <StoriesIcon className="section-icon-small" />
              <Typography
                variant="h6"
                className="section-title"
                sx={{
                  color: "var(--post-side-text) !important",
                  fontWeight: 600,
                }}
              >
                Stories
              </Typography>
            </div>
            <div className="content-wrapper">
              <Story />
            </div>
          </div>
        </Slide>

        {/* Posts Section */}
        <Fade
          in={isVisible}
          timeout={1000}
          style={{ transitionDelay: "600ms" }}
        >
          <div
            className="section-wrapper posts-section"
            onMouseEnter={() => handleSectionView("posts")}
          >
            <div className="section-header">
              <TrendingIcon className="section-icon-small" />
              <Typography
                variant="h6"
                className="section-title"
                sx={{
                  color: "var(--post-side-text) !important",
                  fontWeight: 600,
                }}
              >
                Latest Posts
              </Typography>
            </div>
            <div className="content-wrapper posts-content">
              <Posts />
            </div>
          </div>
        </Fade>
      </Container>

      {/* Floating Action Elements */}
      <div className="floating-elements">
        <div className="scroll-indicator">
          <div className="scroll-progress"></div>
        </div>
      </div>

      {/* Background Effects */}
      <div className="background-effects">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
    </div>
  );
};

export default PostSide;
