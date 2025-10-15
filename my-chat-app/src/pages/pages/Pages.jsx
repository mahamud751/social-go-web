import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPages, createPage, getUserPages } from "../../api/PageRequest";
import { motion } from "framer-motion";
import axios from "axios";
import "./Pages.css";

const Pages = () => {
  const [allPages, setAllPages] = useState([]);
  const [myPages, setMyPages] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("discover");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("profile"));

  const [newPage, setNewPage] = useState({
    name: "",
    description: "",
    category: "Business",
    profilePicture: "",
    coverPicture: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const profileImageRef = useRef();
  const coverImageRef = useRef();

  useEffect(() => {
    fetchPages();
  }, [activeTab]);

  const fetchPages = async () => {
    setLoading(true);
    try {
      if (activeTab === "discover") {
        const { data } = await getAllPages();
        setAllPages(data || []);
      } else {
        const { data } = await getUserPages(user?.user?.ID);
        setMyPages(data || []);
      }
    } catch (error) {
      console.error("Error fetching pages:", error);
    }
    setLoading(false);
  };

  const handleCreatePage = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let pageData = { ...newPage };

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
        pageData.profilePicture = profileUploadRes.data.url;
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
        pageData.coverPicture = coverUploadRes.data.url;
      }

      await createPage(pageData);
      setShowCreateModal(false);
      setNewPage({
        name: "",
        description: "",
        category: "Business",
        profilePicture: "",
        coverPicture: "",
      });
      setProfileImage(null);
      setCoverImage(null);
      setUploading(false);
      fetchPages();
    } catch (error) {
      console.error("Error creating page:", error);
      alert("Failed to create page");
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

  const handlePageClick = (pageId) => {
    navigate(`/page/${pageId}`);
  };

  const pagesToDisplay = activeTab === "discover" ? allPages : myPages;

  return (
    <div className="pages-container">
      <div className="pages-header">
        <h1>Pages</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Create New Page
        </button>
      </div>

      <div className="pages-tabs">
        <button
          className={`tab ${activeTab === "discover" ? "active" : ""}`}
          onClick={() => setActiveTab("discover")}
        >
          Discover Pages
        </button>
        <button
          className={`tab ${activeTab === "my-pages" ? "active" : ""}`}
          onClick={() => setActiveTab("my-pages")}
        >
          My Pages
        </button>
      </div>

      <div className="pages-grid">
        {loading ? (
          <div className="loading">Loading pages...</div>
        ) : pagesToDisplay.length === 0 ? (
          <div className="no-pages">
            {activeTab === "my-pages"
              ? "You haven't created any pages yet."
              : "No pages available."}
          </div>
        ) : (
          pagesToDisplay.map((page, index) => (
            <motion.div
              key={page.ID}
              className="page-card"
              onClick={() => handlePageClick(page.ID)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
            >
              {page.CoverPicture && (
                <img
                  src={page.CoverPicture}
                  alt="Cover"
                  className="page-cover"
                />
              )}
              <div className="page-card-body">
                {page.ProfilePicture && (
                  <img
                    src={page.ProfilePicture}
                    alt={page.Name}
                    className="page-profile-pic"
                  />
                )}
                <h3>{page.Name}</h3>
                <p className="page-category">{page.Category}</p>
                <p className="page-description">{page.Description}</p>
                <div className="page-stats">
                  <span>{page.Likes || 0} likes</span>
                  {page.Verified && (
                    <span className="verified">✓ Verified</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Page Modal */}
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
            <h2>Create New Page</h2>
            <form onSubmit={handleCreatePage}>
              <div className="form-group">
                <label>Page Name *</label>
                <input
                  type="text"
                  value={newPage.name}
                  onChange={(e) =>
                    setNewPage({ ...newPage, name: e.target.value })
                  }
                  required
                  placeholder="Enter page name"
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  value={newPage.category}
                  onChange={(e) =>
                    setNewPage({ ...newPage, category: e.target.value })
                  }
                  required
                >
                  <option value="Business">Business</option>
                  <option value="Community">Community</option>
                  <option value="Brand">Brand</option>
                  <option value="Artist">Artist</option>
                  <option value="Public Figure">Public Figure</option>
                  <option value="Entertainment">Entertainment</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newPage.description}
                  onChange={(e) =>
                    setNewPage({ ...newPage, description: e.target.value })
                  }
                  placeholder="Describe your page..."
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
                  {uploading ? "Creating..." : "Create Page"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Pages;
