import React from "react";
import ContractList from "../../pages/Contract/ContractList";

import "./TrendCard.css";
const TrendCard = () => {
  return (
    <div className="mt-5" style={{ overflow: "scroll", height: "100vh" }}>
      <h3 className="mt-5">Sponsored</h3>

      <div className="card mb-3" style={{ maxWidth: 540 }}>
        <div className="row g-0">
          <div className="col-md-4">
            <img
              src="https://i.ibb.co/9p1940R/slider-banner03-1.png"
              className="img-fluid rounded-start"
              alt="..."
            />
          </div>
          <div className="col-md-8">
            <div className="card-body">
              <h5 className="card-title">Dream Super Shop</h5>
              <p className="card-text">
                Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                Laudantium, delectus.
              </p>
              <p className="card-text">
                <small className="text-muted">dreamShop.com</small>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="card mb-3" style={{ maxWidth: 540 }}>
        <div className="row g-0">
          <div className="col-md-4">
            <img
              src="https://i.ibb.co/LSPwJ4R/anders-jilden-c-Yr-MQA7a3-Wc-unsplash.jpg"
              className="img-fluid rounded-start"
              alt="..."
              style={{ height: 196 }}
            />
          </div>
          <div className="col-md-8">
            <div className="card-body">
              <h5 className="card-title">Dream Agency</h5>
              <p className="card-text">
                Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                Laudantium, delectus.
              </p>
              <p className="card-text">
                <small className="text-muted">dreamagency.com</small>
              </p>
            </div>
          </div>
        </div>
      </div>
      <hr />
      <ContractList />
    </div>
  );
};

export default TrendCard;
