import React, { useEffect, useState } from "react";
import "./post.css";
import CommentIcon from "@mui/icons-material/Comment";
import Share from "../../img/share.png";
import Heart from "../../img/like.png";
import NotLike from "../../img/notlike.png";
import { useSelector } from "react-redux";
import { likePost } from "../../api/PostRequest";
import { getAllUser } from "../../api/UserRequest";
import CommentModal from "./CommentModal";

const Post = ({ data }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [liked, setLiked] = useState(data?.Likes?.includes(user?.ID) || false);
  const [likes, setLikes] = useState(data?.Likes?.length || 0);
  const [persons, setPersons] = useState([]);
  const [openCommentModal, setOpenCommentModal] = useState(false);

  useEffect(() => {
    const fetchPersons = async () => {
      const { data } = await getAllUser();
      setPersons(data);
    };
    fetchPersons();
  }, [user]);

  const handleLike = async () => {
    try {
      await likePost(data.ID, user.ID);
      setLiked((prev) => !prev);
      setLikes((prev) => (liked ? prev - 1 : prev + 1));
    } catch (error) {
      console.error("Failed to like post:", error);
    }
  };

  return (
    <div className="post">
      <img src={data.Image ? data.Image : ""} alt="" />
      {persons.map((pd) => (
        <span style={{ textTransform: "capitalize" }} key={pd.ID}>
          {pd.ID === data.UserID ? pd.Username : ""}
        </span>
      ))}
      <div className="postReact">
        <img
          src={liked ? Heart : NotLike}
          alt=""
          style={{ cursor: "pointer" }}
          onClick={handleLike}
        />
        <CommentIcon
          style={{ cursor: "pointer", color: "#007bff" }}
          onClick={() => setOpenCommentModal(true)}
        />
        <img src={Share} alt="" />
      </div>

      <span style={{ fontSize: "12px" }}>{likes} likes</span>

      <div className="detail">
        <span>
          <b>{data.Name}</b>
        </span>
        <span> {data.Desc}</span>
      </div>

      {/* Comment Modal */}
      <CommentModal
        open={openCommentModal}
        handleClose={() => setOpenCommentModal(false)}
        postId={data.ID}
      />
    </div>
  );
};

export default Post;
