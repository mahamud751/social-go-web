import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./rightSide.css";
import { getUser } from "../../api/UserRequest";
import { getAllPages } from "../../api/PageRequest";
import { getAllGroups } from "../../api/GroupRequest";

const RightSide = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [pages, setPages] = useState([]);
  const [groups, setGroups] = useState([]);
  const currentProfile = JSON.parse(localStorage.getItem("profile"));
  const currentUserId = currentProfile?.user?.ID;

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      // Fetch current user's friend IDs and resolve to user details
      if (currentUserId) {
        const meRes = await getUser(currentUserId);
        const friendIds = meRes?.data?.Friends || [];

        if (friendIds.length > 0) {
          const details = await Promise.all(
            friendIds.map(async (fid) => {
              try {
                const { data } = await getUser(fid);
                return data;
              } catch (e) {
                console.error("Failed to fetch friend", fid, e);
                return null;
              }
            })
          );
          setFriends(details.filter(Boolean).slice(0, 5));
        } else {
          setFriends([]);
        }
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
    // Placeholder online/offline; integrate real presence if available
    return Math.random() > 0.5 ? "online" : "offline";
  };

  return (
    <div className="rightSide5" style={{ width: "22%" }}>
      {/* Friends Card */}
      <div className="sidebar-card">
        <div className="card-header">
          <h3>Friends</h3>
        </div>
        <div className="card-content">
          {friends.length === 0 ? (
            <div className="no-data">No friends found</div>
          ) : (
            friends.map((friend) => {
              const status = getRandomStatus();
              return (
                <div
                  key={friend.ID}
                  className="user-item"
                  onClick={() => navigate(`/profile/${friend.ID}`)}
                >
                  <div className="user-avatar">
                    {friend.ProfilePicture ? (
                      <img src={friend.ProfilePicture} alt={friend.Username} />
                    ) : (
                      <div className="avatar-placeholder">
                        {friend.Username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={`status-indicator ${status}`}></span>
                  </div>
                  <div className="user-info">
                    <span className="user-name">
                      <span className="page-name">{friend.Username}</span>
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
