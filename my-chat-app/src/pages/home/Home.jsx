import React from "react";
import HomeMenu from "../../components/HomeMenu/HomeMenu";
import PostSide from "../../components/postSide/PostSide";
import RightSide from "../../components/rightSide/RightSide";
import "./home.css";
const Home = () => {
  return (
    <div className="row home">
      <div className="col-md-3">
        <HomeMenu />
      </div>
      <div className="col-md-6 mt-5">
        <PostSide />
      </div>

      <div className="col-md-3 home_main_sm">
        <RightSide />
      </div>
    </div>
  );
};

export default Home;
