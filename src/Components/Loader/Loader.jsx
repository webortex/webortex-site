import logoImg from "../../assets/Webortexlogo2.png";

const Loader = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-backgroundColor flex justify-center items-center transition-opacity duration-200 ease-in-out">
      <img src={logoImg} alt="Webortex" className="scale-50" />
    </div>
  );
};

export default Loader;
