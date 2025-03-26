import { Container } from "@mui/material";
import React, { useState } from "react";
import { Consumer } from "../ContextAPI/ContextAPI";
import { FaPhone } from "react-icons/fa";

import { useNavigate } from "react-router-dom";

const FaQ = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(null);

  const toggleFAQ = (index) => {
    setExpanded(expanded === index ? null : index);
  };

  const handleAskQueBtn = (e) => {
    e.preventDefault();
    navigate("/lets-talk");
  };

  return (
    <Consumer>
      {(value) => {
        const { faqs } = value;
        return (
          <Container maxWidth="lg">
            <section
              id="faq"
              className="pt-5"
            >
              <div className="flex flex-col justify-start lg:items-center my-20 lg:flex-row h-full text-white px-2 py-8 gap-x-5">
                <div className="lg:w-1/2 space-y-6">
                  <div className="inline-block px-4 py-1 rounded-full text-xs sm:text-sm font-medium border border-white">
                    FAQ
                  </div>

                  <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
                    This is the start of something new
                  </h1>
                  <p className="text-base sm:text-lg text-gray-400">
                    Managing a small business today is already tough. Avoid
                    further complications by ditching outdated, tedious
                    trade methods. Our goal is to streamline SMB trade,
                    making it easier and faster than ever.
                  </p>
                  <button
                    className="text-sm sm:text-base flex items-center space-x-2 px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-100"
                    onClick={handleAskQueBtn}
                  >
                    <span>Any questions? Reach out</span>

                    <div>
                      <FaPhone
                        size={18}
                        color="#000"
                      />
                    </div>
                  </button>
                </div>

                <div className="lg:w-1/2 mt-8 lg:mt-0 space-y-4">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="border-b border-gray-600 pb-4 cursor-pointer"
                    >
                      <div
                        className="flex justify-between items-center"
                        onClick={() => toggleFAQ(index)}
                      >
                        <h2
                          className={`text-base sm:text-lg font-medium ${
                            expanded === index
                              ? "text-white transition-all duration-300 ease-in-out"
                              : "text-gray-400"
                          }`}
                        >
                          {faq.question}
                        </h2>
                        <button
                          className={`w-8 h-8 flex items-center justify-center border rounded-md transition-all duration-300 ease-in-out ${
                            expanded === index
                              ? "bg-gray-800 text-white border-gray-500"
                              : "bg-black text-gray-400 border-gray-600"
                          }`}
                        >
                          {expanded === index ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line
                                x1="5"
                                y1="12"
                                x2="19"
                                y2="12"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line
                                x1="12"
                                y1="5"
                                x2="12"
                                y2="19"
                              />
                              <line
                                x1="5"
                                y1="12"
                                x2="19"
                                y2="12"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      {expanded === index && (
                        <p className="text-sm sm:text-base mt-4 text-gray-400">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </Container>
        );
      }}
    </Consumer>
  );
};

export default FaQ;
