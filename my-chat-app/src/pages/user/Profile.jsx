import React from "react";
import PostSide from "../../components/postSide/PostSide";
import ProfileCard from "../../components/profileCard/ProfileCard";
import ProfileLeft from "../../components/profileLeft/ProfileLeft";
import RightSide from "../../components/rightSide/RightSide";

import "./profile.css";

const User = () => {
  return (
    <div>
      <div className="row">
        <div className="col-md-3">
          <ProfileLeft />
        </div>
        <div className="col-md-6">
          <div className="profile-center">
            <ProfileCard location="profilePage" />
            <PostSide />
          </div>
        </div>
        <div className="col-md-3 home_main_sm">
          <RightSide />
        </div>
      </div>
    </div>
  );
};

export default User;
