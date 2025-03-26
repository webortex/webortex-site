import React, { useState } from "react";
import { Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useForm } from "./FormContext";

const QuotationProject = () => {
  const navigate = useNavigate();
  const { formData, updateProjectInfo } = useForm();
  const [lookingFor, setLookingFor] = useState("Select");
  const [projectFormData, setProjectFormData] = useState({
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
    setProjectFormData({
      ...projectFormData,
      [name]: type === "checkbox" ? checked : value,
    });

    if (errors[name]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!projectFormData.projectName.trim()) {
      newErrors.projectName = "Project Name is required";
    }

    if (!projectFormData.isStartup) {
      newErrors.isStartup = "Please select startup status";
    }

    if (lookingFor === "Select") {
      newErrors.lookingFor = "Please select an option";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBack = (e) => {
    e.preventDefault();
    navigate("/get-quote");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    updateProjectInfo({
      ...projectFormData,
      lookingFor,
    });

    if (lookingFor === "WEB") navigate("/get-quote/web-details");
    else if (lookingFor === "APP") navigate("/get-quote/app-details");
    else if (lookingFor === "MVP") navigate("/get-quote/mvp-details");
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
        These essentials will form a practical specification. You can add more
        to the design later, and we'll be right there to help.
      </p>
      <div className="flex items-center justify-center bg-black text-white mb-4 mt-8">
        <form
          className="rounded-2xl shadow-lg w-full max-w-md space-y-4"
          onSubmit={handleSubmit}
          noValidate
        >
          {/* Project Name */}
          <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Project Name*
            </label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleInputChange}
              placeholder="Enter project name"
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.projectName ? "border-red-500" : "border-[#8692A6]/40"
              }`}
            />
            {errors.projectName && (
              <p className="text-red-500 text-sm mt-1">{errors.projectName}</p>
            )}
          </div>

          {/* Services Checkboxes */}
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
                    formData.design ? "bg-logoGreenColor" : ""
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
                    formData.basicDevelopment ? "bg-logoGreenColor" : ""
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
                    formData.simpleTesting ? "bg-logoGreenColor" : ""
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

          {/* Is Startup */}
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

          {/* Looking For */}
          <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Looking for *
            </label>
            <select
              name="lookingFor"
              value={lookingFor}
              onChange={(e) => {
                setLookingFor(e.target.value);
                // Clear looking for error when a selection is made
                if (errors.lookingFor) {
                  setErrors((prevErrors) => ({
                    ...prevErrors,
                    lookingFor: "",
                  }));
                }
              }}
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.lookingFor ? "border-red-500" : "border-[#8692A6]/40"
              }`}
            >
              <option value="Select">Select</option>
              <option value="MVP">MVP</option>
              <option value="APP">APP</option>
              <option value="WEB">WEB</option>
            </select>
            {errors.lookingFor && (
              <p className="text-red-500 text-sm mt-1">{errors.lookingFor}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-center pt-6 sm:gap-x-10 gap-y-4 sm:gap-y-0">
            <button
              type="button"
              className="px-20 py-3 sm:max-h-24 w-full sm:w-[50%] bg-brandsBgColor text-textColor rounded-lg hover:bg-brandsBgColor/60 focus:outline-none transition-all duration-300 ease-in-out"
              onClick={handleBack}
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
