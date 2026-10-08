import type { ImageAsset } from "../../types/image";

interface UploadViewProps {
    image: ImageAsset | null;
    error: string;
    onSelectImage: () => void;

    /**
     * Shared tool mode.
     *
     * Existing Compressor usage does not need to change
     * because "compressor" is the default.
     */
    mode?: "compressor" | "converter";

    /**
     * Converter-specific accepted formats.
     * Example: "PNG, JPG, JPEG or WEBP"
     */
    inputLabel?: string;

    /**
     * Converter-specific upload description.
     * Example:
     * "Select a file or drag and drop here to convert it to SVG."
     */
    uploadDescription?: string;
}

export default function UploadView({
    image,
    error,
    onSelectImage,
    mode = "compressor",
    inputLabel,
    uploadDescription,
}: UploadViewProps) {
    const isConverter = mode === "converter";

    const formatLabels = isConverter
        ? (inputLabel
              ?.split(",")
              .map((type) => type.trim())
              .filter(Boolean) ?? [])
        : ["JPG", "PNG", "WEBP"];

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
                        mb-3
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-full
                        bg-linear-to-br
                        from-blue-500
                        via-indigo-500
                        to-pink-500
                        shadow-lg
                    "
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 16V4m0 0l-4 4m4-4l4 4M5 20h14"
                        />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {isConverter ? "Upload File" : "Upload Image"}
                </h2>

                {/* Subtitle */}
                <p className="mt-3 text-center leading-6 text-slate-600 dark:text-slate-300">
                    {isConverter
                        ? uploadDescription ??
                          "Select a file or drag and drop here"
                        : "Drag & Drop your image here"}

                    <br />

                    {isConverter
                        ? "or click to browse"
                        : "or click to browse"}
                </p>

                {/* Formats */}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {formatLabels.map((type) => (
                        <span
                            key={type}
                            className="
                                rounded-full
                                bg-blue-100
                                px-3
                                py-1
                                text-sm
                                font-medium
                                text-blue-700
                            "
                        >
                            {type}
                        </span>
                    ))}
                </div>
            </div>

            {/* Button */}
            <div className="p-3">
                <button
                    type="button"
                    onClick={onSelectImage}
                    className="
                        w-full
                        rounded-2xl
                        bg-linear-to-r
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
                    {isConverter ? "Select File" : "Select Image"}
                </button>
            </div>
        </div>
    );
}