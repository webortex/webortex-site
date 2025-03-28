import React, { useState, useEffect } from "react";
import { Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { db, storage } from "../../../Firebaseconfig";
import { doc, setDoc } from "firebase/firestore";

const AppForm = () => {
  const navigate = useNavigate();

  const [submitStatus, setSubmitStatus] = useState(null);

  const [formData, setFormData] = useState({
    referenceSites: "",
    referenceDesigns: "",
    marketing: false,
    seo: false,
    ideaDescription: "",
    budget: "",
    timing: "",
    publish: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWhatsApp = () => {
    const encodedMessage = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/918688281821?text=${encodedMessage}`, "_blank");
  };

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

    // Validate Reference Sites (only validate if something is entered)
    if (formData.referenceSites.trim()) {
      const urlPattern =
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(formData.referenceSites)) {
        newErrors.referenceSites = "Please enter a valid website URL";
      }
    }

    // Validate Reference Designs (only validate if something is entered)
    if (formData.referenceDesigns.trim()) {
      const urlPattern =
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(formData.referenceDesigns)) {
        newErrors.referenceDesigns =
          "Please enter a valid design reference URL";
      }
    }

    // Validate Idea Description (required and minimum length)
    if (!formData.ideaDescription.trim()) {
      newErrors.ideaDescription = "Idea description is required";
    } else if (formData.ideaDescription.trim().length < 20) {
      newErrors.ideaDescription = "Description must be at least 20 characters";
    }

    // Validate Budget (must be a valid dollar amount)
    if (formData.budget.trim()) {
      const budgetPattern = /^\$?(\d{1,3}(,\d{3})*|\d+)(\.\d{1,2})?$/;
      if (!budgetPattern.test(formData.budget.trim())) {
        newErrors.budget =
          "Please enter a valid dollar amount (e.g., $1,000 or 1000.00)";
      }
    } else {
      newErrors.budget = "Budget is required";
    }

    // Validate Timing (required)
    if (!formData.timing) {
      newErrors.timing = "Please select an available timing";
    }

    // Validate Publish (required)
    if (!formData.publish.trim()) {
      newErrors.publish = "Publish platform is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleBack = () => {
    navigate("/get-quote");
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent form refresh
    setSubmitStatus(null);

    if (validateForm()) {
      try {
        setIsSubmitting(true);

        const mainFormData =
          JSON.parse(sessionStorage.getItem("mainForm")) || {};
        const finalData = {
          ...mainFormData,
          ...formData,
          timestamp: new Date(),
        };

        const docRef = doc(db, "app_quotation", mainFormData.name.trim());
        await setDoc(docRef, finalData);
        console.log(
          "Document written with ID:",
          docRef?.id || "No ID returned"
        );

        sessionStorage.removeItem("mainForm"); // Clear temp data
        setSubmitStatus("success");
      } catch (error) {
        console.error("Error adding document:", error);
        setSubmitStatus("error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleTimingSelection = (time) => {
    setFormData({ ...formData, timing: time });

    // Remove timing error when a time is selected
    if (errors.timing) {
      setErrors((prevErrors) => ({ ...prevErrors, timing: "" }));
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 relative">
      {submitStatus === "success" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-brandsBgColor p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-logoGreenColor mx-auto mb-4"
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
              <h2 className="text-2xl font-normal text-white mb-2">
                Submission Successful!
              </h2>
              <p className="text-white/80 font-light px-[5%] mb-4">
                Thank you for your submission. We'll review your requirements
                and get back to you soon.
              </p>
              <button
                onClick={() => navigate("/get-quote")}
                className="px-4 py-2 bg-logoGreenColor/80 text-white rounded hover:bg-white/80 hover:text-brandsBgColor transition-all duration-300 ease-in-out my-2 w-[55%]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {submitStatus === "error" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-brandsBgColor p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-red-500 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="text-2xl font-normal text-white mb-2">
                Submission Failed
              </h2>
              <p className="text-white/80 font-light px-[5%] mb-4">
                There was an error submitting your application. Please try again
                later.
              </p>
              <button
                onClick={() => setSubmitStatus(null)}
                className="px-4 py-2 bg-red-500/90 text-white rounded hover:bg-white/80 hover:text-brandsBgColor transition-all duration-300 ease-in-out my-2 w-[55%]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleWhatsApp}
        className="absolute top-[4%] right-[8%] px-4 py-2 text-sm text-gray-300 rounded bg-brandsBgColor hover:bg-brandsBgColor/60 transition-colors"
      >
        Message us
      </button>

      <Container
        maxWidth="lg"
        className="h-auto my-9 sm:my-8 lg:my-14 flex flex-col justify-center align-center"
      >
        <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl text-headColor font-bold tracking-tight">
          APP
        </h1>
        <p className="text-center text-xs sm:text-sm text-[#696F79] px-[2%] xs:px-[6%] sm:px-[10%] md:px-[28%] mt-2 md:mt-3">
          Turn your app idea into reality! Share your requirements, and we'll
          craft a powerful, user-friendly mobile or web app.
        </p>
        <div className="flex items-center justify-center bg-black text-white mb-4 mt-8">
          <form
            className="rounded-2xl shadow-lg w-full max-w-md space-y-4"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* Reference Sites */}
            <div>
              <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
                Reference Sites
              </label>
              <input
                type="text"
                name="referenceSites"
                value={formData.referenceSites}
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

            {/* Reference Designs (Similar approach) */}
            <div>
              <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
                Reference Designs
              </label>
              <input
                type="text"
                name="referenceDesigns"
                value={formData.referenceDesigns}
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

            {/* Marketing Checkbox (kept as before) */}
            <div>
              <label className="flex items-center justify-between cursor-pointer bg-[#1e1f23] border-[.9px] border-[#8692A6]/40 rounded-[11px] px-5 py-4 w-full hover:bg-[#2a2b30] transition-colors">
                <span className="text-sm md:text-base text-white">
                  Marketing
                </span>
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    name="marketing"
                    checked={formData.marketing}
                    onChange={handleInputChange}
                    className="opacity-0 absolute h-5 w-5"
                  />
                  <div
                    className={`border-[.9px] border-[#8692A6]/40 rounded w-5 h-5 flex items-center justify-center ${
                      formData.marketing ? "bg-logoGreenColor" : ""
                    }`}
                  >
                    {formData.marketing && (
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

            {/* SEO Checkbox (kept as before) */}
            <div>
              <label className="flex items-center justify-between cursor-pointer bg-[#1e1f23] border-[.9px] border-[#8692A6]/40 rounded-[11px] px-5 py-4 w-full hover:bg-[#2a2b30] transition-colors">
                <span className="text-sm md:text-base text-white">SEO</span>
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    name="seo"
                    checked={formData.seo}
                    onChange={handleInputChange}
                    className="opacity-0 absolute h-5 w-5"
                  />
                  <div
                    className={`border-[.9px] border-[#8692A6]/40 rounded w-5 h-5 flex items-center justify-center ${
                      formData.seo ? "bg-logoGreenColor" : ""
                    }`}
                  >
                    {formData.seo && (
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
                value={formData.ideaDescription}
                onChange={handleInputChange}
                rows="4"
                placeholder="Provide detailed description of your app idea"
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
                value={formData.budget}
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
                      formData.timing === time
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

            {/* Publish Section */}
            <div>
              <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
                Publish*
              </label>
              <input
                type="text"
                name="publish"
                placeholder="Play Store"
                value={formData.publish}
                onChange={handleInputChange}
                className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                  errors.publish ? "border-red-500" : "border-[#8692A6]/40"
                }`}
              />
              {errors.publish && (
                <p className="text-red-500 text-sm mt-1">{errors.publish}</p>
              )}
            </div>

            {/* Submit Button */}
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
                className="px-10 py-3 sm:max-h-24 w-full sm:w-[50%] bg-textColor text-backgroundColor rounded-lg hover:text-textColor hover:bg-brandsBgColor focus:outline-none transition-all duration-300 ease-in-out disabled:bg-logoBlueColor/40 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </Container>
    </div>
  );
};

export default AppForm;
