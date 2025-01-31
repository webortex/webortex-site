import { Container } from "@mui/material";
import React from "react";
import { useParams } from "react-router-dom";
import { Consumer } from "../ContextAPI/ContextAPI";

const ServicePage = () => {
  const { slug } = useParams();

  return (
    <Consumer>
      {(value) => {
        const { services } = value;
        const service = services.find((service) => service.slug === slug);
        return (
          <Container maxWidth="lg">
            {service ? (
              <div className="flex justify-center items-center h-screen">
                <h1 className="text-headColor text-5xl leading-relaxed">
                  {service.title}
                </h1>
              </div>
            ) : (
              <div className="flex justify-center items-center h-screen">
                <h1 className="text-white text-5xl">Service Not Found</h1>
              </div>
            )}
          </Container>
        );
      }}
    </Consumer>
  );
};

export default ServicePage;
