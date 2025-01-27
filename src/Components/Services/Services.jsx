import React from "react";
import { Container } from "@mui/material";
import Webdev from "./compo/Webdev"
import Appdev from "./compo/Appdev"
import UiUx from "./compo/UiUx"
import Mvp  from "./compo/Mvp"
import Seo from "./compo/Seo"
import Smedia from "./compo/Smedia"

const Services = () => {
  return (

    <Container maxWidth="lg" className="h-screen py-24">

      <section id="services">
        <h1 className="text-6xl text-headColor text-center font-bold tracking-tighter mt-12">
          Services
        </h1>

        <p className=" text-smallcolor mt-5 text-sm w-1/2 text-center m-auto">Risus commodo id odio turpis pharetra elementum. Pulihora porta porta feugiat scelerisque in elit. Morbi rhoncus, tellus,</p>

            <div className="m-auto w-full py-7 mt-8 flex gap-12 justify-center text-center flex-wrap ">
           
                  <Webdev />
                  <Appdev />
                  <UiUx />
                  <Mvp />
                  <Seo/>
                  <Smedia />

             </div>


      </section>
    </Container>
  );
};

export default Services;
