import React from "react";
import InfoCard from "../infoCard/InfoCard";
import LogoSearch from "../logoSearch/LogoSearch";

const ProfileLeft = ({ isCurrentUser }) => {
  return (
    <div className="profileSide">
      <LogoSearch />
      <InfoCard isCurrentUser={isCurrentUser} />
    </div>
  );
};

export default ProfileLeft;
