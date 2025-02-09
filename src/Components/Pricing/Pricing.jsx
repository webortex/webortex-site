import React from "react";
import { Container } from "@mui/material";
const Pricing = () => {
  return (
    <Container maxWidth="md">
      <section id="pricing">
        <h1 className="text-center text-3xl xs:text-4xl md:text-5xl xl:text-6xl text-headColor tracking-tight font-bold mt-5">
          Elevate Your Brand
        </h1>
        <p className="text-center text-sm md:text-base px-[10%] text-[#e7e7e7]/60 mt-4">
          We offer tailored solutions to help you establish a strong online
          presence, whether it’s stunning website or powerful app
        </p>

        <div className="bg-brandsBgColor text-white p-8 rounded-2xl shadow-lg border border-pricingBorderColor/50 max-w-3xl mx-auto mt-8 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between  text-center sm:text-left">
            <div>
              <h2 className="text-base md:text-lg tracking-tight font-light">

                Contact us today for
              </h2>
              <h1 className="text-6xl xs:text-7xl md:text-7xl xl:text-8xl font-normal mb-6 tracking-wider">
                FREE
              </h1>
            </div>
            <div className="flex flex-col gap-4 mb-8">

              <button className="bg-[#1b1b1b] hover:bg-[#1b1b1b]/40 text-[#d8d8d8] border border-[#424242] py-4 px-10 rounded-lg transition-all duration-300 ease-in-out">
                Book a Call
              </button>
              <button className="bg-[#494949] hover:bg-[#494949]/40 text-[#f2f2f2] border border-[#424242] py-3 px-10 rounded-lg transition-all duration-300 ease-in-out">

                Get a Quote
              </button>
            </div>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-4  gap-4 text-sm font-medium mb-6">
            {[
              "Domain",
              "SSL",
              "WHOIS Privacy",
              "Customization",
              "Weekly Updates",
              "Hosting",
              "10 Personal Emails",
              "Post Launch Support",
            ].map((item, index) => (
              <li key={index} className="flex items-center gap-2 text-white">
                <span className="text-green-400">▲</span> {item}
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row justify-between mt-12 mb-4">

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-36 h-36 rounded-xl bg-gradient-to-br from-gray-700 via-gray-600 to-gray-800 flex justify-center items-center">
                <span className="text-2xl text-gray-400">★</span>
              </div>

              <div className="ml-5 self-start">
                <p className="text-xs md:text-sm font-light uppercase">From</p>
                <div className="flex items-baseline">
                  <h3 className="text-5xl md:text-6xl xl:text-7xl tracking-widest">
                    IDEA
                  </h3>
                  <p className="text-xs md:text-sm text-gry">to Production</p>
                </div>

                <p className="text-xs md:text-sm text-gray-400">
                  Have a Vision? We bring it to your Life!
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 ">
              <button className="bg-[#1b1b1b] hover:bg-[#1b1b1b]/40 text-[#d8d8d8] border border-[#424242] py-3 px-8 rounded-lg transition-all duration-300 ease-in-out sm:w-xl">
                Call us
              </button>
              <button className="bg-[#1b1b1b] hover:bg-[#1b1b1b]/40 text-[#d8d8d8] border border-[#424242] py-3 px-8 rounded-lg transition-all duration-300 ease-in-out">

                Message us
              </button>
            </div>
          </div>
        </div>
      </section>
    </Container>
  );
};

export default Pricing;
