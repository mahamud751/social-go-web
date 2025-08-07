import React from "react";
import FriendAdd from "../../components/HomeMenu/FriendAdd";
import HomeMenu from "../../components/HomeMenu/HomeMenu";

const Friend = () => {
  return (
    <div className="row">
      <div className="col-md-3 mt-3">
        <HomeMenu />
      </div>
      <div className="col-md-9 mt-5" style={{ height: "auto" }}>
        <FriendAdd />
      </div>
    </div>
  );
};

export default Friend;
