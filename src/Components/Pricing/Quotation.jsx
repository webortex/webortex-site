import React, { useState } from "react";
import { Container } from "@mui/material";
import alertImg from "../../assets/alert.png";
import { useNavigate } from "react-router-dom";

// Firebase Imports
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const Quotation = () => {
  const navigate = useNavigate();

  // Firebase Configuration (REPLACE WITH YOUR ACTUAL CONFIG)
  const firebaseConfig = {
    apiKey: "AIzaSyDi9A6eg7hKPYfV0SK3tHE87jH0vZQvXhc",
    authDomain: "webortex-7e798.firebaseapp.com",
    databaseURL: "https://webortex-7e798-default-rtdb.firebaseio.com",
    projectId: "webortex-7e798",
    storageBucket: "webortex-7e798.firebasestorage.app",
    messagingSenderId: "1095027363933",
    appId: "1:1095027363933:web:77358a1d5b12782c183db4",
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const [alertpop, setAlertpop] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    currentAddress: "",
    companyName: "",
    isStartup: "",
    lookingFor: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      email: "",
      mobile: "",
      currentAddress: "",
      companyName: "",
      isStartup: "",
      lookingFor: "",
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = "Mobile number must be 10 digits";
    }

    if (
      formData.currentAddress.trim() &&
      formData.currentAddress.trim().length < 10
    ) {
      newErrors.currentAddress = "Address must be at least 10 characters";
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company Name is required";
    } else if (formData.companyName.trim().length < 3) {
      newErrors.companyName = "Company Name must be at least 3 characters";
    }

    if (!formData.isStartup) {
      newErrors.isStartup = "Please select an option";
    }

    if (!formData.lookingFor) {
      newErrors.lookingFor = "Please select an option";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitStatus(null);

      // Save form data to Firestore
      const docRef = await addDoc(collection(db, "quotations"), {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        currentAddress: formData.currentAddress || "",
        companyName: formData.companyName,
        isStartup: formData.isStartup,
        lookingFor: formData.lookingFor,
        submittedAt: new Date(),
        status: "pending",
      });

      console.log("Quotation submitted with ID: ", docRef.id);

      // Navigate to next page
      navigate("/get-quote/continue-fctCCfgfv");

      // Reset form
      setFormData({
        name: "",
        email: "",
        mobile: "",
        currentAddress: "",
        companyName: "",
        isStartup: "",
        lookingFor: "",
      });
      setErrors({});
      setSubmitStatus("success");
    } catch (error) {
      console.error("Error submitting quotation: ", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
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
        requirements, and we'll provide a custom quote for you.
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
              disabled={isSubmitting}
              className="px-10 py-3 sm:max-h-24 w-full sm:w-[50%] bg-textColor text-backgroundColor rounded-lg hover:text-textColor hover:bg-brandsBgColor focus:outline-none transition-all duration-300 ease-in-out disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Continue →"}
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

        {submitStatus === "error" && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Submission Failed
                </h2>
                <p className="text-gray-300 mb-4">
                  There was an error submitting your quotation. Please try again
                  later.
                </p>
                <button
                  onClick={() => setSubmitStatus(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};

export default Quotation;
