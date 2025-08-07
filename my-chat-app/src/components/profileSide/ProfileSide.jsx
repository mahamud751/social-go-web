import React from "react";
import FollowersCard from "../followersCard/FollowersCard";
import LogoSearch from "../logoSearch/LogoSearch";
import ProfileCard from "../profileCard/ProfileCard";
import "./profileSide.css";

const ProfileSide = () => {
  return (
    <div className="profileSide">
      <LogoSearch />

      <ProfileCard location="homepage" />
      <FollowersCard />
    </div>
  );
};

export default ProfileSide;
