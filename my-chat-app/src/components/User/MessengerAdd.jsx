import { Card } from "@mantine/core";
import {
  CardActions,
  CardContent,
  CardMedia,
  Typography,
  Fade,
  Zoom,
} from "@mui/material";
import axios from "axios";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import Grid from "@mui/material/Unstable_Grid2";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import "./MessengerAdd.css";

const MessengerAdd = ({ message, theme }) => {
  const publicFolder = process.env.REACT_APP_PUBLIC_FOLDER;
  const { user } = useSelector((state) => state.authReducer.authData);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

  const MySwal = withReactContent(Swal);

  const handleSubmit = async () => {
    if (isAdding || isAdded) return;

    setIsAdding(true);

    const newMember = {
      senderId: user.ID,
      receiverId: message.ID,
    };

    try {
      const profile = JSON.parse(localStorage.getItem("profile"));
      await axios.post(
        `https://${process.env.REACT_APP_API_URL}/api/chat`,
        newMember,
        {
          headers: {
            Authorization: `Bearer ${profile.token}`,
          },
        }
      );

      setIsAdded(true);
      setIsAdding(false);

      // Show success notification with theme styling
      MySwal.fire({
        title: "🎉 Success!",
        text: `${message.Username} has been added to your messengers!`,
        icon: "success",
        background: isDarkTheme ? "#2c2c2c" : "#ffffff",
        color: isDarkTheme ? "#ffffff" : "#000000",
        confirmButtonColor: isDarkTheme ? "#f5c32c" : "#1976d2",
        confirmButtonText: "Great!",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch (error) {
      setIsAdding(false);

      // Show error notification with theme styling
      MySwal.fire({
        title: "⚠️ Error!",
        text: "Something went wrong. Please try again.",
        icon: "error",
        background: isDarkTheme ? "#2c2c2c" : "#ffffff",
        color: isDarkTheme ? "#ffffff" : "#000000",
        confirmButtonColor: isDarkTheme ? "#ff7875" : "#d32f2f",
        confirmButtonText: "Try Again",
      });
    }
  };

  return (
    <Fade in={true}>
      <div className="messenger-add-wrapper">
        <Card
          className={`messenger-card ${isDarkTheme ? "dark" : "light"} ${
            isAdded ? "added" : ""
          }`}
        >
          <div className="card-image-container">
            <CardMedia
              component="img"
              image={
                message.ProfilePicture
                  ? message.ProfilePicture
                  : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
              }
              alt={`${message.Username}'s profile`}
              className="profile-image"
              onLoad={() => setImageLoaded(true)}
              style={{
                opacity: imageLoaded ? 1 : 0,
                transition: "opacity 0.3s ease",
              }}
            />
            <div className="image-overlay">
              <div className="online-status"></div>
              {!imageLoaded && (
                <div className="image-skeleton">
                  <div className="skeleton-animation"></div>
                </div>
              )}
            </div>
          </div>

          <CardContent className="card-content">
            <div className="user-info">
              <Typography
                gutterBottom
                variant="h6"
                component="div"
                className="username"
              >
                {message.Username}
              </Typography>

              <div className="user-details">
                {message.Location && (
                  <div className="detail-item">
                    <LocationOnIcon className="detail-icon" />
                    <span className="detail-text">{message.Location}</span>
                  </div>
                )}

                <div className="user-stats">
                  <span className="stat-badge">
                    👥 {message?.Friends?.length || 0} friends
                  </span>
                  <span className="stat-badge">
                    👥 {message?.Followers?.length || 0} followers
                  </span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardActions className="card-actions">
            <button
              className={`add-messenger-btn ${
                isAdding ? "loading" : isAdded ? "added" : "default"
              }`}
              onClick={handleSubmit}
              disabled={isAdding || isAdded}
              aria-label={
                isAdded
                  ? "Messenger added"
                  : isAdding
                  ? "Adding messenger..."
                  : `Add ${message.Username} to messengers`
              }
            >
              <span className="btn-icon">
                {isAdding ? (
                  <div className="loading-spinner"></div>
                ) : isAdded ? (
                  <CheckCircleIcon />
                ) : (
                  <PersonAddIcon />
                )}
              </span>
              <span className="btn-text">
                {isAdding ? "Adding..." : isAdded ? "Added!" : "Add Messenger"}
              </span>
            </button>
          </CardActions>

          {isAdded && (
            <div className="success-overlay">
              <div className="success-message">
                ✅ Successfully added to your messengers!
              </div>
            </div>
          )}
        </Card>
      </div>
    </Fade>
  );
};

export default MessengerAdd;
