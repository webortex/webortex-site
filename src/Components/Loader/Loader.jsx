import "./Loader.css";

const Loader = () => {
  return (
    <div className="w-full h-screen z-999 fixed top-0 left-0 bg-backgroundColor flex flex-col justify-center items-center">
      <span className="loader"></span>
    </div>
  );
};

export default Loader;
