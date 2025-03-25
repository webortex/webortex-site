import React, { useState } from "react";
import { Container } from "@mui/material";

const MVPForm = () => {
  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
    referenceWebsite: "",
    design: true,
    basicDevelopment: false,
    simpleTesting: false,
    file: null
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      file: e.target.files[0]
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
      <h1 className="text-center text-5xl font-bold mb-4 text-white">
        MVP
      </h1>
      <p className="text-center text-sm text-[#696F79] mb-6 px-[10%]">
        These essentials will form a practical specification. You can add more to the design later, and we'll be right there to help.
      </p>

      <form className="w-full space-y-4" onSubmit={handleSubmit}>
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
            className="w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none border-[.9px] border-[#8692A6]/40"
            required
          />
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
            className="w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none border-[.9px] border-[#8692A6]/40"
            required
          />
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
            className="w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none border-[.9px] border-[#8692A6]/40"
          />
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
              <div className={`border-[.9px] border-[#8692A6]/40 rounded w-5 h-5 flex items-center justify-center ${formData.design ? 'bg-blue-500 border-blue-500' : ''}`}>
                {formData.design && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </label>

          {/* Basic Development Checkbox */}
          <label className="flex items-center justify-between cursor-pointer bg-[#1e1f23] border-[.9px] border-[#8692A6]/40 rounded-[11px] px-5 py-4 w-full hover:bg-[#2a2b30] transition-colors">
            <span className="text-sm md:text-base text-white">Basic Development</span>
            <div className="relative flex items-center">
              <input
                type="checkbox"
                name="basicDevelopment"
                checked={formData.basicDevelopment}
                onChange={handleInputChange}
                className="opacity-0 absolute h-5 w-5"
              />
              <div className={`border-[.9px] border-[#8692A6]/40 rounded w-5 h-5 flex items-center justify-center ${formData.basicDevelopment ? 'bg-blue-500 border-blue-500' : ''}`}>
                {formData.basicDevelopment && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </label>

          {/* Simple Testing Checkbox */}
          <label className="flex items-center justify-between cursor-pointer bg-[#1e1f23] border-[.9px] border-[#8692A6]/40 rounded-[11px] px-5 py-4 w-full hover:bg-[#2a2b30] transition-colors">
            <span className="text-sm md:text-base text-white">Simple Testing</span>
            <div className="relative flex items-center">
              <input
                type="checkbox"
                name="simpleTesting"
                checked={formData.simpleTesting}
                onChange={handleInputChange}
                className="opacity-0 absolute h-5 w-5"
              />
              <div className={`border-[.9px] border-[#8692A6]/40 rounded w-5 h-5 flex items-center justify-center ${formData.simpleTesting ? 'bg-blue-500 border-blue-500' : ''}`}>
                {formData.simpleTesting && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </label>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
            Upload Files
          </label>
          <div className="border-[.9px] border-dashed border-[#8692A6]/40 rounded-[11px] p-5 text-center bg-[#1e1f23]">
            <button
              type="button"
              className="text-gray-400 flex items-center justify-center w-full"
              onClick={() => document.getElementById('fileInput').click()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Upload here
            </button>
            <input
              id="fileInput"
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            {formData.file && (
              <p className="text-sm text-white mt-2">{formData.file.name}</p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full px-5 py-3 bg-white text-black rounded-[11px] font-medium hover:bg-gray-200 transition-all duration-300 text-sm md:text-base mt-6"
        >
          Submit
        </button>
      </form>
    </Container>
  );
};

export default MVPForm;