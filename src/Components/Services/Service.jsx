import AppDev from "../Services/AppDev";
import Mvp from "../Services/Mvp";
import Seo from "../Services/Seo";
import Smedia from "../Services/Smedia";
import UiUx from "../Services/UiUx";
import Webdev from "../Services/Webdev";
import { Container } from "@mui/material";


const Service = () => {
  return (
   

<Container maxWidth="lg" className="h-screen">
<section id="services">
  <h1 className="text-7xl text-headColor font-bold tracking-tighter text-center ">
    Services
  </h1>
</section>
    <div className="m-auto pd-3 px-10 text-center">

      
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


</Container>
  )
}

export default Service
