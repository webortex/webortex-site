
const Mvp = () => {
  return (
    <div>
       <div className=" p-8 flex items-center flex-col  text-white w-[310px] h-[390px] border-2 rounded-[22px] border-borColor  ">
          <p className="text-2xl font-semibold">MVP Product</p>
          <p className="text-xs text-smallcolor font-medium mt-2 mb-5">We increase revenue and ensure sustainable long-term growth </p>
          {/*MVP product */}

          <div className="mt-10 flex flex-col gap-3 justify-center items-center cursor-pointer">
            <button className="py-2  font-bold w-[240px] hover:bg-slate-600   border border-borColor rounded-3xl bg-neutral-700 cursor-pointer ">Minumun</button>
            <button className="py-2 font-bold w-[180px] hover:bg-slate-600 border border-borColor rounded-3xl bg-colorY   bg-neutral-700 cursor-pointer">Vaiable</button>
            <button className="py-2 font-normal w-[120px] hover:bg-slate-600 border border-borColor rounded-3xl bg-colorY  bg-neutral-700 cursor-pointer">Product</button>
          </div>


        </div>
    </div>
  )
}

export default Mvp
