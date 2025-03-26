import React from "react";

const SEOLoader = () => {
  return (
    <div className="w-full h-full my-auto">
      <div id="wifi-loader">
        <svg
          viewBox="0 0 86 86"
          className="circle-outer text-brandsBgColor"
        >
          <circle
            r="40"
            cy="43"
            cx="43"
            className="back text-brandsBgColor"
          ></circle>
          <circle
            r="40"
            cy="43"
            cx="43"
            className="front text-brandsBgColor"
          ></circle>
          <circle
            r="40"
            cy="43"
            cx="43"
            className="new text-brandsBgColor"
          ></circle>
        </svg>
        <svg
          viewBox="0 0 60 60"
          className="circle-middle text-brandsBgColor"
        >
          <circle
            r="27"
            cy="30"
            cx="30"
            className="back text-brandsBgColor"
          ></circle>
          <circle
            r="27"
            cy="30"
            cx="30"
            className="front text-brandsBgColor"
          ></circle>
        </svg>
        <svg
          viewBox="0 0 34 34"
          className="circle-inner text-brandsBgColor"
        >
          <circle
            r="14"
            cy="17"
            cx="17"
            className="back text-brandsBgColor"
          ></circle>
          <circle
            r="14"
            cy="17"
            cx="17"
            className="front text-brandsBgColor"
          ></circle>
        </svg>
        <div
          data-text="Searching"
          className="text"
        ></div>
      </div>
    </div>
  );
};

export default SEOLoader;
