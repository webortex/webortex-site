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
              <div>
                <div className="flex justify-center my-10">
                  <img
                    src={service.frame}
                    alt={service.title}
                    className="size-[90%]"
                  />
                  <div className="absolute h-full w-full">
                    <div className="pt-[21%] flex flex-col justify-center items-center">
                      <h1 className="text-headColor text-6xl font-bold leading-relaxed">
                        {service.title}
                      </h1>
                      <p className="text-center text-sm text-secondaryTextColor px-[30%]">
                        {service.frameText}
                      </p>
                    </div>
                  </div>
                </div>
                {/* {resource.buttons &&
                          resource.buttons.map((button, index) => ( */}
                {service.banners &&
                  service.banners.map((banner, index) => (
                    <div
                      key={index}
                      className={`relative flex flex-col md:flex-row justify-center items-center w-full my-20 ${
                        index % 2 === 0
                          ? "md:flex-row"
                          : "md:flex-row-reverse"
                      }`}
                    >
                      <div className="flex flex-col justify-center items-center px-20">
                        <h2 className="text-5xl text-white">
                          {banner.title}
                        </h2>
                        <p className="text-sm text-secondaryTextColor mt-8">
                          {banner.description}
                        </p>
                      </div>
                      <div className="px-20">
                        <img
                          src={banner.image}
                          alt=""
                        />
                      </div>
                    </div>
                  ))}
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
