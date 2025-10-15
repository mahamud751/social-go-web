import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./rightSide.css";
import { getAllUser } from "../../api/UserRequest";
import { getAllPages } from "../../api/PageRequest";
import { getAllGroups } from "../../api/GroupRequest";

const RightSide = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pages, setPages] = useState([]);
  const [groups, setGroups] = useState([]);
  const currentUser = JSON.parse(localStorage.getItem("profile"));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all users
      const usersRes = await getAllUser();
      if (usersRes.data) {
        // Filter out current user and limit to 5
        const filteredUsers = usersRes.data
          .filter((user) => user.ID !== currentUser?.user?.ID)
          .slice(0, 5);
        setUsers(filteredUsers);
      }

      // Fetch pages
      const pagesRes = await getAllPages();
      if (pagesRes.data) {
        setPages(pagesRes.data.slice(0, 5));
      }

      // Fetch groups
      const groupsRes = await getAllGroups();
      if (groupsRes.data) {
        setGroups(groupsRes.data.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching sidebar data:", error);
    }
  };

  const getRandomStatus = () => {
    // Random online/offline for demo purposes
    return Math.random() > 0.5 ? "online" : "offline";
  };

  return (
    <div className="rightSide5" style={{ width: "22%" }}>
      {/* Online/Offline Users Card */}
      <div className="sidebar-card">
        <div className="card-header">
          <h3>Friends</h3>
        </div>
        <div className="card-content">
          {users.length === 0 ? (
            <div className="no-data">No users found</div>
          ) : (
            users.map((user) => {
              const status = getRandomStatus();
              return (
                <div
                  key={user.ID}
                  className="user-item"
                  onClick={() => navigate(`/profile/${user.ID}`)}
                >
                  <div className="user-avatar">
                    {user.ProfilePicture ? (
                      <img src={user.ProfilePicture} alt={user.Username} />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.Username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={`status-indicator ${status}`}></span>
                  </div>
                  <div className="user-info">
                    <span className="user-name">
                      {user.Firstname} {user.Lastname}
                    </span>
                    <span className="user-status">{status}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pages Card */}
      <div className="sidebar-card">
        <div className="card-header">
          <h3>Suggested Pages</h3>
          {pages.length > 5 && (
            <button
              className="view-more-btn"
              onClick={() => navigate("/pages")}
            >
              View More
            </button>
          )}
        </div>
        <div className="card-content">
          {pages.length === 0 ? (
            <div className="no-data">No pages available</div>
          ) : (
            pages.map((page) => (
              <div
                key={page.ID}
                className="page-item"
                onClick={() => navigate(`/page/${page.ID}`)}
              >
                <div className="page-avatar">
                  {page.ProfilePicture ? (
                    <img src={page.ProfilePicture} alt={page.Name} />
                  ) : (
                    <div className="avatar-placeholder page-icon">📄</div>
                  )}
                </div>
                <div className="page-info">
                  <span className="page-name">{page.Name}</span>
                  <span className="page-category">{page.Category}</span>
                  <span className="page-likes">{page.Likes || 0} likes</span>
                </div>
              </div>
            ))
          )}
        </div>
        {pages.length > 0 && (
          <div className="card-footer">
            <button className="view-all-btn" onClick={() => navigate("/pages")}>
              See All Pages
            </button>
          </div>
        )}
      </div>

      {/* Groups Card */}
      <div className="sidebar-card">
        <div className="card-header">
          <h3>Suggested Groups</h3>
          {groups.length > 5 && (
            <button
              className="view-more-btn"
              onClick={() => navigate("/groups")}
            >
              View More
            </button>
          )}
        </div>
        <div className="card-content">
          {groups.length === 0 ? (
            <div className="no-data">No groups available</div>
          ) : (
            groups.map((group) => (
              <div
                key={group.ID}
                className="group-item"
                onClick={() => navigate(`/group/${group.ID}`)}
              >
                <div className="group-avatar">
                  {group.ProfilePicture ? (
                    <img src={group.ProfilePicture} alt={group.Name} />
                  ) : (
                    <div className="avatar-placeholder group-icon">👥</div>
                  )}
                </div>
                <div className="group-info">
                  <span className="group-name">{group.Name}</span>
                  <span className="group-privacy">
                    {group.Privacy === "public"
                      ? "🌍 Public"
                      : group.Privacy === "private"
                      ? "🔒 Private"
                      : "🔐 Secret"}
                  </span>
                  <span className="group-members">
                    {group.Members?.length || 0} members
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        {groups.length > 0 && (
          <div className="card-footer">
            <button
              className="view-all-btn"
              onClick={() => navigate("/groups")}
            >
              See All Groups
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RightSide;
