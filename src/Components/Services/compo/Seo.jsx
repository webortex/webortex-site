import Loader from "./loader";

const Seo = () => {
  return (
    <div>
      <div className=" p-8 flex items-center flex-col  text-white max-w-[300px] h-[390px] border-2 rounded-3xl border-[#939393]/60 ">
        <p className="text-2xl font-semibold">SEO</p>
        <p className="text-xs text-smallcolor font-medium mt-2 mb-5">
          We increase revenue and ensure sustainable long-term growth{" "}
        </p>
        {/* SEo */}

        <Loader />
      </div>
    </div>
  );
};

export default Seo;
