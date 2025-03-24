import React, { useState } from "react";
import { Container } from "@mui/material";

const WebForm = () => {
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
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
        WEB
      </h1>
      <p className="text-center text-sm text-[#696F79] mb-6 px-[10%]">
        Risks commode id calls forpjs,planetro elementum. Platinum perls perls feugiat<br />
        calderique in all1. Metals rhoncus, tellus.
      </p>
      <div className="flex items-center justify-center bg-black text-white mb-4 mt-4">
      <form className="w-full space-y-4 max-w-md " onSubmit={handleSubmit}>
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
            className="w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none border-[.9px] border-[#8692A6]/40"
          />
        </div>

        {/* Reference Designs */}
        <div>
          <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
            Reference Designs
          </label>
          <input
            type="text"
            name="referenceDesigns"
            value={formData.referenceDesigns}
            onChange={handleInputChange}
            className="w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none border-[.9px] border-[#8692A6]/40"
          />
        </div>

        {/* Marketing Checkbox */}
        <div>
          <label className="flex items-center justify-between cursor-pointer bg-[#1e1f23] border-[.9px] border-[#8692A6]/40 rounded-[11px] px-5 py-4 w-full hover:bg-[#2a2b30] transition-colors">
            <span className="text-sm md:text-base text-[#696F79] font-bold">Marketing</span>
            <div className="relative flex items-center">
              <input
                type="checkbox"
                name="marketing"
                checked={formData.marketing}
                onChange={handleInputChange}
                className="opacity-0 absolute h-5 w-5"
              />
              <div className={`border-[.9px] border-[#8692A6]/40 rounded w-5 h-5 flex items-center justify-center ${formData.marketing ? 'bg-blue-500 border-blue-500' : ''}`}>
                {formData.marketing && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </label>
        </div>

        {/* SEO Checkbox */}
        <div>
          <label className="flex items-center justify-between cursor-pointer bg-[#1e1f23] border-[.9px] border-[#8692A6]/40 rounded-[11px] px-5 py-4 w-full hover:bg-[#2a2b30] transition-colors">
            <span className="text-sm md:text-base text-[#696F79] font-bold">SEO</span>
            <div className="relative flex items-center">
              <input
                type="checkbox"
                name="seo"
                checked={formData.seo}
                onChange={handleInputChange}
                className="opacity-0 absolute h-5 w-5"
              />
              <div className={`border-[.9px] border-[#8692A6]/40 rounded w-5 h-5 flex items-center justify-center ${formData.seo ? 'bg-blue-500 border-blue-500' : ''}`}>
                {formData.seo && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
            className="w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none border-[.9px] border-[#8692A6]/40"
            required
          />
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
            Budget
          </label>
          <input
            type="text"
            name="budget"
            placeholder="$191"
            value={formData.budget}
            onChange={handleInputChange}
            className="w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none border-[.9px] border-[#8692A6]/40"
          />
        </div>

        {/* Timing Selection */}
        <div>
          <label className="block text-sm md:text-base font-medium mb-3 text-[#696F79]">
            Support Your Available Timing
          </label>
          <div className="grid grid-cols-2 grid-rows-2 gap-x-20 gap-y-4 ml-6 xs:size-[80%] sm:size-[70%] lg:size-[60%] xl:size-[60%]">
            {['10:00 AM', '12:00 PM', '6:00 PM', '4:00 PM'].map((time) => (
              <div
                key={time}
                onClick={() => setFormData({ ...formData, timing: time })}
                className={`p-2 rounded-[20px] bg-[#1e1f23] border-[.9px] flex justify-center items-center cursor-pointer transition-colors ${
                  formData.timing === time 
                    ? 'border-gray-800 bg-[#606477]' 
                    : 'border-gray-800 hover:border-[#606477]'
                }`}
              >
                <span className="text-sm text-white">{time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            className="w-[35%] px-5 py-3 bg-white text-black rounded-[11px] font-medium hover:bg-gray-200 transition-all duration-300 text-sm md:text-base mt-6"
          >
            Submit
          </button>
        </div>
      </form>
      </div>
    </Container>
  );
};

export default WebForm;