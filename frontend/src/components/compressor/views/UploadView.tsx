export default function UploadView() {
    return (
        <div className="flex flex-col">

            {/* Upload Area */}
            <div
                className="
                    flex
                    flex-col
                    items-center
                    border-b
                    border-slate-200
                    px-8 
                    py-5
                    pb-6
                    dark:border-slate-700
                "
            >
                {/* Upload Icon */}
                <div
                    className="
                        mb-4
                        flex
                        h-14
                        w-14
                        items-center
                        justify-center
                        rounded-full
                        bg-gradient-to-br
                        from-blue-500
                        via-indigo-500
                        to-pink-500
                        shadow-lg
                    "
                >
                    <svg
                        xmlns = "http://www.w3.org/2000/svg"
                        className = "h-8 w-8 text-white"
                        fill = "none"
                        viewBox = "0 0 24 24"
                        stroke = "currentColor"
                        strokeWidth = {2}
                    >
                        <path 
                            strokeLinecap = "round"
                            strokeLinejoin = "round"
                            d = "M12 16V4m0 0l-4 4m4-4l4 4M5 20h14"
                        />
                    </svg>
                </div>

                {/* Title */}
                <h2 className = "text-3xl font-bold text-slate-900 dark:text-white">
                    Upload Image
                </h2>

                {/* Subtitle */}
                <p className = "mt-3 text-center leading-6 text-slate-600 dark:text-slate-300">
                    Drag &amp; Drop your image here
                    <br />
                    or click to browse
                </p>

                {/* Formats */}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                {["JPG", "PNG", "WEBP", "AVIF"].map((type) =>(
                    <span
                        key = {type}
                        className ="
                        rounded-full
                        bg-blue-100 
                        px-3 
                        py-1 
                        text-sm 
                        font-medium 
                        text-blue-700"
                    >
                        {type}
                    </span>
                ))}
                </div>
            </div>
        
            {/* File Information */}
            <div
                className ="
                    border-b
                    border-slate-200
                    px-6
                    py-3
                    text-sm
                    text-center
                    text-slate-500
                    dark:border-slate-700
                    dark:text-slate-400
                "
            >
                No Image Selected
            </div>
            
            {/* Button */}
            <div className="p-3">
                <button
                    className="
                        w-full
                        rounded-2xl
                        bg-gradient-to-r
                        from-blue-600
                        via-indigo-500
                        to-pink-500
                        px-6
                        py-3
                        font-semibold
                        text-white
                        transition
                        duration-300
                        hover:scale-[1.02]
                    "
                >
                    Select Image
                </button>
            </div>
        </div>
    );
}