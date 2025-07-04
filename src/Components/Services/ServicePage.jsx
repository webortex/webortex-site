import { Container } from "@mui/material";
import React from "react";
import { Link, useParams } from "react-router-dom";
import { Consumer } from "../ContextAPI/ContextAPI";
import { Helmet } from "react-helmet";

const ServicePage = () => {
  const { slug } = useParams();

  return (
    <Consumer>
      {(value) => {
        const { services } = value;
        const service = services.find((service) => service.slug === slug);
        return (
          <>
            <Helmet>
              <title>{service.fullTitle}</title>
              <meta name="description" content={service.fullDescription} />
              <link rel="canonical" href={service.canonicalUrl} />
              <meta name="keywords" content={service.keywords} />

              <meta property="og:title" content={service.fullTitle} />
              <meta
                property="og:description"
                content={service.fullDescription}
              />
              <meta property="og:url" content={service.canonicalUrl} />
            </Helmet>

            <div>
              {service ? (
                <div>
                  <div className="flex justify-center h-dvh h-screen py-10 relative">
                    {service.frameImg ? (
                      <img
                        src={service.frameImg}
                        alt={service.title}
                        className="h-full object-contain rounded-2xl opacity-40"
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
                    {/* {service.mockupImage && (
                    <div className="py-10 sm:py-20 lg:py-32 2xl:py-40">
                      <img
                        src={service.mockupImage}
                        alt="social media marketing"
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    </div>
                  )} */}
                    {service.banners &&
                      service.banners.map((banner, index) => (
                        <div
                          key={index}
                          className={`grid grid-cols-1 md:grid-cols-2 w-full my-14 xs:my-20 md:my-20 2xl:my-24 ${
                            index % 2 === 0 ? "" : "md:[direction:rtl]"
                          }`}
                        >
                          <div className="flex flex-col justify-center items-center md:items-start align-middle text-center md:text-left px-3 xs:px-14 sm:px-24 md:px-8 2xl:px-20 [direction:ltr] order-2 md:order-1">
                            <h2 className="text-center md:text-left text-2xl xs:text-3xl md:text-4xl lg:text-5xl text-white">
                              {banner.title}
                            </h2>
                            <p className="text-xs md:text-sm text-secondaryTextColor mt-2 md:mt-8">
                              {banner.description}
                            </p>
                          </div>
                          <div className="flex items-center justify-center order-1 md:order-2">
                            {banner.image ? (
                              <img
                                src={banner.image}
                                alt={banner.title}
                                className=" w-full h-full object-cover rounded-2xl scale-[80%]"
                              />
                            ) : (
                              <video
                                src={banner.video}
                                className="w-full h-full object-cover rounded-2xl scale-90"
                                autoPlay
                                loop
                                muted
                                playsInline
                              />
                            )}
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
          </>
        );
      }}
    </Consumer>
  );
};

export default ServicePage;
