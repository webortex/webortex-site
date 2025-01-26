import React from "react";
import { Container } from "@mui/material";
const Pricing = () => {
  return (
    <Container maxWidth="lg">
      <section id="pricing">
        <h1 className="text-center text-3xl xs:text-4xl md:text-5xl xl:text-6xl text-white font-bold mt-5">
          Elevate Your Brand
        </h1>
        <p className="text-center text-sm md:text-base xl:text-lg text-gray-700 mt-2">
          We offer tailored solutions to help you establish a strong online
          presence, whether it’s stunning website or powerful app{" "}
        </p>
        <div className="bg-black text-white p-8 rounded-2xl shadow-lg border border-blue-500 max-w-4xl mx-auto mt-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between  text-center sm:text-left">
            <div>
              <h2 className="text-base md:text-lg font-light mb-4">
                Contact us today for
              </h2>
              <h1 className="text-4xl xs:text-5xl md:text-6xl xl:text-7xl font-bold mb-6">
                FREE
              </h1>
            </div>
            <div className="flex flex-col gap-4 mb-8">
              <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg">
                Book a Call
              </button>
              <button className="bg-gray-500 hover:bg-gray-400 text-white py-2 px-4 rounded-lg">
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
          <div className="flex flex-col sm:flex-row justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-gray-700 via-gray-600 to-gray-800 flex justify-center items-center">
                <span className="text-2xl text-gray-400">★</span>
              </div>
              <div>
                <p className="text-base md:text-xl font-light uppercase">
                  From
                </p>
                <h3 className="text-2xl md:text-3xl font-bold">IDEA</h3>
                <p className="text-base md:text-xl">to Production</p>
                <p className="text-xs md:text-sm text-gray-400">
                  Have a Vision? We bring it to your Life!
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4 mt-8">
              <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg sm:w-xl">
                Call us
              </button>
              <button className="bg-gray-500 hover:bg-gray-400 text-white py-2 px-4 rounded-lg">
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
