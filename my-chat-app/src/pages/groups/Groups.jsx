import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllGroups,
  createGroup,
  getUserGroups,
} from "../../api/GroupRequest";
import { motion } from "framer-motion";
import axios from "axios";
import "./Groups.css";

const Groups = () => {
  const [allGroups, setAllGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("discover");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("profile"));

  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    privacy: "public",
    profilePicture: "",
    coverPicture: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const profileImageRef = useRef();
  const coverImageRef = useRef();

  useEffect(() => {
    fetchGroups();
  }, [activeTab]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      if (activeTab === "discover") {
        const { data } = await getAllGroups();
        setAllGroups(data || []);
      } else {
        const { data } = await getUserGroups(user?.user?.ID);
        setMyGroups(data || []);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
    setLoading(false);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let groupData = { ...newGroup };

      // Upload profile image if exists
      if (profileImage) {
        const profileFormData = new FormData();
        const profileFilename = Date.now() + profileImage.name;
        profileFormData.append("name", profileFilename);
        profileFormData.append("file", profileImage);
        profileFormData.append("upload_preset", "upload");

        const profileUploadRes = await axios.post(
          "https://api.cloudinary.com/v1_1/dsj99epbt/image/upload",
          profileFormData
        );
        groupData.profilePicture = profileUploadRes.data.url;
      }

      // Upload cover image if exists
      if (coverImage) {
        const coverFormData = new FormData();
        const coverFilename = Date.now() + coverImage.name;
        coverFormData.append("name", coverFilename);
        coverFormData.append("file", coverImage);
        coverFormData.append("upload_preset", "upload");

        const coverUploadRes = await axios.post(
          "https://api.cloudinary.com/v1_1/dsj99epbt/image/upload",
          coverFormData
        );
        groupData.coverPicture = coverUploadRes.data.url;
      }

      await createGroup(groupData);
      setShowCreateModal(false);
      setNewGroup({
        name: "",
        description: "",
        privacy: "public",
        profilePicture: "",
        coverPicture: "",
      });
      setProfileImage(null);
      setCoverImage(null);
      setUploading(false);
      fetchGroups();
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group");
      setUploading(false);
    }
  };

  const onProfileImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      let img = event.target.files[0];
      setProfileImage(img);
    }
  };

  const onCoverImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      let img = event.target.files[0];
      setCoverImage(img);
    }
  };

  const handleGroupClick = (groupId) => {
    navigate(`/group/${groupId}`);
  };

  const groupsToDisplay = activeTab === "discover" ? allGroups : myGroups;

  return (
    <div className="groups-container">
      <div className="groups-header">
        <h1>Groups</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Create New Group
        </button>
      </div>

      <div className="groups-tabs">
        <button
          className={`tab ${activeTab === "discover" ? "active" : ""}`}
          onClick={() => setActiveTab("discover")}
        >
          Discover Groups
        </button>
        <button
          className={`tab ${activeTab === "my-groups" ? "active" : ""}`}
          onClick={() => setActiveTab("my-groups")}
        >
          My Groups
        </button>
      </div>

      <div className="groups-grid">
        {loading ? (
          <div className="loading">Loading groups...</div>
        ) : groupsToDisplay.length === 0 ? (
          <div className="no-groups">
            {activeTab === "my-groups"
              ? "You haven't joined any groups yet."
              : "No groups available."}
          </div>
        ) : (
          groupsToDisplay.map((group, index) => (
            <motion.div
              key={group.ID}
              className="group-card"
              onClick={() => handleGroupClick(group.ID)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
            >
              {group.CoverPicture && (
                <img
                  src={group.CoverPicture}
                  alt="Cover"
                  className="group-cover"
                />
              )}
              <div className="group-card-body">
                {group.ProfilePicture && (
                  <img
                    src={group.ProfilePicture}
                    alt={group.Name}
                    className="group-profile-pic"
                  />
                )}
                <h3>{group.Name}</h3>
                <div className="group-meta">
                  <span className={`privacy-badge ${group.Privacy}`}>
                    {group.Privacy === "public"
                      ? "🌍"
                      : group.Privacy === "private"
                      ? "🔒"
                      : "🔐"}
                    {group.Privacy}
                  </span>
                </div>
                <p className="group-description">{group.Description}</p>
                <div className="group-stats">
                  <span>{group.Members?.length || 0} members</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <motion.div
          className="modal-overlay"
          onClick={() => setShowCreateModal(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <h2>Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label>Group Name *</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, name: e.target.value })
                  }
                  required
                  placeholder="Enter group name"
                />
              </div>

              <div className="form-group">
                <label>Privacy *</label>
                <select
                  value={newGroup.privacy}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, privacy: e.target.value })
                  }
                  required
                >
                  <option value="public">
                    Public - Anyone can see and join
                  </option>
                  <option value="private">
                    Private - Anyone can see, members can join
                  </option>
                  <option value="secret">Secret - Only members can see</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, description: e.target.value })
                  }
                  placeholder="Describe your group..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Profile Picture</label>
                <div className="image-upload-section">
                  <button
                    type="button"
                    className="btn btn-upload"
                    onClick={() => profileImageRef.current.click()}
                  >
                    📷 Choose Profile Picture
                  </button>
                  <input
                    type="file"
                    ref={profileImageRef}
                    onChange={onProfileImageChange}
                    accept="image/*"
                    style={{ display: "none" }}
                  />
                  {profileImage && (
                    <div className="image-preview">
                      <img
                        src={URL.createObjectURL(profileImage)}
                        alt="Profile Preview"
                      />
                      <button
                        type="button"
                        className="remove-image"
                        onClick={() => setProfileImage(null)}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Cover Picture</label>
                <div className="image-upload-section">
                  <button
                    type="button"
                    className="btn btn-upload"
                    onClick={() => coverImageRef.current.click()}
                  >
                    🖼️ Choose Cover Picture
                  </button>
                  <input
                    type="file"
                    ref={coverImageRef}
                    onChange={onCoverImageChange}
                    accept="image/*"
                    style={{ display: "none" }}
                  />
                  {coverImage && (
                    <div className="image-preview cover-preview">
                      <img
                        src={URL.createObjectURL(coverImage)}
                        alt="Cover Preview"
                      />
                      <button
                        type="button"
                        className="remove-image"
                        onClick={() => setCoverImage(null)}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? "Creating..." : "Create Group"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Groups;
