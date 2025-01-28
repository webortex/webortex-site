const Mvp = () => {
  return (
    <div>
      <div className="mt-10 flex flex-col gap-3 justify-center items-center cursor-pointer">
        <button className="py-2  font-bold w-[240px] hover:bg-slate-600   border border-borColor rounded-3xl bg-neutral-700 cursor-pointer ">
          Minumun
        </button>
        <button className="py-2 font-bold w-[180px] hover:bg-slate-600 border border-borColor rounded-3xl bg-colorY   bg-neutral-700 cursor-pointer">
          Vaiable
        </button>
        <button className="py-2 font-normal w-[120px] hover:bg-slate-600 border border-borColor rounded-3xl bg-colorY  bg-neutral-700 cursor-pointer">
          Product
        </button>
      </div>
    </div>
  );
};

export default Mvp;
