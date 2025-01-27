import { useEffect, useState } from 'react'
import bw from './bw.jpeg'
import apple from './apple.jpeg'

const AppDev = () => {

  let [image,setImage]=useState(bw)

  useEffect(()=>{
    setInterval(()=>{
      if(image===bw)
      {
        setImage(apple)

      }
      else if(image===apple)
      {
        setImage(bw)

      }

    },4000)
  },[image])

  return (
    <div>
       <div className=" p-8 flex items-center flex-col  text-white w-[310px] h-[390px] border rounded-3xl border-borColor">
          <p className="text-2xl font-semibold">App Development</p>
          <p className="text-xs text-smallcolor font-medium mt-2 mb-5">We increase revenue and ensure sustainable long-term growth </p>
          {/* App development */}

          <div className='mobile flex justify-center items-center '>
            {/* Android application animation */}
            <img src={image} className='w-1/4 rounded-full relative right-4 border border-4' alt="" />

          </div>
       

        </div>
    </div>
  )
}

export default AppDev
