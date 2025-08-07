import React, { useEffect, useState } from "react";
import "./post.css";
import Comment from "../../img/comment.png";
import Share from "../../img/share.png";
import Heart from "../../img/like.png";
import NotLike from "../../img/notlike.png";
import { useSelector } from "react-redux";
import { likePost } from "../../api/PostRequest";
import { getAllUser } from "../../api/UserRequest";

const Post = ({ data }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [liked, setLiked] = useState(data.Likes.includes(user.ID));
  const [likes, setLikes] = useState(data.Likes.length);

  const [persons, setPersons] = useState([]);
  useEffect(() => {
    const fetchPersons = async () => {
      const { data } = await getAllUser();
      setPersons(data);
    };
    fetchPersons();
  }, [user]);

  const handleLike = () => {
    likePost(data.ID, user.ID);
    setLiked((prev) => !prev);
    liked ? setLikes((prev) => prev - 1) : setLikes((prev) => prev + 1);
  };
  return (
    <div className="post">
      <img src={data.Image ? data.Image : ""} alt="" />
      {persons.map((pd) => {
        return (
          <>
            {" "}
            {pd.ID === data.userId ? (
              <span style={{ textTransform: "capitalize" }} key={pd.ID}>
                {pd.Username}
              </span>
            ) : (
              ""
            )}
          </>
        );
      })}
      <div className="postReact">
        <img
          src={liked ? Heart : NotLike}
          alt=""
          style={{ cursor: "pointer" }}
          onClick={handleLike}
        />
        <img src={Comment} alt="" />
        <img src={Share} alt="" />
      </div>

      <span style={{ fontSize: "12px" }}>{likes} likes</span>

      <div className="detail">
        <span>
          <b>{data.Name}</b>
        </span>
        <span> {data.Desc}</span>
      </div>
    </div>
  );
};

export default Post;
