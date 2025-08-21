import React from "react";
import PostSide from "../../components/postSide/PostSide";
import ProfileCard from "../../components/profileCard/ProfileCard";
import ProfileLeft from "../../components/profileLeft/ProfileLeft";
import RightSide from "../../components/rightSide/RightSide";

import "./profile.css";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";

const Profile = () => {
  const params = useParams();
  const profileUserId = params.id;
  const { user } = useSelector((state) => state.authReducer.authData);
  const isCurrentUser = user.ID === profileUserId;
  return (
    <div>
      <div className="row">
        <div className="col-md-3">
          <ProfileLeft isCurrentUser={isCurrentUser} />
        </div>
        <div className="col-md-6 mt-5">
          <div className="profile-center">
            <ProfileCard
              location="profilePage"
              params={params}
              isCurrentUser={isCurrentUser}
            />
            <PostSide params={params} isCurrentUser={isCurrentUser} />
          </div>
        </div>
        <div className="col-md-3 home_main_sm">
          <RightSide />
        </div>
      </div>
    </div>
  );
};

export default Profile;
