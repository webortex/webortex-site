import React, { useState } from "react";
import { Container } from "@mui/material";

const QuotationProject = () => {
  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
    referenceWebsite: "",
    design: true,
    basicDevelopment: false,
    simpleTesting: false,
    file: null,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      file: e.target.files[0],
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
  };

  return (
    <Container
      maxWidth="sm"
      className="h-auto flex flex-col justify-center align-center py-8"
      style={{ backgroundColor: "black", color: "white" }}
    >
      <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl text-headColor font-bold tracking-tight">
        Quotation
      </h1>
      <p className="text-center text-sm text-[#696F79] mb-6 px-[10%]">
        These essentials will form a practical specification. You can add more
        to the design later, and we'll be right there to help.
      </p>
      <div className="flex items-center justify-center bg-black text-white mb-4 mt-4">
        <form className="w-full space-y-4 max-w-md" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Project Name*
            </label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleInputChange}
              className="w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none border-[.9px] border-[#8692A6]/40"
              required
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Services*
            </label>

            <label className="flex items-center justify-between cursor-pointer bg-[#1e1f23] border-[.9px] border-[#8692A6]/40 rounded-[11px] px-5 py-4 w-full hover:bg-[#2a2b30] transition-colors">
              <span className="text-sm md:text-base text-white">Design</span>
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  name="design"
                  checked={formData.design}
                  onChange={handleInputChange}
                  className="opacity-0 absolute h-5 w-5"
                />
                <div
                  className={`border-[.9px] border-[#8692A6]/40 rounded w-5 h-5 flex items-center justify-center ${
                    formData.design ? "bg-blue-500 border-blue-500" : ""
                  }`}
                >
                  {formData.design && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer bg-[#1e1f23] border-[.9px] border-[#8692A6]/40 rounded-[11px] px-5 py-4 w-full hover:bg-[#2a2b30] transition-colors">
              <span className="text-sm md:text-base text-white">
                Basic Development
              </span>
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  name="basicDevelopment"
                  checked={formData.basicDevelopment}
                  onChange={handleInputChange}
                  className="opacity-0 absolute h-5 w-5"
                />
                <div
                  className={`border-[.9px] border-[#8692A6]/40 rounded w-5 h-5 flex items-center justify-center ${
                    formData.basicDevelopment
                      ? "bg-blue-500 border-blue-500"
                      : ""
                  }`}
                >
                  {formData.basicDevelopment && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer bg-[#1e1f23] border-[.9px] border-[#8692A6]/40 rounded-[11px] px-5 py-4 w-full hover:bg-[#2a2b30] transition-colors">
              <span className="text-sm md:text-base text-white">
                Simple Testing
              </span>
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  name="simpleTesting"
                  checked={formData.simpleTesting}
                  onChange={handleInputChange}
                  className="opacity-0 absolute h-5 w-5"
                />
                <div
                  className={`border-[.9px] border-[#8692A6]/40 rounded w-5 h-5 flex items-center justify-center ${
                    formData.simpleTesting ? "bg-blue-500 border-blue-500" : ""
                  }`}
                >
                  {formData.simpleTesting && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Is it a startup? *
            </label>
            <select
              name="isStartup"
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-[#8692A6] focus:outline-none border-[.9px] border-[#8692A6]/40`}
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Looking for *
            </label>
            <select
              name="lookingFor"
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-[#8692A6] focus:outline-none border-[.9px] border-[#8692A6]/40`}
            >
              <option value="">Select</option>
              <option value="service">Service</option>
              <option value="product">Product</option>
            </select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-around pt-6 sm:gap-x-10 gap-y-4 sm:gap-y-0 ">
            <button
              type="button"
              className="px-20 py-3 sm:max-h-24 w-full sm:w-[50%] bg-brandsBgColor text-textColor rounded-lg  hover:bg-brandsBgColor/60 focus:outline-none transition-all duration-300 ease-in-out"
            >
              Back
            </button>
            <button
              type="submit"
              className="px-10 py-3 sm:max-h-24 w-full sm:w-[50%] bg-textColor text-backgroundColor rounded-lg hover:text-textColor hover:bg-brandsBgColor focus:outline-none transition-all duration-300 ease-in-out"
            >
              Continue →
            </button>
          </div>
        </form>
      </div>
    </Container>
  );
};

export default QuotationProject;
