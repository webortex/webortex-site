import React from "react";
import { Container } from "@mui/material";
import { Consumer } from "../ContextAPI/ContextAPI";
import { Link } from "react-router-dom";

const Services = () => {
  return (
    <Consumer>
      {(value) => {
        const { services } = value;
        return (
          <Container
            maxWidth="lg"
            className="h-full w-full"
          >
            <section id="services">
              <h1 className="text-6xl text-center text-headColor font-bold tracking-tighter">
                Services
              </h1>

              <p className=" text-smallcolor mt-5 text-sm w-1/2 text-center m-auto">
                Risus commodo id odio turpis pharetra elementum. Pulihora
                porta porta feugiat scelerisque in elit. Morbi rhoncus,
                tellus,
              </p>

              <div className="flex justify-center items-center">
                <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-12">
                  {services.map((service) => (
                    <Link
                      to={`/services/${service.slug}`}
                      key={service.id}
                      className="p-8 flex items-center flex-col bg-[#111111]/70 text-white w-auto max-w-[320px] h-[410px] border-2 rounded-3xl border-[#939393]/60"
                    >
                      <p className="text-2xl font-semibold">
                        {service.title}
                      </p>
                      <p className="text-xs text-smallcolor font-medium mt-2 mb-5">
                        {service.description}
                      </p>
                      {service.component}
                    </Link>
                  ))}
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
