import * as PostsApi from "../api/PostRequest";

// Normalize various possible payload shapes to an array of posts
const normalizePosts = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.posts)) return data.posts;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Items)) return data.Items;
  return [];
};

export const getTimelinePosts = (id) => async (dispatch) => {
  dispatch({ type: "RETREIVING_START" });
  try {
    const { data } = await PostsApi.getTimelinePosts(id);
    dispatch({ type: "RETREIVING_SUCCESS", data: normalizePosts(data) });
  } catch (error) {
    console.log(error);
    dispatch({ type: "RETREIVING_FAIL" });
  }
};

export const getAllPosts = () => async (dispatch) => {
  dispatch({ type: "RETREIVING_START" });
  try {
    const { data } = await PostsApi.getAllPosts();
    dispatch({ type: "RETREIVING_SUCCESS", data: normalizePosts(data) });
  } catch (error) {
    console.log(error);
    dispatch({ type: "RETREIVING_FAIL" });
  }
};

export const getFollowingPosts = (id) => async (dispatch) => {
  dispatch({ type: "RETREIVING_START" });
  try {
    const { data } = await PostsApi.getFollowingPosts(id);
    dispatch({ type: "RETREIVING_SUCCESS", data: normalizePosts(data) });
  } catch (error) {
    console.log(error);
    dispatch({ type: "RETREIVING_FAIL" });
  }
};
