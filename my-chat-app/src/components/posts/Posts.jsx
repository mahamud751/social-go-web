import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getTimelinePosts } from "../../actions/postAction";
import { useParams } from "react-router-dom";
import Post from "../post/Post";
import "./posts.css";

const Posts = () => {
  const params = useParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.authReducer.authData);
  console.log(user);

  let { posts, loading } = useSelector((state) => state.postReducer);
  console.log("user.ID", user.ID);

  useEffect(() => {
    dispatch(getTimelinePosts(user.ID));
  }, [user]);

  const allMembersId = posts.map((pd) => pd.UserId);

  // console.log(allMembersId2);

  // const newMembersId = allMembersId.filter((element) =>
  //   newMemberId.includes(element)
  // );

  if (!posts) return "No Posts";
  if (params.id) posts = posts.filter((post) => post.UserId === params.id);
  return (
    <div className="posts">
      {loading
        ? "Loading"
        : posts.map((post, id) => (
            <Post data={post} id={id} key={id} allMembersId={allMembersId} />
          ))}
    </div>
  );
};

export default Posts;
