import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { followUser, unfollowUser } from "../../actions/userAction";
import {
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Alert,
  Chip,
  Avatar,
  Zoom,
  Fade,
} from "@mui/material";
import { getFriendRequests, sendFriendRequest } from "../../api/MessageRequest";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonIcon from "@mui/icons-material/Person";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EmailIcon from "@mui/icons-material/Email";
import "./user.css";

const User = ({ person }) => {
  const publicFolder = process.env.REACT_APP_PUBLIC_FOLDER;
  const { user } = useSelector((state) => state.authReducer.authData);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  console.log(person);

  const [following, setFollowing] = useState(
    person.Followers?.includes(user?.ID)
  );
  const [requestStatus, setRequestStatus] = useState("none"); // none, pending, sent, friend
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

  // Check friend request status
  useEffect(() => {
    const checkFriendStatus = async () => {
      try {
        if (person.Friends?.includes(user.ID)) {
          setRequestStatus("friend");
          return;
        }
        const { data } = await getFriendRequests();
        const hasPending = data.some(
          (req) =>
            req.senderId === user.ID &&
            req.receiverId === person.ID &&
            req.status === "pending"
        );
        setRequestStatus(hasPending ? "pending" : "none");
        setError(null);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to check friend request status"
        );
      }
    };
    if (user?.ID && person?.ID && user.ID !== person.ID) checkFriendStatus();
  }, [user?.ID, person?.ID]);

  // Handle follow/unfollow
  const handleFollow = () => {
    following
      ? dispatch(unfollowUser(person.ID, user))
      : dispatch(followUser(person.ID, user));
    setFollowing((prev) => !prev);
  };

  // Handle send friend request
  const handleSendRequest = async () => {
    try {
      await sendFriendRequest(person.ID);
      setRequestStatus("sent");
      setError(null);
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to send friend request"
      );
    }
  };

  // Handle visit profile
  const handleVisitProfile = () => {
    navigate(`/profile/${person?.ID}`);
  };

  // Format last seen time
  const getLastSeenText = () => {
    if (!person.lastSeen) return "Recently active";
    const now = new Date();
    const lastSeen = new Date(person.lastSeen);
    const diffHours = Math.floor((now - lastSeen) / (1000 * 60 * 60));

    if (diffHours < 1) return "Active now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  // Get status color based on activity
  const getStatusColor = () => {
    if (person.isOnline) return "#2ECC71";
    if (!person.lastSeen) return "#f5c32c";
    const now = new Date();
    const lastSeen = new Date(person.lastSeen);
    const diffHours = Math.floor((now - lastSeen) / (1000 * 60 * 60));

    if (diffHours < 24) return "#f5c32c";
    return "#666666";
  };

  return (
    <Fade in={true} timeout={600}>
      <Card
        className={`user-card ${isDarkTheme ? "dark" : "light"} ${
          isHovered ? "hovered" : ""
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Card Header with Image */}
        <div className="card-header">
          <div className="image-container">
            <CardMedia
              component="img"
              image={
                person.ProfilePicture
                  ? person.ProfilePicture
                  : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
              }
              alt={`${person?.Username}'s profile`}
              className="profile-image"
              onLoad={() => setImageLoaded(true)}
              style={{
                opacity: imageLoaded ? 1 : 0,
                transition: "opacity 0.3s ease",
              }}
            />

            {/* Status Indicator */}
            <div
              className="status-indicator"
              style={{ backgroundColor: getStatusColor() }}
            ></div>

            {/* Image Overlay */}
            <div className="image-overlay">
              <PersonIcon className="overlay-icon" />
            </div>

            {!imageLoaded && (
              <div className="image-skeleton">
                <div className="skeleton-pulse"></div>
              </div>
            )}
          </div>

          {/* Mutual Friends Badge */}
          {person.mutualFriends > 0 && (
            <Chip
              label={`${person.mutualFriends} mutual friends`}
              size="small"
              className="mutual-friends-chip"
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                backgroundColor: isDarkTheme
                  ? "rgba(245, 195, 44, 0.9)"
                  : "rgba(25, 118, 210, 0.9)",
                color: isDarkTheme ? "#000000" : "#ffffff",
                fontWeight: 600,
                fontSize: "0.7rem",
              }}
            />
          )}
        </div>

        <CardContent className="card-content">
          {error && (
            <Alert severity="error" className="error-alert" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* User Info */}
          <div className="user-info">
            <Typography variant="h6" component="div" className="username">
              {person?.Username}
            </Typography>

            <div className="user-status">
              <AccessTimeIcon className="status-icon" />
              <span className="status-text">{getLastSeenText()}</span>
            </div>
          </div>

          {/* Additional Details */}
          <Zoom in={showDetails || isHovered}>
            <div className="user-details">
              {person.Location && (
                <div className="detail-item">
                  <LocationOnIcon className="detail-icon" />
                  <span className="detail-text">{person.Location}</span>
                </div>
              )}

              <div className="stats-row">
                <div className="stat-item">
                  <span className="stat-number">
                    {person?.Friends?.length || 0}
                  </span>
                  <span className="stat-label">Friends</span>
                </div>
              </div>
            </div>
          </Zoom>
        </CardContent>

        <CardActions className="card-actions">
          <div className="action-buttons">
            {/* Visit Profile Button */}
            {user.ID !== person.ID && (
              <Button
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVisitProfile();
                }}
                className="action-btn visit-btn"
                startIcon={<PersonIcon />}
                sx={{
                  borderColor: isDarkTheme ? "#555555" : "#e0e0e0",
                  color: isDarkTheme ? "#ffffff" : "#000000",
                  "&:hover": {
                    borderColor: isDarkTheme ? "#f5c32c" : "#1976d2",
                    color: isDarkTheme ? "#f5c32c" : "#1976d2",
                    backgroundColor: isDarkTheme
                      ? "rgba(245, 195, 44, 0.1)"
                      : "rgba(25, 118, 210, 0.1)",
                  },
                }}
              >
                Profile
              </Button>
            )}

            {/* Follow/Unfollow Button */}
            <Button
              variant={following ? "outlined" : "contained"}
              onClick={(e) => {
                e.stopPropagation();
                handleFollow();
              }}
              className={`action-btn follow-btn ${
                following ? "following" : "not-following"
              }`}
              startIcon={following ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              sx={{
                backgroundColor: following
                  ? "transparent"
                  : isDarkTheme
                  ? "#f5c32c"
                  : "#1976d2",
                borderColor: following
                  ? isDarkTheme
                    ? "#ff7875"
                    : "#d32f2f"
                  : isDarkTheme
                  ? "#f5c32c"
                  : "#1976d2",
                color: following
                  ? isDarkTheme
                    ? "#ff7875"
                    : "#d32f2f"
                  : isDarkTheme
                  ? "#000000"
                  : "#ffffff",
                "&:hover": {
                  backgroundColor: following
                    ? isDarkTheme
                      ? "rgba(255, 120, 117, 0.1)"
                      : "rgba(211, 47, 47, 0.1)"
                    : isDarkTheme
                    ? "#e6b029"
                    : "#1565c0",
                  transform: "translateY(-2px)",
                },
              }}
            >
              {following ? "Unfollow" : "Follow"}
            </Button>
          </div>

          {/* Friend Request Button */}
          {user.ID !== person.ID && (
            <Button
              variant="contained"
              onClick={(e) => {
                e.stopPropagation();
                handleSendRequest();
              }}
              disabled={requestStatus !== "none"}
              className={`action-btn friend-request-btn ${requestStatus}`}
              startIcon={
                requestStatus === "friend" ? (
                  <CheckCircleIcon />
                ) : requestStatus === "pending" || requestStatus === "sent" ? (
                  <CheckCircleIcon />
                ) : (
                  <PersonAddIcon />
                )
              }
              sx={{
                backgroundColor:
                  requestStatus === "friend"
                    ? "#2ECC71"
                    : requestStatus === "pending" || requestStatus === "sent"
                    ? "#f5c32c"
                    : isDarkTheme
                    ? "#4a90e2"
                    : "#1976d2",
                color: "#ffffff",
                width: "100%",
                "&:hover": {
                  backgroundColor:
                    requestStatus === "friend"
                      ? "#27AE60"
                      : requestStatus === "pending" || requestStatus === "sent"
                      ? "#e6b029"
                      : isDarkTheme
                      ? "#5ba3f5"
                      : "#1565c0",
                  transform:
                    requestStatus === "none" ? "translateY(-2px)" : "none",
                },
                "&:disabled": {
                  backgroundColor: isDarkTheme ? "#555555" : "#cccccc",
                  color: isDarkTheme ? "#888888" : "#999999",
                },
              }}
            >
              {requestStatus === "friend"
                ? "Friends"
                : requestStatus === "pending" || requestStatus === "sent"
                ? "Request Sent"
                : "Add Friend"}
            </Button>
          )}
        </CardActions>

        {/* Hover Glow Effect */}
        <div className="card-glow"></div>
      </Card>
    </Fade>
  );
};

export default User;
