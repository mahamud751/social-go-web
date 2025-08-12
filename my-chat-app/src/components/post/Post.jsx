import React, { useEffect, useState } from "react";
import "./post.css";
import CommentIcon from "@mui/icons-material/Comment";
import Share from "../../img/share.png";
import { useSelector, useDispatch } from "react-redux";
import { likePost } from "../../api/PostRequest";
import { getAllUser } from "../../api/UserRequest";
import CommentModal from "./CommentModal";

const reactions = {
  like: { emoji: "👍", label: "Like" },
  love: { emoji: "❤️", label: "Love" },
  haha: { emoji: "😂", label: "Haha" },
  wow: { emoji: "😮", label: "Wow" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😣", label: "Angry" },
  care: { emoji: "🤗", label: "Care" },
};

const Post = ({ data }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const dispatch = useDispatch();
  const [reaction, setReaction] = useState(null);
  const [reactionCounts, setReactionCounts] = useState(data?.Reactions || {});
  const [commentCount, setCommentCount] = useState(data?.CommentCount || 0);
  const [persons, setPersons] = useState([]);
  const [openCommentModal, setOpenCommentModal] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null); // For debouncing hover

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

  const getReactionEmojis = () => {
    const activeReactions = Object.keys(reactionCounts).filter(
      (type) => reactionCounts[type]?.length > 0
    );
    return (
      activeReactions.map((type) => reactions[type].emoji).join(" ") || "👍"
    );
  };

  // Handle hover with debounce
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

  return (
    <div className="post">
      <img src={data.Image || ""} alt="" />
      {persons.map((pd) => (
        <span style={{ textTransform: "capitalize" }} key={pd.ID}>
          {pd.ID === data.UserID ? (
            <div className="nameImage">
              <img
                src={
                  pd.ProfilePicture
                    ? pd.ProfilePicture
                    : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                }
                alt="ProfileImage"
                className="profileImage"
              />
              <p className="name"> {pd.Username}</p>
            </div>
          ) : (
            ""
          )}
        </span>
      ))}
      <div className="postReact">
        <div
          className="reactionContainer"
          style={{ position: "relative" }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span
            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
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
                top: "-40px", // Position above to avoid overlap
                left: 0,
                display: "flex",
                gap: "10px",
                background: "white",
                padding: "5px",
                borderRadius: "20px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                zIndex: 10,
              }}
              onMouseEnter={handleMouseEnter} // Keep menu open when hovering over it
              onMouseLeave={handleMouseLeave}
            >
              {Object.keys(reactions).map((type) => (
                <span
                  key={type}
                  onClick={() => handleReaction(type)}
                  style={{ cursor: "pointer", fontSize: "20px" }}
                  title={reactions[type].label}
                >
                  {reactions[type].emoji}
                </span>
              ))}
            </div>
          )}
        </div>
        <CommentIcon
          style={{ cursor: "pointer", color: "#007bff" }}
          onClick={() => setOpenCommentModal(true)}
        />
        <img src={Share} alt="" />
      </div>

      <div className="postStats">
        <span style={{ fontSize: "12px" }}>
          {getReactionEmojis()} {getTotalReactions()} reactions
        </span>
        <span style={{ fontSize: "12px" }}>{commentCount} comments</span>
      </div>

      <div className="detail">
        <span>
          <b>
            {data.Name ||
              persons.find((p) => p.ID === data.UserID)?.Username ||
              "Unknown"}
          </b>
        </span>
        <span> {data.Desc}</span>
      </div>

      <CommentModal
        open={openCommentModal}
        handleClose={() => setOpenCommentModal(false)}
        postId={data.ID}
        setCommentCount={setCommentCount}
      />
    </div>
  );
};

export default Post;
