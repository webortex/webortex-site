import React, { useState } from "react";
import { Container } from "@mui/material";
import { useNavigate } from "react-router-dom";

const WebForm = () => {
  const navigate = useNavigate();

  const [webFormData, setWebFormData] = useState({
    referenceSites: "",
    referenceDesigns: "",
    marketing: false,
    seo: false,
    ideaDescription: "",
    budget: "",
    timing: "",
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setWebFormData({
      ...webFormData,
      [name]: type === "checkbox" ? checked : value,
    });

    if (errors[name]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
    }
  };

  const handleTimingSelection = (time) => {
    setWebFormData({ ...webFormData, timing: time });

    // Remove timing error when a time is selected
    if (errors.timing) {
      setErrors((prevErrors) => ({ ...prevErrors, timing: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // URL Validation for Reference Sites
    if (webFormData.referenceSites.trim()) {
      const urlPattern =
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(webFormData.referenceSites)) {
        newErrors.referenceSites = "Please enter a valid website URL";
      }
    }

    // URL Validation for Reference Designs
    if (webFormData.referenceDesigns.trim()) {
      const urlPattern =
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(webFormData.referenceDesigns)) {
        newErrors.referenceDesigns =
          "Please enter a valid design reference URL";
      }
    }

    // Idea Description Validation
    if (!webFormData.ideaDescription.trim()) {
      newErrors.ideaDescription = "Idea description is required";
    } else if (webFormData.ideaDescription.trim().length < 20) {
      newErrors.ideaDescription = "Description must be at least 20 characters";
    }

    // Budget Validation
    if (webFormData.budget.trim()) {
      const budgetPattern = /^\$?(\d{1,3}(,\d{3})*|\d+)(\.\d{1,2})?$/;
      if (!budgetPattern.test(webFormData.budget.trim())) {
        newErrors.budget =
          "Please enter a valid dollar amount (e.g., $1,000 or 1000.00)";
      }
    } else {
      newErrors.budget = "Budget is required";
    }

    // Timing Validation
    if (!webFormData.timing) {
      newErrors.timing = "Please select an available timing";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Client-side form validation
    if (validateForm()) {
      // Here you would typically handle form submission
      // For now, we'll just log the form data
      console.log("Form submitted successfully", webFormData);

      // Reset form or show success message
      alert("Form submitted successfully!");
    }
  };

  const handleBack = (e) => {
    e.preventDefault();
    navigate("/get-quote");
  };

  return (
    <div className="min-h-screen py-12 px-4 relative">
      <Container
        maxWidth="lg"
        className="h-auto my-9 sm:my-8 lg:my-14 flex flex-col justify-center align-center"
      >
        <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl text-headColor font-bold tracking-tight">
          WEB
        </h1>
        <p className="text-center text-xs sm:text-sm text-[#696F79] px-[2%] xs:px-[6%] sm:px-[10%] md:px-[28%] mt-2 md:mt-3">
          Let's build a high-performance, scalable website tailored to your
          needs. Fill out the form to get started!
        </p>
        <div className="flex items-center justify-center bg-black text-white mb-4 mt-8">
          <form
            className="rounded-2xl shadow-lg w-full max-w-md space-y-4"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* Reference Sites Input */}
            <div>
              <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
                Reference Sites
              </label>
              <input
                type="text"
                name="referenceSites"
                value={webFormData.referenceSites}
                onChange={handleInputChange}
                placeholder="https://example.com"
                className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                  errors.referenceSites
                    ? "border-red-500"
                    : "border-[#8692A6]/40"
                }`}
              />
              {errors.referenceSites && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.referenceSites}
                </p>
              )}
            </div>

            {/* Reference Designs Input */}
            <div>
              <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
                Reference Designs
              </label>
              <input
                type="text"
                name="referenceDesigns"
                value={webFormData.referenceDesigns}
                onChange={handleInputChange}
                placeholder="Design reference links"
                className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                  errors.referenceDesigns
                    ? "border-red-500"
                    : "border-[#8692A6]/40"
                }`}
              />
              {errors.referenceDesigns && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.referenceDesigns}
                </p>
              )}
            </div>

            {/* Marketing Checkbox */}
            <div>
              <label className="flex items-center justify-between cursor-pointer bg-[#1e1f23] border-[.9px] border-[#8692A6]/40 rounded-[11px] px-5 py-4 w-full hover:bg-[#2a2b30] transition-colors">
                <span className="text-sm md:text-base text-white">
                  Marketing
                </span>
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    name="marketing"
                    checked={webFormData.marketing}
                    onChange={handleInputChange}
                    className="opacity-0 absolute h-5 w-5"
                  />
                  <div
                    className={`border-[.9px] border-[#8692A6]/40 rounded w-5 h-5 flex items-center justify-center ${
                      webFormData.marketing ? "bg-logoGreenColor" : ""
                    }`}
                  >
                    {webFormData.marketing && (
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

            {/* SEO Checkbox */}
            <div>
              <label className="flex items-center justify-between cursor-pointer bg-[#1e1f23] border-[.9px] border-[#8692A6]/40 rounded-[11px] px-5 py-4 w-full hover:bg-[#2a2b30] transition-colors">
                <span className="text-sm md:text-base text-white">SEO</span>
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    name="seo"
                    checked={webFormData.seo}
                    onChange={handleInputChange}
                    className="opacity-0 absolute h-5 w-5"
                  />
                  <div
                    className={`border-[.9px] border-[#8692A6]/40 rounded w-5 h-5 flex items-center justify-center ${
                      webFormData.seo ? "bg-logoGreenColor" : ""
                    }`}
                  >
                    {webFormData.seo && (
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

            {/* Idea Description */}
            <div>
              <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
                Describe Idea*
              </label>
              <textarea
                name="ideaDescription"
                value={webFormData.ideaDescription}
                onChange={handleInputChange}
                rows="4"
                placeholder="Provide detailed description of your website idea"
                className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                  errors.ideaDescription
                    ? "border-red-500"
                    : "border-[#8692A6]/40"
                }`}
              />
              {errors.ideaDescription && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.ideaDescription}
                </p>
              )}
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
                Budget*
              </label>
              <input
                type="text"
                name="budget"
                placeholder="$1,000 ( Enter in Dollars only)"
                value={webFormData.budget}
                onChange={handleInputChange}
                className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                  errors.budget ? "border-red-500" : "border-[#8692A6]/40"
                }`}
              />
              {errors.budget && (
                <p className="text-red-500 text-sm mt-1">{errors.budget}</p>
              )}
            </div>

            {/* Timing Selection */}
            <div>
              <label className="block text-sm md:text-base font-medium mb-3 text-[#696F79]">
                Support Your Available Timing*
              </label>
              <div className="grid grid-cols-2 grid-rows-2 gap-x-20 gap-y-4 ml-6 xs:size-[80%] sm:size-[70%] lg:size-[60%] xl:size-[60%]">
                {["10:00 AM", "12:00 PM", "6:00 PM", "4:00 PM"].map((time) => (
                  <div
                    key={time}
                    onClick={() => handleTimingSelection(time)}
                    className={`p-2 rounded-[20px] bg-[#1e1f23] border-[.9px] flex justify-center items-center cursor-pointer transition-colors ${
                      webFormData.timing === time
                        ? "border-gray-800 bg-[#606477]"
                        : "border-gray-800 hover:border-[#606477]"
                    }`}
                  >
                    <span className="text-sm text-white">{time}</span>
                  </div>
                ))}
              </div>
              {errors.timing && (
                <p className="text-red-500 text-sm mt-2 ml-6">
                  {errors.timing}
                </p>
              )}
            </div>

            {/* Submit and Back Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-center pt-6 sm:gap-x-8 gap-y-4 sm:gap-y-0">
              <button
                type="button"
                className="px-20 py-3 sm:max-h-24 w-full sm:w-[50%] bg-brandsBgColor text-textColor rounded-lg hover:bg-brandsBgColor/60 focus:outline-none transition-all duration-300 ease-in-out"
                onClick={handleBack}
              >
                Back
              </button>
              <button
                type="submit"
                className="px-20 py-3 sm:max-h-24 w-full sm:w-[50%] bg-textColor text-backgroundColor rounded-lg hover:text-textColor hover:bg-brandsBgColor focus:outline-none transition-all duration-300 ease-in-out"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </Container>
    </div>
  );
};

export default WebForm;
