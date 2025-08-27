import React from "react";
import AddMessengers from "../../components/HomeMenu/AddMessengers";
import HomeMenu from "../../components/HomeMenu/HomeMenu";
import RightSide from "../../components/rightSide/RightSide";

const AddMessenger = () => {
  return (
    <div className="row">
      <div className="col-md-3 mt-3">
        <HomeMenu />
      </div>
      <div className="col-md-9 mt-5">
        <AddMessengers />
      </div>
    </div>
  );
};

export default AddMessenger;
