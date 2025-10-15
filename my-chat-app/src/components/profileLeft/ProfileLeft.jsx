import React from "react";
import InfoCard from "../infoCard/InfoCard";
import LogoSearch from "../logoSearch/LogoSearch";
import "./profileLeft.css"; // We'll create this CSS file

const ProfileLeft = ({ isCurrentUser }) => {
  return (
    <div className="profileSide animated-container">
      <div className="profile-element logo-search-wrapper">
        <LogoSearch />
      </div>
      <div className="profile-element info-card-wrapper">
        <InfoCard isCurrentUser={isCurrentUser} />
      </div>
    </div>
  );
};

export default ProfileLeft;
