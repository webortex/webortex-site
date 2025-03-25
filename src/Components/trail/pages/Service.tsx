import AppDev from "../components/AppDev"
import Mvp from "../components/Mvp"
import Seo from "../components/Seo"
import Smedia from "../components/Smedia"
import UiUx from "../components/UiUx"
import Webdev from "../components/Webdev"

const Service = () => {
  return (
   


    <div className="m-auto py-10 px-10 text-center">

      <h1 className=" text-6xl font-bold bg-gradient-to-tr from-purple-400 via-col1 to-col2 bg-clip-text text-transparent ">Services</h1>
      <p className=" text-smallcolor mt-5 text-sm w-1/2 text-center m-auto">Risus commodo id odio turpis pharetra elementum. Pulihora porta porta feugiat scelerisque in elit. Morbi rhoncus, tellus,</p>

      <div className="m-auto w-full py-7 mt-8 flex gap-12 justify-center flex-wrap ">
       
        {/*Web Development */} <Webdev />
        {/*App Development*/}  <AppDev />
        {/*Ui/Ux card */}      <UiUx />
        {/* Mvp product */}    <Mvp />
        {/*SEO */}             <Seo/>
        {/* Social Media */}   <Smedia />
        
        </div>
    </div>
  )
}

export default Service
