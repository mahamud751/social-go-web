import axios from "axios";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import "./addMember.css";
const AddMember = ({ person }) => {
  const publicFolder = process.env.REACT_APP_PUBLIC_FOLDER;
  const { user } = useSelector((state) => state.authReducer.authData);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

  const MySwal = withReactContent(Swal);
  const handleSubmit = async (e) => {
    if (isAdding || isAdded) return;

    setIsAdding(true);

    const newMember = {
      senderId: user.ID,
      receiverId: person.ID,
    };

    try {
      const response = await axios.post(
        `https://${process.env.REACT_APP_API_URL}/api/chat`,
        newMember
      );

      setIsAdded(true);
      setIsAdding(false);

      // Show success notification with theme styling
      MySwal.fire({
        title: "🎉 Success!",
        text: `${person.Username} has been successfully added to your chat!`,
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
    <div
      className={`add-member-card ${isDarkTheme ? "dark" : "light"} ${
        isAdded ? "added" : ""
      }`}
    >
      <div className="member-info">
        <div className="avatar-container">
          <img
            src={
              person.ProfilePicture
                ? publicFolder + person.ProfilePicture
                : publicFolder + "defaultProfile.png"
            }
            alt={`${person.Username}'s profile`}
            className="member-avatar"
            loading="lazy"
          />
          <div className="status-indicator"></div>
        </div>

        <div className="member-details">
          <h3 className="member-name">{person.Username}</h3>
          <p className="member-status">
            {person.Email ? person.Email : "Available to chat"}
          </p>
          <div className="member-stats">
            <span className="stat-item">
              👥 {person.FriendsCount || 0} friends
            </span>
            <span className="stat-item">💬 {person.PostsCount || 0} posts</span>
          </div>
        </div>
      </div>

      <div className="action-container">
        <button
          className={`add-member-btn ${
            isAdding ? "loading" : isAdded ? "added" : "default"
          }`}
          onClick={handleSubmit}
          disabled={isAdding || isAdded}
          aria-label={
            isAdded
              ? "Member added"
              : isAdding
              ? "Adding member..."
              : `Add ${person.Username} to chat`
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
            {isAdding ? "Adding..." : isAdded ? "Added!" : "Add Member"}
          </span>
        </button>

        {!isAdded && (
          <div className="member-actions">
            <button
              className="secondary-btn view-profile"
              aria-label={`View ${person.Username}'s profile`}
            >
              👤 View Profile
            </button>
          </div>
        )}
      </div>

      {isAdded && (
        <div className="success-indicator">
          <div className="success-message">
            ✅ {person.Username} is now in your chat list!
          </div>
        </div>
      )}
    </div>
  );
};

export default AddMember;
