import API from "./Api";

// Page APIs
export const createPage = (pageData) => API.post("/page", pageData);
export const getPage = (pageId) => API.get(`/page/${pageId}`);
export const updatePage = (pageId, pageData) =>
  API.put(`/page/${pageId}`, pageData);
export const deletePage = (pageId) => API.delete(`/page/${pageId}`);
export const likePage = (pageId) => API.post(`/page/${pageId}/like`);
export const getUserPages = (userId) => API.get(`/page/user/${userId}`);
export const getAllPages = () => API.get("/page");

// Page Post APIs
export const createPagePost = (postData) => API.post("/pagepost", postData);
export const getPagePosts = (pageId) => API.get(`/pagepost/page/${pageId}`);
export const getPagePost = (postId) => API.get(`/pagepost/${postId}`);
export const deletePagePost = (postId) => API.delete(`/pagepost/${postId}`);
export const likePagePost = (postId, reactionType) =>
  API.post(`/pagepost/${postId}/like`, { reactionType });

// Page Comment APIs
export const createPageComment = (commentData) =>
  API.post("/pagepost/comment", commentData);
export const getPageComments = (postId) =>
  API.get(`/pagepost/comment/${postId}`);
export const deletePageComment = (commentId) =>
  API.delete(`/pagepost/comment/${commentId}`);
export const likePageComment = (commentId, reactionType) =>
  API.post(`/pagepost/comment/${commentId}/like`, { reactionType });
