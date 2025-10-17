import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllPosts, getFollowingPosts } from "../../actions/postAction";
import { useParams } from "react-router-dom";
import Post from "../post/Post";
import { Tabs, Tab, Box } from "@mui/material";
import { motion } from "framer-motion";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ExploreIcon from "@mui/icons-material/Explore";
import "./posts.css";

const Posts = () => {
  const params = useParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.authReducer.authData);
  const [activeTab, setActiveTab] = useState(0);

  let { posts, loading } = useSelector((state) => state.postReducer);

  // Fetch posts based on active tab and route
  useEffect(() => {
    // On profile page: always fetch all posts (we'll filter locally)
    if (params.id) {
      dispatch(getAllPosts());
      return;
    }

    // On home: fetch based on tab; following requires user ID
    if (activeTab === 0) {
      dispatch(getAllPosts());
    } else if (user?.ID) {
      dispatch(getFollowingPosts(user.ID));
    }
  }, [activeTab, params.id, user?.ID, dispatch]);

  const allMembersId = posts?.map((pd) => pd.UserID);

  if (!posts) return "No Posts";

  // Filter posts based on profile view (if viewing someone's profile)
  let filteredPosts = [...posts];
  if (params.id) {
    const targetIdStr = String(params.id);
    filteredPosts = posts?.filter(
      (post) => String(post.UserID) === targetIdStr
    );
  }

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

  // Sort posts by date (latest first) - backend already does this for "all" and "following"
  // But we sort again to ensure consistency
  filteredPosts = filteredPosts.sort((a, b) => {
    const dateA = new Date(a.CreatedAt || a.createdAt);
    const dateB = new Date(b.CreatedAt || b.createdAt);
    return dateB - dateA; // Descending order (latest first)
  });

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <div className="posts">
      {/* Show tabs only when not on profile page - ALWAYS SHOW TABS */}
      {!params.id && (
        <Box
          className="posts-tabs-container"
          sx={{
            borderBottom: 1,
            borderColor: isDarkTheme ? "#404040" : "divider",
            marginBottom: "1.5rem",
            backgroundColor: isDarkTheme ? "#2c2c2c" : "#ffffff",
            borderRadius: "12px",
            padding: "8px",
            boxShadow: isDarkTheme
              ? "0 4px 12px rgba(0, 0, 0, 0.3)"
              : "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="posts tabs"
            sx={{
              "& .MuiTabs-indicator": {
                backgroundColor: isDarkTheme ? "#f5c32c" : "#1976d2",
                height: "3px",
                borderRadius: "3px 3px 0 0",
              },
              "& .MuiTab-root": {
                color: isDarkTheme ? "#b0b0b0" : "#666666",
                fontWeight: 600,
                fontSize: "0.95rem",
                textTransform: "none",
                minHeight: "48px",
                transition: "all 0.3s ease",
                "&:hover": {
                  color: isDarkTheme ? "#ffffff" : "#000000",
                  backgroundColor: isDarkTheme
                    ? "rgba(245, 195, 44, 0.1)"
                    : "rgba(25, 118, 210, 0.1)",
                },
                "&.Mui-selected": {
                  color: isDarkTheme ? "#f5c32c" : "#1976d2",
                },
              },
            }}
          >
            <Tab label="Latest Posts" />
            <Tab label="Following Posts" />
          </Tabs>
        </Box>
      )}

      {/* Content Area - Loading, Empty, or Posts */}
      <div className="posts-content-wrapper">
        {loading ? (
          <div
            className="posts-loading"
            style={{ color: isDarkTheme ? "#ffffff" : "#000000" }}
          >
            Loading...
          </div>
        ) : filteredPosts.length === 0 ? (
          <motion.div
            className="posts-empty-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {activeTab === 1 ? (
              // Following Posts Empty State
              <div className="empty-state-container">
                <motion.div
                  className="empty-state-icon-wrapper"
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <PersonAddIcon
                    className="empty-state-icon"
                    sx={{
                      fontSize: 80,
                      color: isDarkTheme ? "#f5c32c" : "#1976d2",
                      filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
                    }}
                  />
                </motion.div>
                <motion.h3
                  className="empty-state-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{ color: isDarkTheme ? "#ffffff" : "#000000" }}
                >
                  You're not following anyone yet
                </motion.h3>
                <motion.p
                  className="empty-state-description"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{ color: isDarkTheme ? "#b0b0b0" : "#666666" }}
                >
                  Start following people to see their posts in your personalized
                  feed. Discover amazing content from people you care about!
                </motion.p>
                <motion.div
                  className="empty-state-suggestions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="suggestion-card">
                    <ExploreIcon sx={{ fontSize: 24, marginBottom: 1 }} />
                    <span>
                      Explore the "Latest Posts" tab to discover users
                    </span>
                  </div>
                  <div className="suggestion-card">
                    <PersonAddIcon sx={{ fontSize: 24, marginBottom: 1 }} />
                    <span>
                      Visit profiles and click follow to build your feed
                    </span>
                  </div>
                </motion.div>
                <motion.div
                  className="floating-particles"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="particle"
                      animate={{
                        y: [0, -30, 0],
                        x: [0, Math.random() * 20 - 10, 0],
                        opacity: [0.3, 0.8, 0.3],
                      }}
                      transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                      style={{
                        left: `${15 + i * 15}%`,
                      }}
                    />
                  ))}
                </motion.div>
              </div>
            ) : (
              // Latest Posts Empty State
              <div className="empty-state-container">
                <motion.div
                  className="empty-state-icon-wrapper"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <ExploreIcon
                    className="empty-state-icon"
                    sx={{
                      fontSize: 80,
                      color: isDarkTheme ? "#f5c32c" : "#1976d2",
                    }}
                  />
                </motion.div>
                <motion.h3
                  className="empty-state-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{ color: isDarkTheme ? "#ffffff" : "#000000" }}
                >
                  No posts yet
                </motion.h3>
                <motion.p
                  className="empty-state-description"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{ color: isDarkTheme ? "#b0b0b0" : "#666666" }}
                >
                  Be the first to post something amazing!
                </motion.p>
              </div>
            )}
          </motion.div>
        ) : (
          filteredPosts.map((post, id) => (
            <Post
              data={post}
              id={id}
              key={post.ID || id}
              allMembersId={allMembersId}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Posts;
