import API from "./Api";

export const getNotifications = () => API.get("/notification");
export const markNotificationAsRead = (notificationId) =>
  API.put(`/notification/${notificationId}/read`);
