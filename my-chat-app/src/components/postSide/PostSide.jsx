import React from "react";
import Posts from "../posts/Posts";
import PostShare from "../postShare/PostShare";
import "./postSide.css";
import Story from "../story/Story";
import { useLocation } from "react-router-dom";
const PostSide = ({ isCurrentUser }) => {
  const location = useLocation();

  const showPostShare = isCurrentUser || location.pathname === "/home";

  return (
    <div className="postSide">
      {showPostShare && <PostShare />}
      <Story />
      <Posts />
    </div>
  );
};

export default PostSide;
