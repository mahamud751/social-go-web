import React, { useEffect, useState } from "react";
import "./profileCard.css";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getUser } from "../../api/UserRequest";

const ProfileCard = ({ location, params, isCurrentUser }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const posts = useSelector((state) => state.postReducer.posts);
  const [userData, setUserData] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userId = isCurrentUser ? user.ID : params.id;
        const { data } = await getUser(userId);
        setUserData(data);
        dispatch({ type: "SAVE_USER", data: data });
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    if ((isCurrentUser && user?.ID) || (!isCurrentUser && params?.id)) {
      getUserData();
    }
  }, [user?.ID, params?.id, isCurrentUser]);

  return (
    <div className="ProfileCard">
      <div className="ProfileImages">
        <img
          src={
            userData?.CoverPicture
              ? userData.CoverPicture
              : "https://i.ibb.co.com/FqHhTwR8/Blue-and-Red-Neon-Coming-Soon-Announcement-Facebook-Cover.png"
          }
          alt="CoverImage"
        />
        <img
          src={
            userData?.ProfilePicture
              ? userData.ProfilePicture
              : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
          }
          alt="ProfileImage"
        />
      </div>
      <div className="ProfileName">
        <span>{userData?.Username || "Loading..."}</span>
        <span>
          {userData?.WorksAt ? userData.WorksAt : "Write about yourself"}
        </span>
      </div>
      <div className="followStatus">
        <hr />
        <div>
          <div className="follow">
            <span>{userData?.Followers?.length || 0}</span>
            <span>Followers</span>
          </div>
          <div className="vl"></div>
          <div className="follow">
            <span>{userData?.Following?.length || 0}</span>
            <span>Following</span>
          </div>
          {location === "profilePage" && (
            <>
              <div className="vl"></div>
              <div className="follow">
                <span>
                  {
                    posts?.filter(
                      (post) =>
                        post.UserID === (isCurrentUser ? user.ID : params.id)
                    ).length
                  }
                </span>
                <span>Posts</span>
              </div>
            </>
          )}
        </div>
        <hr />
      </div>
      {location === "profilePage" ? null : (
        <span>
          <Link
            to={`/profile/${user.ID}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            My Profile
          </Link>
        </span>
      )}
    </div>
  );
};

export default ProfileCard;
