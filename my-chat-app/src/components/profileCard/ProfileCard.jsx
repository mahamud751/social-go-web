import React from "react";
import "./profileCard.css";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
const ProfileCard = ({ location }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const serverPublic = process.env.REACT_APP_PUBLIC_FOLDER;
  const posts = useSelector((state) => state.postReducer.posts);
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
              user.ProfilePicture
                ? user.ProfilePicture
                : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
            }
            alt="ProfileImage"
          />
        </div>
        <div className="ProfileName">
          <span>{user.UserName}</span>
          <span>{user.WorksAt ? user.WorksAt : "Write about yourself"}</span>
        </div>
        <div className="followStatus">
          <hr />
          <div>
            <div className="follow">
              <span>{user.Followers.length}</span>
              <span>Followers</span>
            </div>
            <div className="vl"></div>
            <div className="follow">
              <span>{user.Following.length}</span>
              <span>Following</span>
            </div>
            {/* for profilepage */}
            {location === "profilePage" && (
              <>
                <div className="vl"></div>
                <div className="follow">
                  <span>
                    {posts.filter((post) => post.UserId === user.ID).length}
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
