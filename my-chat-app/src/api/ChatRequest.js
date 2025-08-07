import API from "./Api";

export const userChats = (id) => API.get(`/chat/${id}`);
