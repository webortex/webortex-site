import React, { useState } from "react";
import { Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { db, storage } from "../../../Firebaseconfig";
import { doc, setDoc } from "firebase/firestore";

const MVPForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
    referenceWebsite: "",
    design: true,
    basicDevelopment: false,
    simpleTesting: false,
    mvpDocLink: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleWhatsApp = () => {
    const encodedMessage = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/917672024001?text=${encodedMessage}`, "_blank");
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

  const handleBack = (e) => {
    e.preventDefault();
    navigate("/get-quote");
  };

  const validateForm = () => {
    const newErrors = {};

    // Existing validation logic remains the same
    if (!formData.projectName?.trim()) {
      newErrors.projectName = "Project name is required";
    } else if (formData.projectName.trim().length < 3) {
      newErrors.projectName = "Project name must be at least 3 characters";
    }

    if (!formData.description?.trim()) {
      newErrors.description = "Idea description is required";
    } else if (formData.description.trim().length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    }

    if (formData.referenceWebsite?.trim()) {
      const urlPattern =
        /^(https?:\/\/)?(www\.)?[\w-]+(\.[a-z]{2,6})+([/?#].*)?$/i;
      if (!urlPattern.test(formData.referenceWebsite)) {
        newErrors.referenceWebsite = "Please enter a valid website URL";
      }
    }

    if (!formData.mvpDocLink?.trim()) {
      newErrors.mvpDocLink = "Your MVP Doc link is required";
    } else {
      const urlPattern = /^(https?:\/\/)[\w.-]+\.[a-z]{2,6}([/?#].*)?$/i;
      if (!urlPattern.test(formData.mvpDocLink)) {
        newErrors.mvpDocLink = "Please enter a valid URL";
      }
    }

    if (
      !formData.design &&
      !formData.basicDevelopment &&
      !formData.simpleTesting
    ) {
      newErrors.services = "Please select at least one service";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

        const docRef = doc(db, "mvp_quotation", mainFormData.name.trim());
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

  // Remove timing error when a time is selected

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
          MVP
        </h1>
        <p className="text-center text-xs sm:text-sm text-[#696F79] px-[2%] xs:px-[6%] sm:px-[10%] md:px-[28%] mt-2 md:mt-3">
          Validate your idea with a scalable MVP. Fill out the form to kickstart
          your product with a lean, market-ready solution!
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
                className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                  errors.projectName ? "border-red-500" : "border-[#8692A6]/40"
                }`}
                required
              />
              {errors.projectName && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.projectName}
                </p>
              )}
            </div>

            {/* Idea Description */}
            <div>
              <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
                Idea Description*
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                  errors.description ? "border-red-500" : "border-[#8692A6]/40"
                }`}
                required
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Reference Websites */}
            <div>
              <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
                Reference Websites
              </label>
              <input
                type="text"
                name="referenceWebsite"
                value={formData.referenceWebsite}
                onChange={handleInputChange}
                placeholder="https://example.com"
                className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                  errors.referenceWebsite
                    ? "border-red-500"
                    : "border-[#8692A6]/40"
                }`}
              />
              {errors.referenceWebsite && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.referenceWebsite}
                </p>
              )}
            </div>

            {/* Services Section */}
            <div className="space-y-4">
              <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
                Services*
              </label>

              {/* Design Checkbox */}
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
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </label>

              {/* Basic Development Checkbox */}
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
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </label>

              {/* Simple Testing Checkbox */}
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
              {errors.services && (
                <p className="text-red-500 text-sm mt-1">{errors.services}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="profileLink"
                className="block text-sm md:text-base font-medium mb-1 text-[#696F79]"
              >
                Your MVP Doc Link *
              </label>
              <input
                type="url"
                id="mvpDocLink"
                name="mvpDocLink"
                placeholder="https://example.com"
                className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                  errors.name ? "border-red-500" : "border-[#8692A6]/40"
                }`}
                value={formData.mvpDocLink}
                onChange={handleInputChange}
              />
              {errors.mvpDocLink && (
                <p className="text-red-500 text-sm mt-1">{errors.mvpDocLink}</p>
              )}
            </div>

            {/* File Upload */}
            {/* <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Upload Files (PDF only, max 2MB)*
            </label>
            <div
              className={`border-[.9px] border-dashed rounded-[11px] p-5 text-center bg-[#1e1f23] ${
                errors.file ? "border-red-500" : "border-[#8692A6]/40"
              }`}
            >
              <button
                type="button"
                className="text-gray-400 flex items-center justify-center w-full"
                onClick={() => document.getElementById("fileInput").click()}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Upload PDF
              </button>
              <input
                id="fileInput"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {formData.file && (
                <p className="text-sm text-white mt-2">{formData.file.name}</p>
              )}
            </div>
            {errors.file && (
              <p className="text-red-500 text-sm mt-1">{errors.file}</p>
            )}
          </div> */}

            {/* Submit Button */}
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

export default MVPForm;
