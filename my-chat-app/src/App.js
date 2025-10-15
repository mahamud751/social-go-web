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
import VideoCall from "./pages/VideoCall/VideoCall";
import ThemeToggle from "./components/ThemeToggle";
import Notification from "./components/Notification/Notification";
import NavIcons from "./components/NavIcons/NavIcons";
import { UserStatusProvider } from "./components/UserStatus/UserStatus";
import GlobalIncomingCallHandler from "./components/GlobalIncomingCallHandler/GlobalIncomingCallHandler";

function App({ toggleTheme, theme }) {
  const user = useSelector((state) => state.authReducer.authData);
  return (
    <UserStatusProvider userId={user?.ID}>
      <div className={`App ${user ? "" : "no-nav"}`}>
        {/* Desktop Navigation - Top Center with Gradient (shown only when logged in) */}
        {user && (
          <div className="desktop-nav">
            <div className="nav-content">
              <div className="nav-spacer"></div>
              <NavIcons />
              <div className="nav-controls">
                <Notification />
                <ThemeToggle toggleTheme={toggleTheme} theme={theme} />
              </div>
            </div>
          </div>
        )}

        {/* Mobile Top Bar (shown only when logged in) */}
        {user && (
          <div className="mobile-top-bar">
            <div className="mobile-top-content">
              <div className="mobile-spacer"></div>
              <div className="mobile-controls">
                <Notification />
                <ThemeToggle toggleTheme={toggleTheme} theme={theme} />
              </div>
            </div>
          </div>
        )}
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

          <Route
            path="/video-call"
            element={user ? <VideoCall /> : <Navigate to="../auth" />}
          />
        </Routes>

        {/* Mobile Navigation - Bottom Footer (shown only when logged in) */}
        {user && (
          <div className="mobile-nav">
            <NavIcons />
          </div>
        )}

        {/* Global Incoming Call Handler - Shows on all routes */}
        <GlobalIncomingCallHandler />
      </div>
    </UserStatusProvider>
  );
}

export default App;
