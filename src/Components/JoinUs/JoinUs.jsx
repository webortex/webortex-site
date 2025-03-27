import { useState, useEffect } from "react";
import { Container } from "@mui/material";
import { db, storage } from "../../../FirebaseConfig"; // Import from firebaseConfig.js
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import React from "react";
import Frame from "../../assets/Star.png";

function JoinUs() {
  const [alertpop, setAlertpop] = useState(false);

  // Inside your component
  useEffect(() => {
    const timer = setTimeout(() => {
      setAlertpop(true); // Show alert after 10 seconds
    }, 4000);
    // Clean up the timer when the component unmounts
    return () => clearTimeout(timer);
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    whyWebortex: "",
    profileLink: "",
    role: "",
    resumeLink: "",
    resume: null,
  });

  const [errors, setErrors] = useState({});
  const [fileError, setFileError] = useState("");
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
    }
  };

  // const handleFileChange = (e) => {
  //   const file = e.target.files[0];
  //   setFileError("");
  //   setFileName("");

  //   if (!file) return;

  //   if (file.type !== "application/pdf") {
  //     setFileError("Only PDF files are allowed");
  //     return;
  //   }

  //   if (file.size > MAX_FILE_SIZE) {
  //     setFileError("File size must be less than 5MB");
  //     return;
  //   }

  //   setFormData({ ...formData, resume: file });
  //   setFileName(file.name);
  // };

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

    if (!formData.whyWebortex.trim()) {
      newErrors.whyWebortex = "This field is required";
    } else if (formData.whyWebortex.trim().length < 20) {
      newErrors.whyWebortex = "Please provide at least 20 characters";
    }

    if (!formData.profileLink.trim()) {
      newErrors.profileLink = "Profile link is required";
    } else if (
      !/^(http|https):\/\/[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/.test(
        formData.profileLink
      )
    ) {
      newErrors.profileLink = "Please enter a valid URL";
    }
    if (!formData.resumeLink.trim()) {
      newErrors.resumeLink = "Resume link is required";
    } else if (
      !/^(http|https):\/\/[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/.test(
        formData.resumeLink
      )
    ) {
      newErrors.resumeLink = "Please enter a valid URL";
    }

    if (!formData.role) {
      newErrors.role = "Please select a role";
    }

    if (!formData.source) {
      newErrors.source = "Please select an option";
    }

    if (!formData.resume) {
      setFileError("Please upload your resume");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !fileError;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus(null);

    if (!formData.resume) {
      setFileError("Please upload your resume");
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // // 1. Upload PDF to Firebase Storage
      // const storageRef = ref(
      //   storage,
      //   `resumes/${Date.now()}_${formData.resume.name}`
      // );
      // const uploadResult = await uploadBytes(storageRef, formData.resume);

      // 2. Get the download URL
      // const downloadURL = await getDownloadURL(uploadResult.ref);

      // 3. Save form data and resume URL to Firestore
      const docRef = doc(db, "applications", formData.name.trim());
      await setDoc(docRef, {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        whyWebortex: formData.whyWebortex,
        profileLink: formData.profileLink,
        role: formData.role,
        resumeLink: formData.resumeLink,
        // resumeURL: downloadURL,
        submittedAt: new Date(),
      });

      console.log("Document written with ID: ", docRef.id, FormData.name);
      setSubmitStatus("success");

      // Reset form
      setFormData({
        name: "",
        email: "",
        mobile: "",
        whyWebortex: "",
        profileLink: "",
        role: "",
        resumeLink: "",
        // resume: null,
      });
      setErrors({});
      setFileName("");
      setFileError("");
    } catch (error) {
      console.error("Error submitting form: ", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappMessage = "Hello! I'd like to learn more about your services.";

  const handleWhatsApp = () => {
    const encodedMessage = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/919502414128?text=${encodedMessage}`, "_blank");
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      email: "",
      mobile: "",
      whyWebortex: "",
      profileLink: "",
      role: "",
      resumeLink: "",
      // resume: null,
    });
    setErrors({});
    setFileName("");
    setFileError("");
    setSubmitStatus(null);
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
                Application Submitted!
              </h2>
              <p className="text-white/80 font-light px-[5%] mb-4">
                Thank you for your interest. We'll review your application and
                get back to you soon.
              </p>
              <button
                onClick={() => setSubmitStatus(null)}
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
      <Container maxWidth="sm">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-headColor mb-4">Join Us</h1>
          <p className="text-gray-400">
            Join our team of innovators! Fill out the form to explore exciting
            opportunities and collaborate on cutting-edge projects
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="name" className="block text-sm text-gray-400 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none border-[.9px] ${
                errors.name ? "border-red-500" : "border-[#8692A6]/40"
              }`}
              placeholder="Enter your Name"
              value={formData.name}
              onChange={handleInputChange}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-gray-400 mb-1">
              Email address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none border-[.5px] ${
                errors.email ? "border-red-500" : "border-[#8692A6]/40"
              }`}
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleInputChange}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="mobile"
              className="block text-sm text-gray-400 mb-1"
            >
              Mobile number *
            </label>
            <div className="flex">
              <input
                type="tel"
                id="mobile"
                name="mobile"
                placeholder="+91"
                className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none border-[.9px] ${
                  errors.mobile ? "border-red-500" : "border-[#8692A6]/40"
                }`}
                value={formData.mobile}
                onChange={handleInputChange}
              />
            </div>
            {errors.mobile && (
              <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="whyWebortex"
              className="block text-sm text-gray-400 mb-1"
            >
              Why Webortex *
            </label>
            <textarea
              id="whyWebortex"
              name="whyWebortex"
              rows="4"
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.description ? "border-red-500" : "border-[#8692A6]/40"
              }`}
              value={formData.whyWebortex}
              onChange={handleInputChange}
            />
            {errors.whyWebortex && (
              <p className="text-red-500 text-sm mt-1">{errors.whyWebortex}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="profileLink"
              className="block text-sm text-gray-400 mb-1"
            >
              Your Profile link *
            </label>
            <input
              type="url"
              id="profileLink"
              name="profileLink"
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.name ? "border-red-500" : "border-[#8692A6]/40"
              }`}
              value={formData.profileLink}
              onChange={handleInputChange}
            />
            {errors.profileLink && (
              <p className="text-red-500 text-sm mt-1">{errors.profileLink}</p>
            )}
          </div>

          <div>
            <label htmlFor="role" className="block text-sm text-gray-400 mb-1">
              Are you a *
            </label>
            <select
              id="role"
              name="role"
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.lookingFor ? "border-red-500" : "border-[#8692A6]/40"
              }`}
              value={formData.role}
              onChange={handleInputChange}
            >
              <option value="">Select</option>
              <option value="webdeveloper">Web Developer</option>
              <option value="uiuxdesigner">UI UX Designer</option>
              <option value="appdeveloper">App Developer</option>
              <option value="wordpressdesigner">Wordpress Designer</option>
            </select>
            {errors.role && (
              <p className="text-red-500 text-sm mt-1">{errors.role}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="source"
              className="block text-sm text-gray-400 mb-1"
            >
              How do you know about us *
            </label>
            <select
              id="source"
              name="source"
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.lookingFor ? "border-red-500" : "border-[#8692A6]/40"
              }`}
              value={formData.source}
              onChange={handleInputChange}
            >
              <option value="">Select</option>
              <option value="linkedin">LinkedIn</option>
              <option value="friend">Friend</option>
              <option value="search">Search Engine</option>
            </select>
            {errors.source && (
              <p className="text-red-500 text-sm mt-1">{errors.source}</p>
            )}
          </div>
          {/* 
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Upload your Resume (PDF only, max 5MB) *
            </label>
            <div className="flex items-center justify-center w-full">
              <label
                className={`w-full border-[.9px] border-dashed rounded-[11px] p-5 text-[#8692A6] flex justify-center items-center text-center bg-[#1e1f23] ${
                  errors.file ? "border-red-500" : "border-[#8692A6]/40"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="mt-2 text-sm">
                  {fileName ? fileName : "Upload PDF here"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {fileError && (
              <p className="text-red-500 text-sm mt-1">{fileError}</p>
            )}
          </div> */}

          <div>
            <label
              htmlFor="profileLink"
              className="block text-sm text-gray-400 mb-1"
            >
              Your Resume link *
            </label>
            <input
              type="url"
              id="resumeLink"
              name="resumeLink"
              className={`w-full px-5 py-4 rounded-[11px] font-poppins text-sm md:text-base bg-[#1e1f23] text-white placeholder-[#8692A6] focus:outline-none focus:ring-0 focus:border-[#8692A6]/80 border-[.9px] ${
                errors.name ? "border-red-500" : "border-[#8692A6]/40"
              }`}
              value={formData.resumeLink}
              onChange={handleInputChange}
            />
            {errors.resuneLink && (
              <p className="text-red-500 text-sm mt-1">{errors.resumeeLink}</p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-around pt-6 sm:gap-x-10 gap-y-4 sm:gap-y-0">
            <button
              type="button"
              onClick={handleCancel}
              className="px-20 py-3 sm:max-h-24 w-full sm:w-[50%] bg-gray-700 text-white rounded-lg hover:bg-gray-600 focus:outline-none transition-all duration-300 ease-in-out"
              disabled={isSubmitting}
            >
              Cancel
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
        {alertpop == true ? (
          <div className="sm:w-[380px] xl:w-[400px] lg:w-[400px] xs:w-[380px] 2xs:w-[300px] flex gap-8 2xs:gap-2 rounded-lg px-4 py-4 2xs:px-2 2xs:py-2 bg-[#262626] fixed right-10 2xs:right-2 top-60">
            <div className="h-[50px] w-[50px] xl:w-[50px] lg:w-[50px] sm:w-[50px] xs:w-[50px] 2xs:w-[30px]">
              <img src={Frame} alt="Alert" className="pt-4" />
            </div>
            <div>
              <p className="text-lg text-white font-bold mb-3">
                Required Technologies
              </p>
              <p className="text-gray-500 text-xs">
                Frontend : React, Angular, Tailwind, MUI
                <br />
                Backend : NodeJS, ExpressJS <br />
                Wordpress : Elementor, Custom Themes <br />
                UI/UX : Figma, AdobeXD, Sketch
              </p>
              <p className="text-white text-sm pt-2 cursor-pointer">
                Learn More
              </p>
            </div>
            <div
              className="cursor-pointer bg-[#BAB5B5] rounded-[50%] h-[20px] p-2 w-[20px] flex justify-center items-center text-[#4F4F4F] "
              onClick={() => setAlertpop(false)}
            >
              <p className="text-lg 2xs:text-xs items-center justify-center mt-[-2.5px]">
                x
              </p>
            </div>
          </div>
        ) : (
          ""
        )}
      </Container>
    </div>
  );
}

export default JoinUs;
