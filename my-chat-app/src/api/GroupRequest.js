import API from "./Api";

// Group APIs
export const createGroup = (groupData) => API.post("/group", groupData);
export const getGroup = (groupId) => API.get(`/group/${groupId}`);
export const updateGroup = (groupId, groupData) =>
  API.put(`/group/${groupId}`, groupData);
export const deleteGroup = (groupId) => API.delete(`/group/${groupId}`);
export const inviteMember = (groupId, userId) =>
  API.post(`/group/${groupId}/invite`, { userId });
export const joinGroup = (groupId) => API.post(`/group/${groupId}/join`);
export const leaveGroup = (groupId) => API.post(`/group/${groupId}/leave`);
export const getUserGroups = (userId) => API.get(`/group/user/${userId}`);
export const getAllGroups = () => API.get("/group");

// Group Post APIs
export const createGroupPost = (postData) => API.post("/grouppost", postData);
export const getGroupPosts = (groupId) =>
  API.get(`/grouppost/group/${groupId}`);
export const getGroupPost = (postId) => API.get(`/grouppost/${postId}`);
export const deleteGroupPost = (postId) => API.delete(`/grouppost/${postId}`);
export const likeGroupPost = (postId, reactionType) =>
  API.post(`/grouppost/${postId}/like`, { reactionType });

// Group Comment APIs
export const createGroupComment = (commentData) =>
  API.post("/grouppost/comment", commentData);
export const getGroupComments = (postId) =>
  API.get(`/grouppost/comment/${postId}`);
export const deleteGroupComment = (commentId) =>
  API.delete(`/grouppost/comment/${commentId}`);
export const likeGroupComment = (commentId, reactionType) =>
  API.post(`/grouppost/comment/${commentId}/like`, { reactionType });
