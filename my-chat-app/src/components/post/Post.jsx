import React, { useEffect, useState } from "react";
import "./post.css";
import CommentIcon from "@mui/icons-material/Comment";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import Share from "../../img/share.png";
import { useSelector, useDispatch } from "react-redux";
import { likePost } from "../../api/PostRequest";
import { getAllUser } from "../../api/UserRequest";
import CommentModal from "./CommentModal";
import ReactionModal from "../reactions/ReactionModal";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const reactions = {
  like: { emoji: "👍", label: "Like" },
  love: { emoji: "❤️", label: "Love" },
  haha: { emoji: "😂", label: "Haha" },
  wow: { emoji: "😮", label: "Wow" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😣", label: "Angry" },
  care: { emoji: "🤗", label: "Care" },
};

const Post = ({ data, theme }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const dispatch = useDispatch();
  const [reaction, setReaction] = useState(null);
  const [reactionCounts, setReactionCounts] = useState(data?.Reactions || {});
  const [commentCount, setCommentCount] = useState(data?.CommentCount || 0);
  const [persons, setPersons] = useState([]);
  const [openCommentModal, setOpenCommentModal] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [reactionTriggerElement, setReactionTriggerElement] = useState(null);

  useEffect(() => {
    const fetchPersons = async () => {
      const { data } = await getAllUser();
      setPersons(data);
    };
    fetchPersons();
  }, [user]);

  useEffect(() => {
    if (data?.Reactions && user?.ID) {
      Object.keys(data.Reactions).forEach((type) => {
        if (data.Reactions[type]?.includes(user.ID)) {
          setReaction(type);
        }
      });
    }
  }, [data, user]);

  const handleReaction = async (reactionType) => {
    try {
      await likePost(data.ID, user.ID, reactionType);
      const newReaction = reaction === reactionType ? null : reactionType;
      setReaction(newReaction);

      const newCounts = { ...reactionCounts };
      if (reaction) {
        newCounts[reaction] = newCounts[reaction].filter(
          (id) => id !== user.ID
        );
        if (newCounts[reaction].length === 0) delete newCounts[reaction];
      }
      if (newReaction) {
        newCounts[newReaction] = newCounts[newReaction] || [];
        if (!newCounts[newReaction].includes(user.ID)) {
          newCounts[newReaction].push(user.ID);
        }
      }
      setReactionCounts(newCounts);

      dispatch({
        type: "REACTION_UPDATE",
        data: { postId: data.ID, reactions: newCounts },
      });
    } catch (error) {
      console.error("Failed to update reaction:", error);
    }
  };

  const getTotalReactions = () => {
    return Object.values(reactionCounts).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );
  };

  const getReactionBreakdown = () => {
    if (!reactionCounts) return [];
    return Object.entries(reactionCounts)
      .filter(([_, users]) => users && users.length > 0)
      .map(([type, users]) => ({
        emoji: reactions[type]?.emoji || "👍",
        count: users.length,
        type: type,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  };

  const getTopReactors = () => {
    const allUserIds = [];
    Object.values(reactionCounts).forEach((userIds) => {
      allUserIds.push(...userIds);
    });

    const uniqueUserIds = [...new Set(allUserIds)];
    const names = uniqueUserIds.slice(0, 3).map((userId) => {
      if (userId === user.ID) return "You";
      const person = persons.find((p) => p.ID === userId);
      return person?.Username || "Someone";
    });

    if (uniqueUserIds.length === 0) return "";
    if (uniqueUserIds.length === 1) return names[0];
    if (uniqueUserIds.length === 2) return `${names[0]} and ${names[1]}`;

    const others = uniqueUserIds.length - 2;
    if (others === 1) return `${names[0]}, ${names[1]} and 1 other`;
    return `${names[0]}, ${names[1]} and ${others} others`;
  };

  const handleMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoverTimeout(
      setTimeout(() => {
        setShowReactions(true);
      }, 100)
    );
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoverTimeout(
      setTimeout(() => {
        setShowReactions(false);
      }, 100)
    );
  };

  // Format date to show relative time
  const formatPostDate = (dateString) => {
    if (!dateString) return "";

    const postDate = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    // For older posts, show the actual date
    return postDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        postDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="post">
      <div>
        {persons?.map((pd) => (
          <span key={pd.ID}>
            {pd.ID === data.UserID ? (
              <Link to={`/profile/${pd.ID}`} className="nameImage">
                <img
                  src={
                    pd.ProfilePicture ||
                    "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                  }
                  alt="ProfileImage"
                  className="profileImage"
                />
                <div className="post-user-info">
                  <p className="name">{pd.Username}</p>
                  <span className="post-date">
                    <AccessTimeIcon sx={{ fontSize: 14, marginRight: "4px" }} />
                    {formatPostDate(data.CreatedAt || data.createdAt)}
                  </span>
                </div>
              </Link>
            ) : (
              ""
            )}
          </span>
        ))}
      </div>
      <img
        src={data.Image || ""}
        alt="post image"
        style={{ width: "100%", objectFit: "contain" }}
      />
      <div className="detail">
        <span> {data.Desc}</span>
      </div>
      <div className="postReact">
        <div
          className="reactionContainer"
          style={{ position: "relative" }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color:
                theme === "dark"
                  ? "var(--post-text-color)"
                  : "var(--post-text-color)",
            }}
          >
            {reaction ? (
              <>
                {reactions[reaction].emoji} {reactions[reaction].label}
              </>
            ) : (
              "Like"
            )}
          </span>
          {showReactions && (
            <div
              className="reactionOptions"
              style={{
                position: "absolute",
                top: "-40px",
                left: 0,
                display: "flex",
                gap: "10px",
                padding: "5px",
                borderRadius: "20px",
                zIndex: 10,
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {Object.keys(reactions).map((type) => (
                <span
                  key={type}
                  onClick={() => handleReaction(type)}
                  style={{
                    cursor: "pointer",
                    fontSize: "20px",
                    color:
                      theme === "dark"
                        ? "var(--post-text-color)"
                        : "var(--post-text-color)",
                  }}
                  title={reactions[type].label}
                >
                  {reactions[type].emoji}
                </span>
              ))}
            </div>
          )}
        </div>
        <CommentIcon
          style={{
            cursor: "pointer",
            color: "var(--icon-color)",
          }}
          onClick={() => setOpenCommentModal(true)}
        />
        <img src={Share} alt="" />
      </div>

      {/* Enhanced Reaction Display */}
      {getTotalReactions() > 0 && (
        <motion.div
          className="post-reaction-summary"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div
            className="reaction-emojis-container"
            onClick={(e) => {
              setReactionTriggerElement(e.currentTarget);
              setShowReactionModal(true);
            }}
          >
            {getReactionBreakdown().map((reaction, idx) => (
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
            ))}
          </div>
          <span
            className="reaction-count-text"
            onClick={(e) => {
              setShowReactionModal(true);
            }}
          >
            {getTopReactors()}
          </span>
        </motion.div>
      )}

      <div className="postStats">
        <span
          style={{ fontSize: "12px", cursor: "pointer" }}
          onClick={(e) => {
            setShowReactionModal(true);
          }}
        >
          {getTotalReactions()} reactions
        </span>
        <span style={{ fontSize: "12px" }}>{commentCount} comments</span>
      </div>

      <CommentModal
        open={openCommentModal}
        handleClose={() => setOpenCommentModal(false)}
        postId={data.ID}
        setCommentCount={setCommentCount}
        theme={theme}
      />

      {/* Reaction Modal */}
      <ReactionModal
        isOpen={showReactionModal}
        onClose={() => setShowReactionModal(false)}
        reactionData={reactionCounts}
        currentUserId={user.ID}
        triggerElement={reactionTriggerElement}
      />
    </div>
  );
};

export default Post;
