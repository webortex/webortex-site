import { Container } from "@mui/material";
import React from "react";
import { Link, useParams } from "react-router-dom";
import { Consumer } from "../ContextAPI/ContextAPI";

const ServicePage = () => {
  const { slug } = useParams();

  return (
    <Consumer>
      {(value) => {
        const { services } = value;
        const service = services.find((service) => service.slug === slug);
        return (
          <div>
            {service ? (
              <div>
                <div className="flex justify-center h-screen py-10 relative">
                  {service.frameImg ? (
                    <img
                      src={service.frameImg}
                      alt={service.title}
                      className="h-full rounded-2xl opacity-40"
                    />
                  ) : (
                    <video
                      src={service.frameVideo}
                      className="h-full rounded-2xl opacity-40"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  )}

                  <div className="absolute inset-0 w-full h-full">
                    <div className="flex flex-col justify-center items-center h-full">
                      <h1 className="text-textColor text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-relaxed">
                        {service.frameTitle}
                      </h1>
                      <p className="text-center text-xs md:text-sm text-secondaryTextColor px-[4%] xs:px-[8%] sm:px-[16%] lg:px-[22%] 2xl:px-[28%]">
                        {service.frameText}
                      </p>
                    </div>
                  </div>
                </div>
                <Container maxWidth="lg">
                  {service.mockupImage && (
                    <div className="py-10 sm:py-20 lg:py-32 2xl:py-40">
                      <img
                        src={service.mockupImage}
                        alt="social media marketing"
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    </div>
                  )}
                  {service.banners &&
                    service.banners.map((banner, index) => (
                      <div
                        key={index}
                        className={`relative flex flex-col-reverse md:flex-row justify-center items-center w-full my-8 md:my-20 ${
                          index % 2 === 0
                            ? "md:flex-row"
                            : "md:flex-row-reverse"
                        }`}
                      >
                        <div className="flex flex-col justify-center items-center align-middle text-center md:text-left px-3 xs:px-14 sm:px-24 md:px-10 2xl:px-20">
                          <h2 className="text-2xl xs:text-3xl md:text-4xl lg:text-5xl text-white">
                            {banner.title}
                          </h2>
                          <p className="text-xs md:text-sm text-secondaryTextColor mt-2 md:mt-8">
                            {banner.description}
                          </p>
                        </div>
                        <div className="px-3 xs:px-10 sm:px-20 md:px-10 2xl:px-20 mb-5 md:mb-0">
                          <img src={banner.image} alt="" />
                        </div>
                      </div>
                    ))}
                </Container>
              </div>
            ) : (
              <Container maxWidth="lg">
                <div className="flex flex-col justify-center items-center text-center mx-auto h-screen h-dvh">
                  <h1 className="text-white tracking-wider md:tracking-widest font-medium text-4xl md:text-5xl">
                    Service Not Found
                  </h1>
                  <p className="mt-4 text-secondaryTextColor text-sm md:text-base px-7 xs:px-0">
                    The requested service does not exist.{" "}
                    <Link
                      to="/"
                      className="text-navlinkHoverColor/80 hover:text-navlinkHoverColor transition-all duration-300 ease-in-out"
                    >
                      Back to Home
                    </Link>
                  </p>
                </div>
              </Container>
            )}
          </div>
        );
      }}
    </Consumer>
  );
};

export default ServicePage;
