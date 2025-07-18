export function HomePage() {
    return `
    <div class="flex justify-center h-screen bg-cover bg-center" style="background-image: url('/backgrounds/logo_4k.png')">
        <div class="wrapper flex flex-col justify-end items-center pb-[25vh]">
             <button id="rules" class="m-5 cursor-pointer text-accent border border-accent hover:before:bg-accent relative h-[50px] w-40 overflow-hidden px-3 transition-all before:absolute before:bottom-0 before:left-0 before:top-0 before:z-0 before:h-full before:w-0 before:bg-accent before:transition-all before:duration-500 hover:text-light hover:before:left-0 hover:before:w-full">
                <span class="relative z-10">Go</span>
             </button>
        </div>
    </div>
  `;
}

export function setupHomePage() {

}