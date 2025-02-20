import React,{useState} from "react";
import {Container} from '@mui/material';
import alert from '../../assets/alert.png'

const Quotation = () =>{
      const [alertpop,setAlertpop] = useState(true);  
    return(
      <Container maxWidth="lg">
        <h1 className="text-center sm:text-7xl text-4xl text-headColor font-bold tracking-tight mt-2">Quotation</h1>
        <p className="text-center text-sm md:text-base xl:text-lg text-gray-700 mt-4">
        Risus commodo id odio turpis pharetra elementum. Pulvinar porta porta feugiat scelerisque in elit. Morbi rhoncus, tellus, {" "}
        </p>
        {/* comment */}
        {alertpop==true?
         <div className="sm:w-[400px] flex gap-3 rounded-lg px-4 py-4 bg-[#262626] fixed right-10 top-60">
          <div className="h-[50px] w-[100px]">
          <img src={alert} alt="Alert" className="pt-4"/>
          </div>
          <div>
          <p className="text-lg text-white font-bold">Quotation Alert</p>
          <p className="text-gray-500 text-xs">A free quotation is available only once. Our team will follow up with the generated quotation. For additional quotes, other options may apply</p>
          <p className="text-white text-sm pt-2 cursor-pointer">Learn More</p>
          </div>
          <div className="cursor-pointer bg-[#BAB5B5] rounded-[50%] h-[20px] p-2 w-[20px] flex justify-center items-center text-[#4F4F4F]" onClick={()=>setAlertpop(false)}>
          <p className="text-lg font-bold">x</p>
          </div>
        
         </div>:""}
        {/* comment */}
        <div className="flex items-center justify-center bg-black text-white mb-4 mt-4">
        <form className="rounded-2xl shadow-lg w-full max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-[#696F79]">Name *</label>
          <input
            type="text"
            required
            placeholder="Enter your Name"
            className="w-full px-4 py-4 rounded-lg bg-[#333] text-white placeholder-[#8692A6] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-[#696F79]">Email address *</label>
          <input
            type="email"
            required
            placeholder="Enter email address"
            className="w-full px-4 py-4 rounded-lg bg-[#333] text-white placeholder-[#8692A6] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-[#696F79]">Mobile number *</label>
          <input
            type="tel"
            required
            placeholder="+91"
            className="w-full px-4 py-4 rounded-lg bg-[#333] text-white placeholder-[#8692A6] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-[#696F79]">Current Address</label>
          <input
            type="text"
            placeholder=""
            className="w-full px-4 py-4 rounded-lg bg-[#333] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-[#696F79]">Company Name *</label>
          <input
            type="text"
            required
            placeholder=""
            className="w-full px-4 py-4 rounded-lg bg-[#333] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-[#696F79]">Is it a startup? *</label>
          <select
          required
            className="w-full px-4 py-4 rounded-lg bg-[#333] text-[#8692A6] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value=""> 
              Select
            </option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-[#696F79]">Looking for *</label>
          <select
            required
            className="w-full px-4 py-4 rounded-lg bg-[#333] text-[#8692A6] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">
              Select
            </option>
            <option value="service">Service</option>
            <option value="product">Product</option>
          </select>
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-around mt-4">
          <button
            type="button"
            className="px-10 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 focus:outline-none sm:mt-0 mt-4"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-10 py-3 bg-white text-[#3A3A3A] rounded-lg hover:bg-blue-400 focus:outline-none "
          >
            Continue →
          </button>
        </div>
      </form>
        </div>

      </Container>
    )
}

export default Quotation;