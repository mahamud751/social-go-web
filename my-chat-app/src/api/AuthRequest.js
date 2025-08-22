import axios from "axios";

const API = axios.create({
  baseURL: `https://${process.env.REACT_APP_API_URL}/api`,
});

export const logIn = (formData) => API.post("/auth/login", formData);
export const signUp = (formData) => API.post("/auth/register", formData);
