import axios from "axios";

const API = axios.create({
  baseURL: `https://${process.env.REACT_APP_API_URL}/api`,
});

API.interceptors.request.use((req) => {
  if (localStorage.getItem("profile")) {
    req.headers.Authorization = `Bearer ${
      JSON.parse(localStorage.getItem("profile")).token
    }`;
  }

  return req;
});

export const getTimelinePosts = (id) => API.get(`/post/${id}/timeline`);
export const getAllPosts = () => API.get(`/post/all/posts`);
export const getFollowingPosts = (id) => API.get(`/post/${id}/following`);
export const likePost = (id, userId, reactionType = "like") =>
  API.put(`post/${id}/like`, { userId: userId, reactionType });
