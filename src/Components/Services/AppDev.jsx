import phone from "../Services/phone.svg";
const AppDev = () => {
  return (
    <div>
       <div className=" p-8 flex items-center flex-col  text-white w-[310px] h-[390px] border-2 rounded-[22px] border-borColor  ">
          <p className="text-2xl font-semibold">App Development</p>
          <p className="text-xs text-smallcolor font-medium mt-2 mb-5">We increase revenue and ensure sustainable long-term growth </p>
          {/* App development */}

          <div className='mobile'>
            <img src={phone} alt="phone" className="w-[200px] h-[200px]"/>
            {/* Android application animation */}

          </div>


        </div>
    </div>
  )
}

export default AppDev
