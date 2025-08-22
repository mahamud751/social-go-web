import axios from "axios";

const API = axios.create({
  baseURL: `https://${process.env.REACT_APP_API_URL}/api`,
});

// Add a request interceptor
API.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const profile = JSON.parse(localStorage.getItem("profile"));

    if (profile && profile.token) {
      config.headers.Authorization = `Bearer ${profile.token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
export default API;
