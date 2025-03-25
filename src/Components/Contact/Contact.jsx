import React, { useState } from "react";
import { Container } from "@mui/material";
import { FaInstagram, FaFacebook, FaLinkedin } from "react-icons/fa";
import emailjs from "@emailjs/browser";

const Contact = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    message: "",
    interests: {
      webDesign: false,
      mvp: false,
      mobileApp: false,
      other: false,
    },
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (errors[name]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
    }
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      interests: { ...formData.interests, [name]: checked },
    });

    if (errors.interests) {
      const isAnyCheckboxSelected = Object.values(formData.interests).some(
        (value) => value
      );
      if (isAnyCheckboxSelected) {
        setErrors((prevErrors) => ({ ...prevErrors, interests: "" }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full Name is required";
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = "Name must be at least 3 characters";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone must be 10 digits";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    } else if (!formData.email.endsWith("@gmail.com")) {
      newErrors.email = "Only Gmail addresses are allowed";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "At least 10 characters long";
    }

    const isAnyCheckboxSelected = Object.values(formData.interests).some(
      (value) => value
    );
    if (!isAnyCheckboxSelected) {
      newErrors.interests = "Please select at least one interest";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prepare interests as a string
    const selectedInterests = Object.keys(formData.interests)
      .filter((key) => formData.interests[key])
      .join(", ");

    // EmailJS Config
    const serviceID = "service_ndlmhll";
    const templateID = "template_any3iwx";
    const publicKey = "Ajz3sov1TAVsxPO18";

    const templateParams = {
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      message: formData.message,
      interests: selectedInterests,
    };

    emailjs
      .send(serviceID, templateID, templateParams, publicKey)
      .then((response) => {
        console.log("SUCCESS!", response.status, response.text);
        alert("Form submitted successfully!");

        setFormData({
          fullName: "",
          phone: "",
          email: "",
          message: "",
          interests: {
            webDesign: false,
            mvp: false,
            mobileApp: false,
            other: false,
          },
        });
        setErrors({});
      })
      .catch((error) => {
        console.error("FAILED...", error);
        alert("Failed to submit the form. Please try again.");
      });
  };

  const CheckboxField = ({ label, name, checked, onChange }) => (
    <label className="flex items-center cursor-pointer mb-2">
      <input
        type="checkbox"
        name={name}
        checked={checked || false}
        onChange={onChange}
        className="hidden"
      />
      <div className="w-4 h-4 bg-[#363636] rounded-sm flex items-center justify-center">
        {checked && (
          <svg
            className="w-3 h-3 text-green-300 pointer-events-none"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <span className="ml-2 text-textColor text-sm font-light">{label}</span>
    </label>
  );

  return (
    <Container maxWidth="lg" className="h-full my-6 md:my-10">
      <section id="contact" className="mb-4">
        <h1 className="text-3xl md:text-4xl lg:text-6xl text-center text-headColor font-bold tracking-tighter mb-6">
          Contact Us
        </h1>
      </section>

      <hr className="border-t-2 border-[#2626267c] mb-8" />

      <form className="w-full mb-16 md:mb-0" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
          <div className="md:col-span-2 xl:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#24242480] border border-[#262626] pt-4 pb-1 px-8 rounded-lg">
                <div className="w-full mb-6">
                  <label
                    className="block text-headColor font-semibold mb-2"
                    htmlFor="fullName"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`block w-full py-2 text-sm text-gray-300 bg-transparent border-0 border-b-2 ${
                      errors.fullName ? "border-red-500" : "border-[#363636]"
                    } focus:outline-none focus:ring-0 focus:border-textColor/80 transition-colors`}
                    placeholder="Type here"
                  />
                  {errors.fullName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.fullName}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-[#24242480] border border-[#262626] pt-4 pb-1 px-8 rounded-lg">
                <div className="w-full mb-6">
                  <label
                    className="block text-headColor font-semibold mb-2"
                    htmlFor="phone"
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`block w-full py-2 text-sm text-gray-300 bg-transparent border-0 border-b-2 ${
                      errors.phone ? "border-red-500" : "border-[#363636]"
                    } focus:outline-none focus:ring-0 focus:border-textColor/80 transition-colors`}
                    placeholder="Type here"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full bg-[#24242480] border border-[#262626] py-4 px-8 rounded-lg">
              <h2 className="text-lg text-headColor font-bold mb-4">
                Why are you contacting us?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <CheckboxField
                  label="Web Design"
                  name="webDesign"
                  checked={formData.interests.webDesign}
                  onChange={handleCheckboxChange}
                />
                <CheckboxField
                  label="MVP"
                  name="mvp"
                  checked={formData.interests.mvp}
                  onChange={handleCheckboxChange}
                />
                <CheckboxField
                  label="Mobile App Development"
                  name="mobileApp"
                  checked={formData.interests.mobileApp}
                  onChange={handleCheckboxChange}
                />
                <CheckboxField
                  label="Other"
                  name="other"
                  checked={formData.interests.other}
                  onChange={handleCheckboxChange}
                />
              </div>
              {errors.interests && (
                <p className="text-red-500 text-sm mt-1">{errors.interests}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#24242480] border border-[#262626] pt-4 pb-1 px-8 rounded-lg">
                <div className="w-full mb-6">
                  <label
                    className="block text-headColor font-semibold mb-2"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`block w-full py-2 text-sm text-gray-300 bg-transparent border-0 border-b-2 ${
                      errors.email ? "border-red-500" : "border-[#363636]"
                    } focus:outline-none focus:ring-0 focus:border-textColor/80 transition-colors`}
                    placeholder="Type here"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="bg-[#24242480] border border-[#262626] pt-4 pb-1 px-8 rounded-lg">
                <div className="w-full mb-6">
                  <label
                    className="block text-headColor font-semibold mb-2"
                    htmlFor="message"
                  >
                    Your Message
                  </label>
                  <input
                    type="text"
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    className={`block w-full py-2 text-sm text-gray-300 bg-transparent border-0 border-b-2 ${
                      errors.message ? "border-red-500" : "border-[#363636]"
                    } focus:outline-none focus:ring-0 focus:border-textColor/80 transition-colors`}
                    placeholder="Type here"
                  />
                  {errors.message && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <button
                type="submit"
                className="bg-buttonBgColor hover:bg-textColor hover:text-backgroundColor text-textColor py-2 px-6 rounded w-full max-w-xs transition-all duration-500 ease-in-out mt-8"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </form>
    </Container>
  );
};

export default Contact;
