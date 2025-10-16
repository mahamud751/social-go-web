import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getGroup,
  joinGroup,
  leaveGroup,
  inviteMember,
  updateGroup,
  deleteGroup,
} from "../../api/GroupRequest";
import {
  getGroupPosts,
  createGroupPost,
  deleteGroupPost,
  likeGroupPost,
  createGroupComment,
  getGroupComments,
  deleteGroupComment,
} from "../../api/GroupRequest";
import { getAllUser } from "../../api/UserRequest";
import ReactionModal from "../../components/reactions/ReactionModal";
import { motion } from "framer-motion";
import axios from "axios";
import "./GroupView.css";

const reactions = {
  like: { emoji: "👍", label: "Like" },
  love: { emoji: "❤️", label: "Love" },
  haha: { emoji: "😂", label: "Haha" },
  wow: { emoji: "😮", label: "Wow" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😠", label: "Angry" },
};

const GroupView = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({ desc: "", image: "" });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
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
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [selectedPostReactions, setSelectedPostReactions] = useState(null);
  const [reactionTriggerElement, setReactionTriggerElement] = useState(null);
  const postImageRef = useRef();
  const profileImageRef = useRef();
  const coverImageRef = useRef();
  const user = JSON.parse(localStorage.getItem("profile"));
  const isDarkTheme =
    document.documentElement.getAttribute("data-theme") === "dark";

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      const groupRes = await getGroup(groupId);
      setGroup(groupRes.data);
      setEditData(groupRes.data);

      const postsRes = await getGroupPosts(groupId);
      setPosts(postsRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching group:", error);
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    try {
      await joinGroup(groupId);
      fetchGroupData();
    } catch (error) {
      console.error("Error joining group:", error);
      alert(error.response?.data?.message || "Failed to join group");
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm("Are you sure you want to leave this group?")) {
      try {
        await leaveGroup(groupId);
        fetchGroupData();
      } catch (error) {
        console.error("Error leaving group:", error);
        alert(error.response?.data?.message || "Failed to leave group");
      }
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    try {
      await inviteMember(groupId, inviteUserId);
      setShowInviteModal(false);
      setInviteUserId("");
      alert("Invitation sent!");
    } catch (error) {
      console.error("Error inviting member:", error);
      alert(error.response?.data?.message || "Failed to invite member");
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let postData = { groupId, ...newPost };

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

      await createGroupPost(postData);
      setNewPost({ desc: "", image: "" });
      setPostImage(null);
      setUploading(false);
      fetchGroupData();
    } catch (error) {
      console.error("Error creating post:", error);
      alert(error.response?.data?.message || "Failed to create post");
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

  const handleDeletePost = async (postId) => {
    if (window.confirm("Delete this post?")) {
      try {
        await deleteGroupPost(postId);
        fetchGroupData();
      } catch (error) {
        console.error("Error deleting post:", error);
      }
    }
  };

  const handleLikePost = async (postId, reactionType) => {
    try {
      await likeGroupPost(postId, reactionType);
      fetchGroupData();
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
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  };

  const handleOpenReactionModal = (postReactions, triggerElement) => {
    setSelectedPostReactions(postReactions);
    setReactionTriggerElement(triggerElement);
    setShowReactionModal(true);
  };

  const handleUpdateGroup = async (e) => {
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

      await updateGroup(groupId, updateData);
      setShowEditModal(false);
      setProfileImage(null);
      setCoverImage(null);
      setUploading(false);
      fetchGroupData();
    } catch (error) {
      console.error("Error updating group:", error);
      alert("Failed to update group");
      setUploading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this group? This cannot be undone."
      )
    ) {
      try {
        await deleteGroup(groupId);
        navigate("/groups");
      } catch (error) {
        console.error("Error deleting group:", error);
        alert("Failed to delete group");
      }
    }
  };

  const loadComments = async (postId) => {
    try {
      const { data } = await getGroupComments(postId);
      setComments((prev) => ({ ...prev, [postId]: data || [] }));
      setCommentModalOpen(postId);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleAddComment = async (postId) => {
    if (!newComment[postId]?.trim()) return;
    try {
      await createGroupComment({
        groupPostId: postId,
        text: newComment[postId],
      });
      setNewComment((prev) => ({ ...prev, [postId]: "" }));
      loadComments(postId);
      fetchGroupData();
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleDeleteComment = async (commentId, postId) => {
    try {
      await deleteGroupComment(commentId);
      loadComments(postId);
      fetchGroupData();
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const isMember = group?.Members?.includes(user?.user?.ID);
  const isAdmin = group?.Admins?.includes(user?.user?.ID);
  const isOwner = user?.user?.ID === group?.OwnerID;

  if (loading) return <div className="loading">Loading group...</div>;
  if (!group) return <div className="error">Group not found</div>;

  const totalReactions = (reactions) => {
    if (!reactions) return 0;
    return Object.values(reactions).reduce((sum, arr) => sum + arr.length, 0);
  };

  return (
    <div className="group-view-container">
      {/* Group Header */}
      <div className="group-header-section">
        {group.CoverPicture && (
          <img
            src={group.CoverPicture}
            alt="Cover"
            className="group-cover-image"
          />
        )}
        <div className="group-info-section">
          {group.ProfilePicture && (
            <img
              src={group.ProfilePicture}
              alt={group.Name}
              className="group-profile-image"
            />
          )}
          <div className="group-details">
            <h1>{group.Name}</h1>
            <div className="group-meta-info">
              <span className={`privacy-badge ${group.Privacy}`}>
                {group.Privacy === "public"
                  ? "🌍"
                  : group.Privacy === "private"
                  ? "🔒"
                  : "🔐"}
                {group.Privacy}
              </span>
              <span>{group.Members?.length || 0} members</span>
            </div>
          </div>
          <div className="group-actions-header">
            {!isMember ? (
              <button className="btn btn-primary" onClick={handleJoinGroup}>
                Join Group
              </button>
            ) : (
              <>
                {isMember && !isOwner && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleLeaveGroup}
                  >
                    Leave Group
                  </button>
                )}
                {isMember && (
                  <button
                    className="btn btn-info"
                    onClick={() => setShowInviteModal(true)}
                  >
                    Invite Members
                  </button>
                )}
              </>
            )}
            {isAdmin && (
              <button
                className="btn btn-secondary"
                onClick={() => setShowEditModal(true)}
              >
                Edit Group
              </button>
            )}
            {isOwner && (
              <button className="btn btn-danger" onClick={handleDeleteGroup}>
                Delete Group
              </button>
            )}
          </div>
        </div>
        {group.Description && (
          <div className="group-description-section">
            <h3>About</h3>
            <p>{group.Description}</p>
          </div>
        )}
      </div>

      {/* Create Post (Members Only) */}
      {isMember && (
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
              placeholder="Share something with the group..."
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
        <h3>Group Posts</h3>
        {!isMember ? (
          <div className="join-message">Join this group to see posts</div>
        ) : posts.length === 0 ? (
          <div className="no-posts">No posts yet. Be the first to post!</div>
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
                  <strong>Member {post.UserID.substring(0, 8)}</strong>
                  <span className="post-time">
                    {new Date(post.CreatedAt).toLocaleDateString()}
                  </span>
                </div>
                {(post.UserID === user?.user?.ID || isAdmin || isOwner) && (
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

              {/* Enhanced Reaction Summary */}
              {getTotalReactions(post.Reactions) > 0 && (
                <motion.div
                  className="group-post-reaction-summary"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={(e) =>
                    handleOpenReactionModal(post.Reactions, e.currentTarget)
                  }
                >
                  <div className="reaction-emojis-container">
                    {getReactionBreakdown(post.Reactions).map(
                      (reaction, idx) => (
                        <motion.span
                          key={reaction.type}
                          className="reaction-emoji-badge"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.05, type: "spring" }}
                          whileHover={{ scale: 1.2, rotate: 10 }}
                        >
                          {reaction.emoji}
                        </motion.span>
                      )
                    )}
                  </div>
                  <div className="reaction-breakdown-list">
                    {getReactionBreakdown(post.Reactions).map(
                      (reaction, idx) => (
                        <span key={idx} className="reaction-type-count">
                          {reaction.emoji} {reaction.count}
                        </span>
                      )
                    )}
                  </div>
                </motion.div>
              )}

              <div className="post-stats">
                <span
                  onClick={(e) =>
                    handleOpenReactionModal(post.Reactions, e.currentTarget)
                  }
                  style={{ cursor: "pointer" }}
                >
                  {getTotalReactions(post.Reactions)} reactions
                </span>
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
                              Member {comment.UserID.substring(0, 8)}
                            </strong>
                            <span className="comment-time">
                              {new Date(comment.CreatedAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="modal-comment-text">{comment.Text}</p>
                          {(comment.UserID === user?.user?.ID ||
                            isAdmin ||
                            isOwner) && (
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

      {/* Edit Group Modal */}
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
            <h2>Edit Group</h2>
            <form onSubmit={handleUpdateGroup}>
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  value={editData.Name || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, Name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Privacy</label>
                <select
                  value={editData.Privacy || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, Privacy: e.target.value })
                  }
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="secret">Secret</option>
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

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowInviteModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Invite Member</h2>
            <form onSubmit={handleInviteMember}>
              <div className="form-group">
                <label>User ID</label>
                <input
                  type="text"
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                  placeholder="Enter user ID to invite"
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reaction Modal */}
      <ReactionModal
        isOpen={showReactionModal}
        onClose={() => setShowReactionModal(false)}
        reactionData={selectedPostReactions}
        currentUserId={user?.user?.ID}
        triggerElement={reactionTriggerElement}
      />
    </div>
  );
};

export default GroupView;
