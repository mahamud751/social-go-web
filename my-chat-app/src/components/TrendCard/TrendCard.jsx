import React from "react";
import ContractList from "../../pages/Contract/ContractList";

import "./TrendCard.css";
const TrendCard = () => {
  return (
    <div className="mt-5" style={{ overflow: "scroll", height: "100vh" }}>
      <hr />
      <ContractList />
    </div>
  );
};

export default TrendCard;
