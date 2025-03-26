import React, { useState, useEffect } from "react";
import { Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useForm } from "./FormContext";

import alertImg from "../../assets/alert.png";

const Quotation = () => {
  const navigate = useNavigate();
  const { updateUserInfo } = useForm();
  const [alertpop, setAlertpop] = useState(true);
  const [lookingFor, setLookingFor] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    currentAddress: "",
    projectName: "",
    design: true,
    development: false,
    simpleTesting: false,
    responsiveDevelopment: false,
    file: null,
    projectType: "",
    projectTypeOther: "",
    projectTimeline: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Looking For options with detailed descriptions
  const lookingForOptions = [
    {
      value: "Website Development",
      label: "Website Development",
      description:
        "Create a professional, responsive website for your business",
    },
    {
      value: "MVP Development",
      label: "MVP Development",
      description:
        "Build a Minimum Viable Product to validate your business idea",
    },
    {
      value: "App Development",
      label: "App Development",
      description:
        "Develop a mobile application for iOS, Android, or cross-platform",
    },
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Handle checkbox inputs
    if (type === "checkbox") {
      setFormData((prevData) => ({
        ...prevData,
        [name]: checked,
      }));
    } else {
      // Handle other input types
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }

    // Clear specific error when user starts typing/changing
    if (errors[name]) {
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Special handling for lookingFor
    if (name === "lookingFor") {
      setLookingFor(value);
      // Clear lookingFor error when a selection is made
      if (errors.lookingFor) {
        setErrors((prevErrors) => {
          const newErrors = { ...prevErrors };
          delete newErrors.lookingFor;
          return newErrors;
        });
      }
    }

    // Reset submitted state when any change occurs
    if (isSubmitted) {
      setIsSubmitted(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      email: "",
      mobile: "",
      currentAddress: "",
      projectName: "",
      design: true,
      development: false,
      simpleTesting: false,
      responsiveDevelopment: false,
      file: null,
      projectType: "",
      projectTypeOther: "",
      projectTimeline: "",
    });
    setErrors({});
    setLookingFor("");
    setIsSubmitted(false);
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    // Mobile validation
    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = "Mobile number must be 10 digits";
    }

    // Current Address validation
    if (!formData.currentAddress.trim()) {
      newErrors.currentAddress = "Current Address is required";
    } else if (formData.currentAddress.trim().length < 10) {
      newErrors.currentAddress = "Address must be at least 10 characters";
    }

    // Project Name validation
    if (!formData.projectName.trim()) {
      newErrors.projectName = "Project Name is required";
    }

    // Looking For validation
    if (!lookingFor) {
      newErrors.lookingFor = "Please select a project type";
    }

    // Project Timeline validation
    if (!formData.projectTimeline) {
      newErrors.projectTimeline = "Please select a project timeline";
    }

    // Service validation
    if (
      !formData.design &&
      !formData.development &&
      !formData.simpleTesting &&
      !formData.responsiveDevelopment
    ) {
      newErrors.services = "Please select at least one service";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);

    const isValid = validateForm();

    if (!isValid) {
      // Scroll to the first error
      const firstErrorKey = Object.keys(errors)[0];
      const errorElement = document.getElementsByName(firstErrorKey)[0];
      if (errorElement) {
        errorElement.focus();
        errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    // Prevent submission if not all validations are met
    if (Object.keys(errors).length > 0) {
      return;
    }

    // Update form context with combined data
    updateUserInfo({
      ...formData,
      lookingFor,
    });

    // Navigate based on lookingFor selection
    switch (lookingFor) {
      case "Website Development":
        navigate("/get-quote/web-details");
        break;
      case "App Development":
        navigate("/get-quote/app-details");
        break;
      case "MVP Development":
        navigate("/get-quote/mvp-details");
        break;
      default:
        navigate("/get-quote/");
    }
  };

  // Custom checkbox component for better control and accessibility
  const CustomCheckbox = ({ name, label, checked, onChange }) => {
    return (
      <label className="flex items-center justify-between cursor-pointer bg-[#1e1f23] border-[.9px] border-[#8692A6]/40 rounded-[11px] px-5 py-4 w-full hover:bg-[#2a2b30] transition-colors">
        <span className="text-sm md:text-base text-white">{label}</span>
        <div className="relative flex items-center">
          <input
            type="checkbox"
            name={name}
            checked={checked}
            onChange={handleInputChange}
            className="opacity-0 absolute h-5 w-5"
            aria-label={label}
          />
          <div
            className={`border-[.9px] border-[#8692A6]/40 rounded w-5 h-5 flex items-center justify-center ${
              checked ? "bg-logoGreenColor" : ""
            }`}
          >
            {checked && (
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
    );
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
      <div className="flex items-center justify-center  text-white mb-4 mt-8">
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
              Current Address *
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
              Company Name
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
              Is it a startup?
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
              Project Name *
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
              Services *
            </label>

            <CustomCheckbox
              name="design"
              label="Design"
              checked={formData.design}
            />

            <CustomCheckbox
              name="development"
              label="Development"
              checked={formData.development}
            />

            <CustomCheckbox
              name="responsiveDevelopment"
              label="Responsive"
              checked={formData.responsiveDevelopment}
            />

            <CustomCheckbox
              name="simpleTesting"
              label="Simple Testing"
              checked={formData.simpleTesting}
            />

            {errors.services && (
              <p className="text-red-500 text-sm mt-1">{errors.services}</p>
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
              onChange={handleInputChange}
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                isSubmitted && errors.lookingFor
                  ? "border-red-500"
                  : "border-[#8692A6]/40"
              }`}
            >
              <option value="">Select Project Type</option>
              {lookingForOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isSubmitted && errors.lookingFor && (
              <p className="text-red-500 text-sm mt-1">{errors.lookingFor}</p>
            )}
            {lookingFor && (
              <p className="text-xs text-gray-400 mt-1">
                {
                  lookingForOptions.find((opt) => opt.value === lookingFor)
                    ?.description
                }
              </p>
            )}
          </div>

          {/* Other Project Type Specification (Conditional) */}
          {/* {formData.projectType === "Other" && (
            <div>
              <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
                Specify Project Type *
              </label>
              <input
                type="text"
                name="projectTypeOther"
                value={formData.projectTypeOther}
                onChange={handleInputChange}
                placeholder="Please specify your project type"
                className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                  errors.projectTypeOther
                    ? "border-red-500"
                    : "border-[#8692A6]/40"
                }`}
              />
              {errors.projectTypeOther && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.projectTypeOther}
                </p>
              )}
            </div>
          )} */}

          {/* Project Timeline Dropdown */}
          <div>
            <label className="block text-sm md:text-base font-medium mb-1 text-[#696F79]">
              Project Timeline *
            </label>
            <select
              name="projectTimeline"
              value={formData.projectTimeline}
              onChange={handleInputChange}
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.projectTimeline
                  ? "border-red-500"
                  : "border-[#8692A6]/40"
              }`}
            >
              <option value="">Select Project Timeline</option>
              <option value="Urgent">Urgent (Within 1 Month)</option>
              <option value="1-3 Months">1-3 Months</option>
              <option value="3-6 Months">3-6 Months</option>
              <option value="Flexible">Flexible</option>
            </select>
            {errors.projectTimeline && (
              <p className="text-red-500 text-sm mt-1">
                {errors.projectTimeline}
              </p>
            )}
          </div>

          {/* Buttons */}
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

        {/* Alert Popup */}
        {alertpop === true && (
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
        )}
      </div>
    </Container>
  );
};

export default Quotation;
