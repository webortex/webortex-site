import React from "react";
import { Container } from "@mui/material";
import Webdev from "./compo/Webdev";
import Appdev from "./compo/Appdev";
import UiUx from "./compo/UiUx";
import Mvp from "./compo/Mvp";
import Seo from "./compo/Seo";
import Smedia from "./compo/Smedia";

const Services = () => {
  return (
    <Container maxWidth="lg" className="h-full w-full">
      <section id="services">
        <h1 className="text-6xl text-headColor text-left font-bold tracking-tighter">
          Services
        </h1>

        <p className=" text-smallcolor mt-5 text-sm w-1/2 text-center m-auto">
          Risus commodo id odio turpis pharetra elementum. Pulihora porta porta
          feugiat scelerisque in elit. Morbi rhoncus, tellus,
        </p>

        <div className="flex justify-center items-center">
          <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-12">
            <div className="p-8 flex items-center flex-col text-white w-auto max-w-[300px] h-[390px] border-2 rounded-3xl border-[#939393]/60  ">
              <p className="text-2xl font-semibold">Web Development</p>
              <p className="text-xs text-smallcolor font-medium mt-2 mb-5">
                We increase revenue and ensure sustainable long-term growth{" "}
              </p>
              <Webdev />
            </div>
            <Appdev />
            <UiUx />
            <Mvp />
            <Seo />
            <Smedia />
          </div>
        </div>
      </section>
    </Container>
  );
};

export default Services;
