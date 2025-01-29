import { Container } from "@mui/material";
import React from "react";
import { useParams } from "react-router-dom";
import { Consumer } from "../ContextAPI/ContextAPI";

const ServicePage = () => {
  const { slug } = useParams;

  return (
    <Consumer>
      {(value) => {
        const { services } = value;
        const service = services.find((service) => services.slug === slug);
        return (
          <Container maxWidth="lg">
            <div className="flex justify-center items-center h-screen">
              <h1 className="text-headColor text-white text-5xl">
                Wecolme to {service.title}
              </h1>
            </div>
          </Container>
        );
      }}
    </Consumer>
  );
};

export default ServicePage;
