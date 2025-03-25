import React, { useState } from "react";
import { Container } from "@mui/material";
import alertImg from "../../assets/alert.png";
import QuotationProject from "./QuotationProject";
import { useNavigate } from "react-router-dom";

const Quotation = () => {
  const navigate = useNavigate();
  const [alertpop, setAlertpop] = useState(true);

  const [lookingFor, setLookingFor] = useState("Select");
  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
    referenceWebsite: "",
    design: true,
    basicDevelopment: false,
    simpleTesting: false,
    file: null,
    isStartup: "",
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate Project Name
    if (!formData.projectName.trim()) {
      newErrors.projectName = "Project Name is required";
    }

    // Validate Is Startup
    if (!formData.isStartup) {
      newErrors.isStartup = "Please select startup status";
    }

    // Validate Looking For
    if (lookingFor === "Select") {
      newErrors.lookingFor = "Please select an option";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = (e) => {
    e.preventDefault();
    // Reset form data to initial state
    setFormData({
      projectName: "",
      description: "",
      referenceWebsite: "",
      design: true,
      basicDevelopment: false,
      simpleTesting: false,
      file: null,
      isStartup: "",
    });

    // Reset looking for
    setLookingFor("Select");

    // Clear all errors
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (lookingFor === "WEB") navigate("/web-quote");
    else if (lookingFor === "APP") navigate("/app-quote");
    else if (lookingFor === "MVP") navigate("/mvp-quote");
  };

  return (
    <Container
      maxWidth="lg"
      className="h-auto my-9 sm:my-8 lg:my-14 flex flex-col justify-center align-center"
    >
      <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl text-headColor font-bold tracking-tight">
        Quotation
      </h1>
      <p className="text-center text-xs sm:text-sm text-[#696F79] px-[2%] xs:px-[6%] sm:px-[10%] md:px-[28%] mt-2 md:mt-3">
        Get a tailored solution for your needs! Fill out the form with your
        requirements, and we’ll provide a custom quote for you.
      </p>
      <div className="flex items-center justify-center bg-black text-white mb-4 mt-8">
        <form
          className="rounded-2xl shadow-lg w-full max-w-md space-y-4"
          onSubmit={handleSubmit}
          noValidate
        >
          <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your Name"
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.name ? "border-red-500" : "border-[#8692A6]/40"
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Email address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter email address"
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.5px] ${
                errors.email ? "border-red-500" : "border-[#8692A6]/40"
              }`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Mobile number *
            </label>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleInputChange}
              placeholder="+91"
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.mobile ? "border-red-500" : "border-[#8692A6]/40"
              }`}
            />
            {errors.mobile && (
              <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>
            )}
          </div>
          <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Current Address
            </label>
            <input
              type="text"
              name="currentAddress"
              value={formData.currentAddress}
              onChange={handleInputChange}
              placeholder=""
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.currentAddress ? "border-red-500" : "border-[#8692A6]/40"
              }`}
            />
            {errors.currentAddress && (
              <p className="text-red-500 text-sm mt-1">
                {errors.currentAddress}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Company Name *
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              placeholder=""
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.companyName ? "border-red-500" : "border-[#8692A6]/40"
              }`}
            />
            {errors.companyName && (
              <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Is it a startup? *
            </label>
            <select
              name="isStartup"
              value={formData.isStartup}
              onChange={handleInputChange}
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.isStartup ? "border-red-500" : "border-[#8692A6]/40"
              }`}
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            {errors.isStartup && (
              <p className="text-red-500 text-sm mt-1">{errors.isStartup}</p>
            )}
          </div>
          <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Looking for *
            </label>
            <select
              name="lookingFor"
              value={formData.lookingFor}
              onChange={handleInputChange}
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.lookingFor ? "border-red-500" : "border-[#8692A6]/40"
              }`}
            >
              <option value="">Select</option>
              <option value="service">Service</option>
              <option value="product">Product</option>
            </select>
            {errors.lookingFor && (
              <p className="text-red-500 text-sm mt-1">{errors.lookingFor}</p>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-around pt-6 sm:gap-x-10 gap-y-4 sm:gap-y-0 ">
            <button
              type="button"
              className="px-20 py-3 sm:max-h-24 w-full sm:w-[50%] bg-brandsBgColor text-textColor rounded-lg  hover:bg-brandsBgColor/60 focus:outline-none transition-all duration-300 ease-in-out"
              onClick={handleReset}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-10 py-3 sm:max-h-24 w-full sm:w-[50%] bg-textColor text-backgroundColor rounded-lg hover:text-textColor hover:bg-brandsBgColor focus:outline-none transition-all duration-300 ease-in-out"
            >
              Continue →
            </button>
          </div>
        </form>
        {alertpop == true ? (
          <div className="sm:w-[400px] flex gap-3 rounded-lg px-4 py-4 bg-[#262626] fixed right-10 top-60">
            <div className="h-[50px] w-[100px]">
              <img src={alertImg} alt="Alert" className="pt-4" />
            </div>
            <div>
              <p className="text-lg text-white font-bold">Quotation Alert</p>
              <p className="text-gray-500 text-xs">
                A free quotation is available only once. Our team will follow up
                with the generated quotation. For additional quotes, other
                options may apply
              </p>
              <p className="text-white text-sm pt-2 cursor-pointer">
                Learn More
              </p>
            </div>
            <div
              className="cursor-pointer bg-[#BAB5B5] rounded-[50%] h-[20px] p-2 w-[20px] flex justify-center items-center text-[#4F4F4F] "
              onClick={() => setAlertpop(false)}
            >
              <p className="text-lg items-center justify-center mt-[-2.5px]">
                x
              </p>
            </div>
          </div>
        ) : (
          ""
        )}
      </div>
    </Container>
  );
};

export default Quotation;
