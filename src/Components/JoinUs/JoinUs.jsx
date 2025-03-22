import React, { useState } from "react";
import { Container, TextField, Button, Typography } from "@mui/material";

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

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, resume: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 relative">
      <button className="absolute top-4 right-4 px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors">
        Message us
      </button>
      <Container maxWidth="sm">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-200 mb-4">Join Us</h1>
          <p className="text-gray-400">
            Risus commodo id odio turpis pharetra elementum. Pulvinar porta
            porta feugiat scelerisque in elit. Morbi rhoncus, tellus,
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm text-gray-400 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:border-blue-500"
              placeholder="Enter your Name"
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-gray-400 mb-1">
              Email address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:border-blue-500"
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleInputChange}
            />
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
                required
                className="flex-1 px-4 py-2 rounded-r bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:border-blue-500"
                value={formData.mobile}
                onChange={handleInputChange}
              />
            </div>
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
              required
              rows="4"
              className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:border-blue-500"
              value={formData.whyWebortex}
              onChange={handleInputChange}
            />
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
              required
              className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:border-blue-500"
              value={formData.profileLink}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm text-gray-400 mb-1">
              Are you a *
            </label>
            <select
              id="role"
              name="role"
              required
              className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:border-blue-500 appearance-none"
              value={formData.role}
              onChange={handleInputChange}
            >
              <option value="">Select</option>
              <option value="webdeveloper">Web Developer</option>
              <option value="uiuxdesigner">UI UX Designer</option>
              <option value="appdeveloper">App Developer</option>
              <option value="wordpressdesigner">Wordpress Designer</option>
            </select>
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
              required
              className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:border-blue-500 appearance-none"
              value={formData.source}
              onChange={handleInputChange}
            >
              <option value="">Select</option>
              <option value="linkedin">LinkedIn</option>
              <option value="friend">Friend</option>
              <option value="search">Search Engine</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Upload your Resume
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="w-full flex flex-col items-center px-4 py-4 bg-gray-800 text-gray-400 rounded border border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors">
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
                <span className="mt-2 text-sm">Upload here</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Submit
          </button>
        </form>
      </Container>
    </div>
  );
}

export default JoinUs;
