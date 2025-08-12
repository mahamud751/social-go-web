import React from "react";
import Posts from "../posts/Posts";
import PostShare from "../postShare/PostShare";
import "./postSide.css";
import Story from "../story/Story";
const PostSide = () => {
  return (
    <div className="postSide">
      <PostShare />
      <Story />
      <Posts />
    </div>
  );
};

export default PostSide;
