import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getTimelinePosts } from "../../actions/postAction";
import { useParams } from "react-router-dom";
import Post from "../post/Post";
import "./posts.css";

const Posts = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.authReducer.authData);

  let { posts, loading } = useSelector((state) => state.postReducer);

  useEffect(() => {
    dispatch(getTimelinePosts(user?.ID));
  }, [user]);

  const allMembersId = posts.map((pd) => pd.UserID);

  if (!posts) return "No Posts";
  posts = posts.filter((post) => post.UserID === user.ID);
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
