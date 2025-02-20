import React, { useState } from "react";
import { Container } from "@mui/material";
import alert from "../../assets/alert.png";

const Quotation = () => {
  const [alertpop, setAlertpop] = useState(true);
  return (
    <Container
      maxWidth="lg"
      className="h-screen h-dvh flex flex-col justify-center align-center"
    >
      <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl text-headColor font-bold tracking-tight">
        Quotation
      </h1>
      <p className="text-center text-xs sm:text-sm lg:text-base text-secondaryTextColor px-[2%] xs:px-[6%] sm:px-[10%] md:px-[22%] mt-2 md:mt-4">
        Risus commodo id odio turpis pharetra elementum. Pulvinar porta porta
        feugiat scelerisque in elit. Morbi rhoncus, tellus,{" "}
      </p>
      {alertpop == true ? (
        <div className="sm:w-[400px] flex gap-3 rounded-lg px-4 py-4 bg-[#262626] fixed right-10 top-60">
          <div className="h-[50px] w-[100px]">
            <img src={alert} alt="Alert" className="pt-4" />
          </div>
          <div>
            <p className="text-lg text-white font-bold">Quotation Alert</p>
            <p className="text-gray-500 text-xs">
              A free quotation is available only once. Our team will follow up
              with the generated quotation. For additional quotes, other options
              may apply
            </p>
            <p className="text-white text-sm pt-2 cursor-pointer">Learn More</p>
          </div>
          <div
            className="cursor-pointer bg-[#BAB5B5] rounded-[50%] h-[20px] p-2 w-[20px] flex justify-center items-center text-[#4F4F4F]"
            onClick={() => setAlertpop(false)}
          >
            <p className="text-lg font-bold">x</p>
          </div>
        </div>
      ) : (
        ""
      )}
      <div className="flex items-center justify-center bg-black text-white mb-4 mt-4">
        <form className="rounded-2xl shadow-lg w-full max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[#696F79]">
              Name *
            </label>
            <input
              type="text"
              required
              placeholder="Enter your Name"
              className="w-full px-4 py-4 rounded-lg bg-[#333] text-white placeholder-[#8692A6] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[#696F79]">
              Email address *
            </label>
            <input
              type="email"
              required
              placeholder="Enter email address"
              className="w-full px-4 py-4 rounded-lg bg-[#333] text-white placeholder-[#8692A6] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[#696F79]">
              Mobile number *
            </label>
            <input
              type="tel"
              required
              placeholder="+91"
              className="w-full px-4 py-4 rounded-lg bg-[#333] text-white placeholder-[#8692A6] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[#696F79]">
              Current Address
            </label>
            <input
              type="text"
              placeholder=""
              className="w-full px-4 py-4 rounded-lg bg-[#333] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[#696F79]">
              Company Name *
            </label>
            <input
              type="text"
              required
              placeholder=""
              className="w-full px-4 py-4 rounded-lg bg-[#333] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[#696F79]">
              Is it a startup? *
            </label>
            <select
              required
              className="w-full px-4 py-4 rounded-lg bg-[#333] text-[#8692A6] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[#696F79]">
              Looking for *
            </label>
            <select
              required
              className="w-full px-4 py-4 rounded-lg bg-[#333] text-[#8692A6] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              <option value="service">Service</option>
              <option value="product">Product</option>
            </select>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-around pt-6 sm:gap-x-10 ">
            <button
              type="button"
              className="px-20 py-3 sm:max-h-24 w-full sm:w-[50%] bg-brandsBgColor text-textColor rounded-lg hover:bg-brandsBgColor/60 focus:outline-none transition-all duration-300 ease-in-out"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 sm:max-h-24 w-full sm:w-[50%] bg-textColor text-backgroundColor rounded-lg hover:bg-logoBlueColor/90 focus:outline-none transition-all duration-300 ease-in-out"
            >
              Continue →
            </button>
          </div>
        </form>
      </div>
    </Container>
  );
};

export default Quotation;
