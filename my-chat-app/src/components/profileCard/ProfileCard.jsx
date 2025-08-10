import React, { useEffect, useState } from "react";
import "./profileCard.css";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getUser } from "../../api/UserRequest";
const ProfileCard = ({ location }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const posts = useSelector((state) => state.postReducer.posts);
  const [userData, setUserData] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const getUserData = async () => {
      try {
        const { data } = await getUser(user.ID);
        setUserData(data);
        dispatch({ type: "SAVE_USER", data: data });
      } catch (error) {
        console.log(error);
      }
    };

    getUserData();
  }, []);
  return (
    <>
      <div className="ProfileCard">
        <div className="ProfileImages">
          <img
            src={
              user.CoverPicture
                ? user.CoverPicture
                : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
            }
            alt="CoverImage"
          />
          <img
            src={
              user?.ProfilePicture
                ? user?.ProfilePicture
                : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
            }
            alt="ProfileImage"
          />
        </div>
        <div className="ProfileName">
          <span>{userData?.Username}</span>
          <span>
            {userData?.WorksAt ? user?.WorksAt : "Write about yourself"}
          </span>
        </div>
        <div className="followStatus">
          <hr />
          <div>
            <div className="follow">
              <span>{userData?.Followers?.length}</span>
              <span>Followers</span>
            </div>
            <div className="vl"></div>
            <div className="follow">
              <span>{userData?.Following?.length}</span>
              <span>Following</span>
            </div>
            {/* for profilepage */}
            {location === "profilePage" && (
              <>
                <div className="vl"></div>
                <div className="follow">
                  <span>
                    {posts.filter((post) => post.UserID === user.ID).length}
                  </span>
                  <span>Posts</span>
                </div>{" "}
              </>
            )}
          </div>
          <hr />
        </div>
        {location === "profilePage" ? (
          ""
        ) : (
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
    </>
  );
};

export default ProfileCard;
