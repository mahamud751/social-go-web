import API from "./Api";

export const getMessages = (id) => API.get(`/message/${id}`);

export const addMessage = (data) => API.post("/message/", data);

export const likeComment = (commentId) =>
  API.post(`/comment/${commentId}/like`);
export const sendFriendRequest = (receiverId) =>
  API.post("/friend/request", { receiverId });
export const getFriendRequests = () => API.get("/friend/requests");
export const confirmFriendRequest = (requestId) =>
  API.put(`/friend/request/${requestId}/confirm`);
export const rejectFriendRequest = (requestId) =>
  API.put(`/friend/request/${requestId}/reject`);
