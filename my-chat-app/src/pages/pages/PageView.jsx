import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getPage,
  likePage,
  updatePage,
  deletePage,
} from "../../api/PageRequest";
import {
  getPagePosts,
  createPagePost,
  deletePagePost,
  likePagePost,
  createPageComment,
  getPageComments,
  deletePageComment,
  likePageComment,
} from "../../api/PageRequest";
import { motion } from "framer-motion";
import axios from "axios";
import "./PageView.css";

const reactions = {
  like: { emoji: "👍", label: "Like" },
  love: { emoji: "❤️", label: "Love" },
  haha: { emoji: "😂", label: "Haha" },
  wow: { emoji: "😮", label: "Wow" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😠", label: "Angry" },
};

const PageView = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({ desc: "", image: "" });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [postImage, setPostImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const [commentModalOpen, setCommentModalOpen] = useState(null);
  const [reactionHoverTimeout, setReactionHoverTimeout] = useState(null);
  const postImageRef = useRef();
  const profileImageRef = useRef();
  const coverImageRef = useRef();
  const user = JSON.parse(localStorage.getItem("profile"));
  const isDarkTheme =
    document.documentElement.getAttribute("data-theme") === "dark";

  useEffect(() => {
    fetchPageData();
  }, [pageId]);

  const fetchPageData = async () => {
    try {
      const pageRes = await getPage(pageId);
      setPage(pageRes.data);
      setEditData(pageRes.data);

      const postsRes = await getPagePosts(pageId);
      setPosts(postsRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching page:", error);
      setLoading(false);
    }
  };

  const handleLikePage = async () => {
    try {
      await likePage(pageId);
      fetchPageData();
    } catch (error) {
      console.error("Error liking page:", error);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let postData = { pageId, ...newPost };

      // Upload post image if exists
      if (postImage) {
        const formData = new FormData();
        const filename = Date.now() + postImage.name;
        formData.append("name", filename);
        formData.append("file", postImage);
        formData.append("upload_preset", "upload");

        const uploadRes = await axios.post(
          "https://api.cloudinary.com/v1_1/dsj99epbt/image/upload",
          formData
        );
        postData.image = uploadRes.data.url;
      }

      await createPagePost(postData);
      setNewPost({ desc: "", image: "" });
      setPostImage(null);
      setUploading(false);
      fetchPageData();
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Are you the page owner?");
      setUploading(false);
    }
  };

  const onPostImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      let img = event.target.files[0];
      setPostImage(img);
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

  const handleDeletePost = async (postId) => {
    if (window.confirm("Delete this post?")) {
      try {
        await deletePagePost(postId);
        fetchPageData();
      } catch (error) {
        console.error("Error deleting post:", error);
      }
    }
  };

  const handleReactionMouseEnter = (postId) => {
    if (reactionHoverTimeout) clearTimeout(reactionHoverTimeout);
    setShowReactions(postId);
  };

  const handleReactionMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowReactions(null);
    }, 200);
    setReactionHoverTimeout(timeout);
  };

  const handleLikePost = async (postId, reactionType) => {
    try {
      await likePagePost(postId, reactionType);
      fetchPageData();
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const getTotalReactions = (reactionsObj) => {
    if (!reactionsObj) return 0;
    return Object.values(reactionsObj).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );
  };

  const getReactionBreakdown = (reactionsObj) => {
    if (!reactionsObj) return [];
    return Object.entries(reactionsObj)
      .filter(([_, users]) => users && users.length > 0)
      .map(([type, users]) => ({
        emoji: reactions[type]?.emoji || "👍",
        count: users.length,
        type: type,
      }));
  };

  const handleUpdatePage = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let updateData = { ...editData };

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
        updateData.ProfilePicture = profileUploadRes.data.url;
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
        updateData.CoverPicture = coverUploadRes.data.url;
      }

      await updatePage(pageId, updateData);
      setShowEditModal(false);
      setProfileImage(null);
      setCoverImage(null);
      setUploading(false);
      fetchPageData();
    } catch (error) {
      console.error("Error updating page:", error);
      alert("Failed to update page");
      setUploading(false);
    }
  };

  const handleDeletePage = async () => {
    if (window.confirm("Are you sure you want to delete this page?")) {
      try {
        await deletePage(pageId);
        navigate("/pages");
      } catch (error) {
        console.error("Error deleting page:", error);
        alert("Failed to delete page");
      }
    }
  };

  const loadComments = async (postId) => {
    try {
      const { data } = await getPageComments(postId);
      setComments((prev) => ({ ...prev, [postId]: data || [] }));
      setCommentModalOpen(postId);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleAddComment = async (postId) => {
    if (!newComment[postId]?.trim()) return;
    try {
      await createPageComment({ pagePostId: postId, text: newComment[postId] });
      setNewComment((prev) => ({ ...prev, [postId]: "" }));
      loadComments(postId);
      fetchPageData();
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleDeleteComment = async (commentId, postId) => {
    try {
      await deletePageComment(commentId);
      loadComments(postId);
      fetchPageData();
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const isOwner = user?.user?.ID === page?.OwnerID;

  if (loading) return <div className="loading">Loading page...</div>;
  if (!page) return <div className="error">Page not found</div>;

  const totalReactions = (reactions) => {
    if (!reactions) return 0;
    return Object.values(reactions).reduce((sum, arr) => sum + arr.length, 0);
  };

  return (
    <div className="page-view-container">
      {/* Page Header */}
      <div className="page-header-section">
        {page.CoverPicture && (
          <img
            src={page.CoverPicture}
            alt="Cover"
            className="page-cover-image"
          />
        )}
        <div className="page-info-section">
          {page.ProfilePicture && (
            <img
              src={page.ProfilePicture}
              alt={page.Name}
              className="page-profile-image"
            />
          )}
          <div className="page-details">
            <h1>
              {page.Name}{" "}
              {page.Verified && <span className="verified-badge">✓</span>}
            </h1>
            <p className="page-category-text">{page.Category}</p>
            <p className="page-likes-text">
              {page.Likes || 0} people like this
            </p>
          </div>
          <div className="page-actions">
            <button className="btn btn-primary" onClick={handleLikePage}>
              {page.Followers?.includes(user?.user?.ID) ? "Unlike" : "Like"}{" "}
              Page
            </button>
            {isOwner && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(true)}
                >
                  Edit Page
                </button>
                <button className="btn btn-danger" onClick={handleDeletePage}>
                  Delete Page
                </button>
              </>
            )}
          </div>
        </div>
        {page.Description && (
          <div className="page-description-section">
            <h3>About</h3>
            <p>{page.Description}</p>
          </div>
        )}
      </div>

      {/* Create Post (Owner Only) */}
      {isOwner && (
        <motion.div
          className="create-post-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3>Create Post</h3>
          <form onSubmit={handleCreatePost}>
            <textarea
              value={newPost.desc}
              onChange={(e) => setNewPost({ ...newPost, desc: e.target.value })}
              placeholder="What's on your mind?"
              rows="3"
            />
            <div className="image-upload-section">
              <button
                type="button"
                className="btn btn-upload"
                onClick={() => postImageRef.current.click()}
              >
                📷 Add Photo
              </button>
              <input
                type="file"
                ref={postImageRef}
                onChange={onPostImageChange}
                accept="image/*"
                style={{ display: "none" }}
              />
              {postImage && (
                <div className="image-preview">
                  <img
                    src={URL.createObjectURL(postImage)}
                    alt="Post Preview"
                  />
                  <button
                    type="button"
                    className="remove-image"
                    onClick={() => setPostImage(null)}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading}
            >
              {uploading ? "Posting..." : "Post"}
            </button>
          </form>
        </motion.div>
      )}

      {/* Posts Feed */}
      <div className="posts-feed">
        <h3>Posts</h3>
        {posts.length === 0 ? (
          <div className="no-posts">No posts yet.</div>
        ) : (
          posts.map((post, index) => (
            <motion.div
              key={post.ID}
              className="post-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="post-header">
                <div className="post-info">
                  <strong>{page.Name}</strong>
                  <span className="post-time">
                    {new Date(post.CreatedAt).toLocaleDateString()}
                  </span>
                </div>
                {isOwner && (
                  <button
                    className="delete-btn"
                    onClick={() => handleDeletePost(post.ID)}
                  >
                    Delete
                  </button>
                )}
              </div>

              {post.Desc && <p className="post-desc">{post.Desc}</p>}
              {post.Image && (
                <img src={post.Image} alt="Post" className="post-image" />
              )}

              {/* Reaction Summary */}
              {getTotalReactions(post.Reactions) > 0 && (
                <div className="reaction-summary">
                  {getReactionBreakdown(post.Reactions).map((reaction, idx) => (
                    <span
                      key={idx}
                      className="reaction-count"
                      title={`${reaction.count} ${reaction.type}`}
                    >
                      {reaction.emoji} {reaction.count}
                    </span>
                  ))}
                </div>
              )}

              <div className="post-stats">
                <span>{getTotalReactions(post.Reactions)} reactions</span>
                <span>{post.CommentCount || 0} comments</span>
              </div>

              <div className="post-actions">
                <div
                  className="reaction-button-container"
                  onMouseEnter={() => handleReactionMouseEnter(post.ID)}
                  onMouseLeave={handleReactionMouseLeave}
                >
                  <button className="action-btn reaction-btn">👍 React</button>
                  {showReactions === post.ID && (
                    <div
                      className="reaction-picker"
                      onMouseEnter={() => handleReactionMouseEnter(post.ID)}
                      onMouseLeave={handleReactionMouseLeave}
                    >
                      {Object.entries(reactions).map(
                        ([type, { emoji, label }]) => (
                          <button
                            key={type}
                            className="reaction-option"
                            onClick={() => handleLikePost(post.ID, type)}
                            title={label}
                          >
                            {emoji}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
                <button
                  className="action-btn comment-btn"
                  onClick={() => loadComments(post.ID)}
                >
                  💬 Comment
                </button>
              </div>

              {/* Comment Modal */}
              {commentModalOpen === post.ID && comments[post.ID] && (
                <motion.div
                  className="comment-modal-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setCommentModalOpen(null)}
                >
                  <motion.div
                    className="comment-modal"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="comment-modal-header">
                      <h4>💬 Comments ({comments[post.ID].length})</h4>
                      <button
                        className="close-modal"
                        onClick={() => setCommentModalOpen(null)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="comment-modal-body">
                      {comments[post.ID].map((comment) => (
                        <div key={comment.ID} className="modal-comment">
                          <div className="modal-comment-header">
                            <strong>
                              User {comment.UserID.substring(0, 8)}
                            </strong>
                            <span className="comment-time">
                              {new Date(comment.CreatedAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="modal-comment-text">{comment.Text}</p>
                          {comment.UserID === user?.user?.ID && (
                            <button
                              className="delete-comment-btn-modal"
                              onClick={() =>
                                handleDeleteComment(comment.ID, post.ID)
                              }
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="comment-modal-footer">
                      <input
                        type="text"
                        value={newComment[post.ID] || ""}
                        onChange={(e) =>
                          setNewComment({
                            ...newComment,
                            [post.ID]: e.target.value,
                          })
                        }
                        placeholder="✍️ Write a comment..."
                        className="modal-comment-input"
                      />
                      <button
                        className="modal-send-btn"
                        onClick={() => handleAddComment(post.ID)}
                        disabled={!newComment[post.ID]?.trim()}
                      >
                        📤 Send
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Edit Page Modal */}
      {showEditModal && (
        <motion.div
          className="modal-overlay"
          onClick={() => setShowEditModal(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <h2>Edit Page</h2>
            <form onSubmit={handleUpdatePage}>
              <div className="form-group">
                <label>Page Name</label>
                <input
                  type="text"
                  value={editData.Name || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, Name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={editData.Category || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, Category: e.target.value })
                  }
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
                  value={editData.Description || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, Description: e.target.value })
                  }
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
                    📷 Change Profile Picture
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
                    🖼️ Change Cover Picture
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
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default PageView;
