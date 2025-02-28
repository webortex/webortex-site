import React, { useEffect } from "react";
import { Container } from "@mui/material";
import {
  Email,
  Phone,
  Facebook,
  Instagram,
  LinkedIn,
} from "@mui/icons-material";

const Contact = () => {
  useEffect(() => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      const checkmark = checkbox.nextElementSibling.querySelector("svg");
      checkbox.addEventListener("change", () => {
        checkmark.classList.toggle("hidden", !checkbox.checked);
      });
    });
  }, []);

  return (
    <Container maxWidth="lg">
      <section id="contact" className="my-1 md:my-1 lg:my-1 py-4 md:py-6 lg:py-10">
        <h1 className="text-3xl md:text-4xl lg:text-6xl text-center text-headColor font-bold tracking-tighter">
          Contact Us
        </h1>
        <div className="border rounded border-[#363636] flex p-3 float-right mt-[-3%] mr-[5%]">
          <p className="text-white flex flex-row items-center pr-2">Stay Connected</p>
          <div className="flex space-x-2 md:space-x-4">
            <Facebook className="text-buttonBgColor h-10 w-10 p-2 bg-gradient-to-b from-[#2E2E2E] to-black rounded hover:text-navlinkHoverColor cursor-pointer transition-colors duration-300" />
            <Instagram className="text-buttonBgColor h-10 w-10 p-2 bg-gradient-to-b from-[#2E2E2E] to-black rounded hover:text-navlinkHoverColor cursor-pointer transition-colors duration-300" />
            <LinkedIn className="text-buttonBgColor h-10 w-10 p-2 bg-gradient-to-b from-[#2E2E2E] to-black rounded hover:text-navlinkHoverColor cursor-pointer transition-colors duration-300" />
          </div>
        </div>
      </section>

      <hr className="border-t-2 border-[#363636]"/>

      <div className="grid grid-cols-3 grid-rows-4 gap-6 ">
 
          
          <div className="flex flex-row justify-between items-end gap-4 row-span-1 col-span-2  ">

        <div className="contact-grid-color h-2/3 w-full">
          <h1 className="text-lg text-start text-headColor font-bold ">Full Name</h1>
          <form className="max-w-xs mx-auto">
            <div className="relative">
              <input
                type="text"
                className="block py-2.5 pe-0 w-full text-sm text-gray-300 bg-transparent border-0 border-b-2 border-[#363636] appearance-none dark:text-[#363636] dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-white peer"
                placeholder="Type here "
              />
            </div>
          </form>
        </div>

        <div className="contact-grid-color h-2/3 w-full">
          <h1 className="text-lg text-start text-headColor font-bold ">Phone</h1>
          <form className="max-w-xs mx-auto">
            <div className="relative">
              <input
                type="text"
                className="block py-2.5 pe-0 w-full text-sm text-gray-300 bg-transparent border-0 border-b-2 border-[#363636] appearance-none dark:text-[#363636] dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-white peer"
                placeholder="Type here "
              />
            </div>
          </form>
        </div>
        </div>
      
        <div className="row-span-1 col-span-2">
        <div className="contact-grid-color h-full">
          <h1 className="text-lg text-start text-headColor font-bold mb-[30px] ">
            Why are you contacting us?
          </h1>
          <div className="grid grid-cols-2 place-content-around">
            <div className="flex items-center mb-4">
              <label htmlFor="checkbox-1" className="flex items-center cursor-pointer">
                <input id="checkbox-1" type="checkbox" className="hidden" />
                <div className="w-4 h-4 bg-[#363636] rounded-sm flex items-center justify-center dark:bg-gray-700">
                  <svg
                    className="hidden w-3 h-3 text-green-300 pointer-events-none"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="ml-2 text-white dark:text-white">Web Design</span>
              </label>
            </div>
            <div className="flex items-center mb-4">
              <label htmlFor="checkbox-2" className="flex items-center cursor-pointer">
                <input id="checkbox-2" type="checkbox" className="hidden" />
                <div className="w-4 h-4 bg-[#363636] rounded-sm flex items-center justify-center dark:bg-gray-700">
                  <svg
                    className="hidden w-3 h-3 text-green-300 pointer-events-none"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="ml-2 text-white dark:text-white">MVP</span>
              </label>
            </div>
            <div className="flex items-center mb-4">
              <label htmlFor="checkbox-3" className="flex items-center cursor-pointer">
                <input id="checkbox-3" type="checkbox" className="hidden" />
                <div className="w-4 h-4 bg-[#363636] rounded-sm flex items-center justify-center dark:bg-gray-700">
                  <svg
                    className="hidden w-3 h-3 text-green-300 pointer-events-none"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="ml-2 text-white dark:text-white">Mobile App Development</span>
              </label>
            </div>
            <div className="flex items-center mb-4">
              <label htmlFor="checkbox-4" className="flex items-center cursor-pointer">
                <input id="checkbox-4" type="checkbox" className="hidden" />
                <div className="w-4 h-4 bg-[#363636] rounded-sm flex items-center justify-center dark:bg-gray-700">
                  <svg
                    className="hidden w-3 h-3 text-green-300 pointer-events-none"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="ml-2 text-white dark:text-white">Other</span>
              </label>
            </div>
          </div>
        </div>
        </div>

       
        <div className="flex flex-row justify-between row-span-1 col-span-2 gap-4">
        <div className="contact-grid-color h-2/3 w-full">
        <h1 className="text-lg text-start text-headColor font-bold ">Mail</h1>
          <form className="max-w-xs mx-auto">
            <div className="relative">
              <input
                type="text"
                className="block py-2.5 pe-0 w-full text-sm text-gray-300 bg-transparent border-0 border-b-2 border-[#363636] appearance-none dark:text-[#363636] dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-white peer"
                placeholder="Type here "
              />
            </div>
          </form>
        </div>

        <div className="contact-grid-color h-2/3 w-full">
        <h1 className="text-lg text-start text-headColor font-bold ">Your Message</h1>
          <form className="max-w-xs mx-auto">
            <div className="relative">
              <input
                type="text"
                className="block py-2.5 pe-0 w-full text-sm text-gray-300 bg-transparent border-0 border-b-2 border-[#363636] appearance-none dark:text-[#363636] dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-white peer"
                placeholder="Type here "
              />
            </div>
          </form>
        </div>
        </div>
        

      <div className="col-span-2 flex flex-col justify-center items-center">
        <button type="submit" className="contained bg-buttonBgColor hover:bg-[#009dda] text-white p-[1%] w-[40%] rounded mt-[3%]">Submit</button>
        <p className="text-white dark:text-white pl-[10px] text-xs mt-[8%] mb-[10%] ">Operating Days <span className="bg-white bg-opacity-15 rounded p-1 ml-1">Monday to Friday</span></p>
        </div>
        
        <div className="flex justify-start gap-2 row-start-1 col-start-3">
        <div className="flex items-end">
  <div className="w-1 bg-buttonBgColor rounded h-3/4" />
</div>
        <div className="row-span-1 col-span-1  flex justify-end flex-col gap-3 w-full">
        <div className="contact-grid h-1/3 flex items-center px-4  w-4/6 ">
        <svg className="w-10 h-10 text-buttonBgColor hover:text-[#009dda]  dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.427 14.768 17.2 13.542a1.733 1.733 0 0 0-2.45 0l-.613.613a1.732 1.732 0 0 1-2.45 0l-1.838-1.84a1.735 1.735 0 0 1 0-2.452l.612-.613a1.735 1.735 0 0 0 0-2.452L9.237 5.572a1.6 1.6 0 0 0-2.45 0c-3.223 3.2-1.702 6.896 1.519 10.117 3.22 3.221 6.914 4.745 10.12 1.535a1.601 1.601 0 0 0 0-2.456Z"/>
        </svg>
        <span className="text-white font-bold dark:text-white text-lg pl-[10px]">+91 8688281821</span>
        </div>

        <div className="contact-grid-color h-1/3 w-5/6 flex items-center px-4">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke-width="2" 
          stroke="currentColor" 
          class="w-8 h-8 text-buttonBgColor hover:text-[#009dda] "
        >
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" 
        />
    </svg>
        <span className="text-white dark:text-white text-lg pl-[15px]">contact@webortex.com</span> 
        </div>
        </div>
        </div>
        </div>
</Container>
  );
};

export default Contact;