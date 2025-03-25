import { useState } from "react";
import { Container } from "@mui/material";
import { db, storage } from "../../../Firebaseconfig"; // Import from firebaseConfig.js
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function JoinUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    whyWebortex: "",
    profileLink: "",
    role: "",
    source: "",
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
      const docRef = await addDoc(collection(db, "applications"), {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        whyWebortex: formData.whyWebortex,
        profileLink: formData.profileLink,
        role: formData.role,
        // source: formData.source,
        // resumeURL: downloadURL,
        submittedAt: new Date(),
      });

      console.log("Document written with ID: ", docRef.id);
      setSubmitStatus("success");

      // Reset form
      setFormData({
        name: "",
        email: "",
        mobile: "",
        whyWebortex: "",
        profileLink: "",
        role: "",
        // source: "",
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
    window.open(`https://wa.me/918688281821?text=${encodedMessage}`, "_blank");
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      email: "",
      mobile: "",
      whyWebortex: "",
      profileLink: "",
      role: "",
      // source: "",
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
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-green-500 mx-auto mb-4"
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
              <h2 className="text-2xl font-bold text-white mb-2">
                Application Submitted!
              </h2>
              <p className="text-gray-300 mb-4">
                Thank you for your interest. We'll review your application and
                get back to you soon.
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

      {submitStatus === "error" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
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
              <h2 className="text-2xl font-bold text-white mb-2">
                Submission Failed
              </h2>
              <p className="text-gray-300 mb-4">
                There was an error submitting your application. Please try again
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

      <button
        onClick={handleWhatsApp}
        className="absolute top-4 right-4 px-4 py-2 text-sm text-gray-300 rounded hover:bg-gray-700 transition-colors"
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
              className={`w-full px-4 py-2 rounded bg-gray-800 border ${
                errors.name ? "border-red-500" : "border-gray-700"
              } text-gray-200 focus:outline-none focus:border-blue-500`}
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
              className={`w-full px-4 py-2 rounded bg-gray-800 border ${
                errors.email ? "border-red-500" : "border-gray-700"
              } text-gray-200 focus:outline-none focus:border-blue-500`}
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
              <span className="inline-flex items-center px-4 py-2 rounded-l bg-gray-800 border border-r-0 border-gray-700 text-gray-400">
                +91
              </span>
              <input
                type="tel"
                id="mobile"
                name="mobile"
                className={`w-full flex-1 px-4 py-2 rounded-r bg-gray-800 border ${
                  errors.mobile ? "border-red-500" : "border-gray-700"
                } text-gray-200 focus:outline-none focus:border-blue-500`}
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
              className={`w-full px-4 py-2 rounded bg-gray-800 border ${
                errors.whyWebortex ? "border-red-500" : "border-gray-700"
              } text-gray-200 focus:outline-none focus:border-blue-500`}
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
              className={`w-full px-4 py-2 rounded bg-gray-800 border ${
                errors.profileLink ? "border-red-500" : "border-gray-700"
              } text-gray-200 focus:outline-none focus:border-blue-500`}
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
              className={`w-full px-4 py-2 rounded bg-gray-800 border ${
                errors.role ? "border-red-500" : "border-gray-700"
              } text-gray-200 focus:outline-none focus:border-blue-500 appearance-none`}
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
              className={`w-full px-4 py-2 rounded bg-gray-800 border ${
                errors.source ? "border-red-500" : "border-gray-700"
              } text-gray-200 focus:outline-none focus:border-blue-500 appearance-none`}
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
                className={`w-full flex flex-col items-center px-4 py-4 bg-gray-800 text-gray-400 rounded border ${
                  fileError ? "border-red-500" : "border-gray-700"
                } cursor-pointer hover:bg-gray-700 transition-colors`}
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
              className="px-10 py-3 sm:max-h-24 w-full sm:w-[50%] bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none transition-all duration-300 ease-in-out disabled:bg-blue-400 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </Container>
    </div>
  );
}

export default JoinUs;
