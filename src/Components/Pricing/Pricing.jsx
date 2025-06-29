import React from "react";
import { Container } from "@mui/material";
import { Link } from "react-router-dom";

const Pricing = () => {
  const phoneNumber = "+917672024001";
  const whatsappMessage = "Hello! I'd like to learn more about your services.";

  const handleCall = () => {
    window.open(`tel:${phoneNumber}`, "_self");
  };

  const handleWhatsApp = () => {
    const encodedMessage = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/917672024001?text=${encodedMessage}`, "_blank");
  };

  return (
    <Container maxWidth="md" className="px-2">
      <section id="pricing">
        <h1 className="text-center text-4xl xs:text-4xl md:text-5xl xl:text-6xl text-headColor tracking-tight font-bold mt-5">
          Elevate Your Brand
        </h1>
        <p className="text-center text-sm md:text-base px-[10%] text-[#e7e7e7]/60 mt-4">
          We offer tailored solutions to help you establish a strong online
          presence, whether it’s stunning website or powerful app
        </p>

        <div className="bg-brandsBgColor text-white p-3 sm:p-6 lg:p-8 rounded-2xl shadow-lg border border-pricingBorderColor/50 max-w-3xl mx-auto mt-8 mb-6">
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
              <button
                onClick={handleWhatsApp}
                className="bg-[#1b1b1b] hover:bg-[#1b1b1b]/40 text-[#d8d8d8] border border-[#424242] py-3 sm:px-10 rounded-lg transition-all duration-300 ease-in-out"
              >
                Message us
              </button>
              <button
                onClick={handleCall}
                className="bg-[#1b1b1b] hover:bg-[#1b1b1b]/40 text-[#d8d8d8] border border-[#424242] py-3 sm:px-10 rounded-lg transition-all duration-300 ease-in-out"
              >
                Call us
              </button>
            </div>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-4  gap-4 text-xs sm:text-sm font-medium mb-6">
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

          <div className="flex flex-col sm:flex-row justify-between mt-12 mb-4 gap-y-6 ">
            <div className="flex flex-col sm:flex-row items-center gap-7 sm:gap-2 lg:gap-6">
              <div className="w-36 h-36 rounded-xl bg-gradient-to-br from-gray-700 via-gray-600 to-gray-800 flex justify-center items-center">
                <span className="text-2xl text-gray-400">★</span>
              </div>

              <div className="sm:ml-2 lg:ml-5 sm:self-start justify-self-center self-center">
                <p className="text-xs xs:text-sm sm:text-xs md:text-sm font-light uppercase">
                  From
                </p>
                <div className="flex items-baseline">
                  <h3 className="text-5xl xs:text-6xl sm:text-5xl md:text-6xl xl:text-7xl tracking-widest">
                    IDEA
                  </h3>
                  <p className="text-xs xs:text-sm sm:text-xs md:text-sm text-gry">
                    to Production
                  </p>
                </div>

                <p className="text-xs xs:text-sm sm:text-xs md:text-sm text-gray-400">
                  Have a Vision? We bring it to your Life!
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:justify-end sm:items-end">
              <Link to="https://cal.com/webortex" target="_blank">
                <button className="bg-[#1b1b1b] hover:bg-[#1b1b1b]/40 text-textColor border border-[#424242] py-3 sm:px-10 rounded-lg transition-all duration-300 ease-in-out w-full">
                  Book a Call
                </button>
              </Link>
              <Link to="/get-quote" className="w-full" target="_blank">
                <button className="bg-white border border-[#424242] hover:bg-brandsBgColor text-brandsBgColor hover:text-textColor transition-all duration-300 ease-in-out w-full py-3 rounded-lg">
                  Get a Quote
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Container>
  );
};

export default Pricing;
