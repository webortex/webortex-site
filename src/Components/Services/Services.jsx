import React, { useState } from "react";
import { Container } from "@mui/material";
import { Consumer } from "../ContextAPI/ContextAPI";
import { Link } from "react-router-dom";

import { Squares } from "@/Components/ui/Squares";

const Services = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Consumer>
      {(value) => {
        const { services } = value;
        return (
          <Container maxWidth="lg" className="h-full w-full overflow-hidden">
            <section id="services">
              <div className="mb-8">
                <h1 className="text-6xl text-center text-headColor font-bold tracking-tighter">
                  Services
                </h1>

                <p className="text-secondaryTextColor text-smallcolor mt-5 text-xs sm:text-sm xl:text-base  xs:w-2/3 md:w-3/5 text-center m-auto">
                  Crafting scalable, user-centric solutions with
                  innovation-driven web development, design, marketing & app
                  solutions.
                </p>
              </div>

              <div className="flex justify-center items-center">
                <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 md:gap-y-12 gap-x-6 md:gap-x-10">
                  {services.map((service, index) => {
                    return service.componentGif ? (
                      <Link
                        to={`/services/${service.slug}`}
                        key={service.id}
                        className={`
                          p-8 flex items-center flex-col 
                          text-white w-auto md:max-w-[377px] md:h-[420px] max-w-[300px] h-[400px] 
                          border-2 rounded-3xl border-[#939393]/60 relative overflow-hidden
                          transition-all ease-in-out
                        `}
                      >
                        <p className="text-2xl xl:text-3xl text-textColor tracking-wide font-semibold text-center">
                          {service.title}
                        </p>
                        <p className="text-xs sm:text-sm xl:text-base text-center text-secondaryTextColor text-smallcolor font-medium mt-2">
                          {service.description}
                        </p>

                        <div className="max-w-full max-h-48 sm:max-h-52 lg:max-h-56 2xl:max-h-60 overflow-hidden my-auto">
                          <img
                            src={service.componentGif}
                            alt={`${service.title} illustration`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </Link>
                    ) : (
                      <Link
                        to={`/services/${service.slug}`}
                        key={service.id}
                        className={`
                          p-8 flex items-center flex-col 
                          ${
                            index === 0
                              ? "text-white w-auto md:max-w-[377px] md:h-[420px] max-w-[300px] h-[400px] border-2 rounded-3xl border-[#939393]/60 relative overflow-visible transition-all ease-in-out"
                              : "bg-[#111111]/70 text-white w-auto md:max-w-[377px] md:h-[420px] max-w-[300px] h-[400px] border-2 rounded-3xl border-[#939393]/60"
                          }
                        `}
                        onMouseEnter={() => index === 0 && setIsHovered(true)}
                        onMouseLeave={() => index === 0 && setIsHovered(false)}
                      >
                        {index === 0 && isHovered && (
                          <div className="absolute inset-0 -z-20 transition-all ease-in-out">
                            <Squares
                              direction="diagonal"
                              speed={0.5}
                              squareSize={40}
                              borderColor="#333"
                              hoverFillColor="#222"
                            />
                          </div>
                        )}

                        <p className="text-2xl xl:text-3xl text-textColor tracking-wide font-semibold text-center">
                          {service.title}
                        </p>
                        <p className="text-xs sm:text-sm xl:text-base text-center text-secondaryTextColor text-smallcolor font-medium mt-2">
                          {service.description}
                        </p>
                        <div className="">{service.component}</div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          </Container>
        );
      }}
    </Consumer>
  );
};

export default Services;
