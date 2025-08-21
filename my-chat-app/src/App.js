import "./App.css";
import Auth from "./pages/auth/Auth";
import Home from "./pages/home/Home";
import Profile from "./pages/profile/Profile";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Chat from "./pages/chat/Chat";
import Friend from "./pages/Friend/Friend";
import AddMessenger from "./pages/addMessenger/AddMessenger";
import FriendList from "./pages/friendList/FriendList";
import FriendRequests from "./pages/RequestList/FriendRequests";
import ThemeToggle from "./components/ThemeToggle";
import Notification from "./components/Notification";

function App({ toggleTheme, theme }) {
  const user = useSelector((state) => state.authReducer.authData);
  return (
    <div className="App">
      <div
        style={{
          position: "fixed",
          top: "0",
          right: "0",
          zIndex: "1000",
          display: "flex",
          justifyContent: "flex-end",
          width: "100%",
        }}
      >
        <Notification />
        <ThemeToggle toggleTheme={toggleTheme} theme={theme} />
      </div>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="home" /> : <Navigate to="auth" />}
        />
        <Route
          path="/home"
          element={user ? <Home /> : <Navigate to="../auth" />}
        />
        <Route
          path="/auth"
          element={user ? <Navigate to="../home" /> : <Auth />}
        />
        <Route
          path="/profile/:id"
          element={user ? <Profile /> : <Navigate to="../auth" />}
        />

        <Route
          path="/chat"
          element={user ? <Chat /> : <Navigate to="../auth" />}
        />

        <Route
          path="/friend"
          element={user ? <Friend /> : <Navigate to="../auth" />}
        />
        <Route
          path="/friend-request"
          element={user ? <FriendRequests /> : <Navigate to="../auth" />}
        />
        <Route
          path="/friend_list"
          element={user ? <FriendList /> : <Navigate to="../auth" />}
        />
        <Route
          path="/addMessenger"
          element={user ? <AddMessenger /> : <Navigate to="../auth" />}
        />
      </Routes>
    </div>
  );
}

export default App;
