import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

// Get current theme from document
const getCurrentTheme = () => {
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  return currentTheme === "dark";
};

// Show success toast
export const showSuccessToast = (title, text, timer = 3000) => {
  const isDarkTheme = getCurrentTheme();

  return MySwal.fire({
    title: title,
    text: text,
    icon: "success",
    background: isDarkTheme ? "#2c2c2c" : "#ffffff",
    color: isDarkTheme ? "#ffffff" : "#000000",
    confirmButtonColor: isDarkTheme ? "#f5c32c" : "#1976d2",
    confirmButtonText: "Great!",
    timer: timer,
    timerProgressBar: true,
    showConfirmButton: false,
    toast: true,
    position: "top-end",
  });
};

// Show error toast
export const showErrorToast = (title, text) => {
  const isDarkTheme = getCurrentTheme();

  return MySwal.fire({
    title: title,
    text: text,
    icon: "error",
    background: isDarkTheme ? "#2c2c2c" : "#ffffff",
    color: isDarkTheme ? "#ffffff" : "#000000",
    confirmButtonColor: isDarkTheme ? "#ff7875" : "#d32f2f",
    confirmButtonText: "OK",
  });
};

// Show info toast
export const showInfoToast = (title, text, timer = 3000) => {
  const isDarkTheme = getCurrentTheme();

  return MySwal.fire({
    title: title,
    text: text,
    icon: "info",
    background: isDarkTheme ? "#2c2c2c" : "#ffffff",
    color: isDarkTheme ? "#ffffff" : "#000000",
    confirmButtonColor: isDarkTheme ? "#f5c32c" : "#1976d2",
    confirmButtonText: "OK",
    timer: timer,
    timerProgressBar: true,
    showConfirmButton: false,
    toast: true,
    position: "top-end",
  });
};

// Show warning toast
export const showWarningToast = (title, text) => {
  const isDarkTheme = getCurrentTheme();

  return MySwal.fire({
    title: title,
    text: text,
    icon: "warning",
    background: isDarkTheme ? "#2c2c2c" : "#ffffff",
    color: isDarkTheme ? "#ffffff" : "#000000",
    confirmButtonColor: isDarkTheme ? "#ffa940" : "#ed6c02",
    confirmButtonText: "OK",
  });
};

export default {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  showWarningToast,
};
