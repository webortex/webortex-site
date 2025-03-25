import { useEffect, useState } from "react";
import bw from "./bw.jpeg";
import apple from "./apple.jpeg";

const AppDev = () => {
  let [image, setImage] = useState(bw);

  useEffect(() => {
    setInterval(() => {
      if (image === bw) {
        setImage(apple);
      } else if (image === apple) {
        setImage(bw);
      }
    }, 4000);
  }, [image]);

  return (
    <div>
      <div className="mobile flex justify-center items-center ">
        <img
          src={image}
          className="w-1/4 rounded-full relative right-4 border border-4"
          alt=""
        />
      </div>
    </div>
  );
};

export default AppDev;
