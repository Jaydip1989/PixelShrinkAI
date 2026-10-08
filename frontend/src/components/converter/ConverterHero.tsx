import {
    useEffect,
    useRef,
    useState,
} from "preact/hooks";

import ConversionSelector, {
    conversions,
    type ConversionDefinition,
} from "./ConversionSelector";

import PreviewView from "./views/PreviewView";
import ProcessingView from "./views/ProcessingView";
import DownloadView from "./views/DownloadView";

type ConverterStep =
    | "upload"
    | "preview"
    | "processing"
    | "download";

interface SelectedFile {
    file: File;
    name: string;
    size: number;
    type: string;
    previewUrl: string | null;
}

interface ConvertedFile {
    name: string;
    size: number | null;
    type: string;
    previewUrl: string | null;
    file: File | null;
}

export default function ConverterHero() {
    const [conversion, setConversion] =
        useState("Image -> SVG");

    const [step, setStep] =
        useState<ConverterStep>("upload");

    const [selectedFile, setSelectedFile] =
        useState<SelectedFile | null>(null);

    const [convertedFile, setConvertedFile] =
        useState<ConvertedFile | null>(null);

    const [error, setError] =
        useState("");

    const [isDragging, setIsDragging] =
        useState(false);

    const inputRef =
        useRef<HTMLInputElement>(null);

    const currentConversion: ConversionDefinition =
        conversions.find(
            (item) => item.label === conversion,
        ) ?? conversions[0];

    /*
     * Tell the Hero which tool and workflow step
     * are currently active.
     */
    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent(
                "pixelshrinkai:tool-state",
                {
                    detail: {
                        active: true,
                        tool: "converter",
                        step,
                    },
                },
            ),
        );
    }, [step]);

    /*
     * Clean up object URLs when the component
     * is unmounted or files change.
     */
    useEffect(() => {
        return () => {
            if (selectedFile?.previewUrl) {
                URL.revokeObjectURL(
                    selectedFile.previewUrl,
                );
            }

            if (convertedFile?.previewUrl) {
                URL.revokeObjectURL(
                    convertedFile.previewUrl,
                );
            }
        };
    }, [selectedFile, convertedFile]);

    /*
     * Open the native file picker.
     */
    const handleBrowse = () => {
        inputRef.current?.click();
    };

    /*
     * Validate a file against the currently
     * selected conversion.
     */
    const isValidFile = (file: File) => {
        const extension = `.${file.name
            .split(".")
            .pop()
            ?.toLowerCase()}`;

        return (
            currentConversion.acceptedExtensions.includes(
                extension,
            ) ||
            currentConversion.acceptedMimeTypes.includes(
                file.type,
            )
        );
    };

    /*
     * Select and validate a file.
     */
    const selectFile = (file: File) => {
        setError("");

        if (!isValidFile(file)) {
            setSelectedFile(null);
            setConvertedFile(null);
            setStep("upload");

            setError(
                `Please select a ${currentConversion.inputLabel} file.`,
            );

            return;
        }

        /*
         * Clean up previous preview URLs.
         */
        if (selectedFile?.previewUrl) {
            URL.revokeObjectURL(
                selectedFile.previewUrl,
            );
        }

        if (convertedFile?.previewUrl) {
            URL.revokeObjectURL(
                convertedFile.previewUrl,
            );
        }

        /*
         * Create a preview for browser-supported
         * image formats.
         */
        const previewUrl =
            file.type.startsWith("image/")
                ? URL.createObjectURL(file)
                : null;

        setSelectedFile({
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            previewUrl,
        });

        setConvertedFile(null);
        setStep("preview");
    };

    /*
     * Native file input handler.
     */
    const handleFileChange = (
        event: Event,
    ) => {
        const input =
            event.currentTarget as HTMLInputElement;

        const file = input.files?.[0];

        if (!file) {
            return;
        }

        selectFile(file);

        /*
         * Reset the input so selecting the same
         * file again still triggers change.
         */
        input.value = "";
    };

    /*
     * Drag and drop handlers.
     */
    const handleDragOver = (
        event: DragEvent,
    ) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (
        event: DragEvent,
    ) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (
        event: DragEvent,
    ) => {
        event.preventDefault();
        setIsDragging(false);

        const file =
            event.dataTransfer?.files?.[0];

        if (!file) {
            return;
        }

        selectFile(file);
    };

    /*
     * Changing the conversion resets the
     * current Converter workflow.
     */
    const handleConversionChange = (
        value: string,
    ) => {
        setConversion(value);
        setError("");

        if (selectedFile?.previewUrl) {
            URL.revokeObjectURL(
                selectedFile.previewUrl,
            );
        }

        if (convertedFile?.previewUrl) {
            URL.revokeObjectURL(
                convertedFile.previewUrl,
            );
        }

        setSelectedFile(null);
        setConvertedFile(null);
        setStep("upload");
        setIsDragging(false);

        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    /*
     * Return to the upload state.
     */
    const handleSelectAnother = () => {
        if (selectedFile?.previewUrl) {
            URL.revokeObjectURL(
                selectedFile.previewUrl,
            );
        }

        if (convertedFile?.previewUrl) {
            URL.revokeObjectURL(
                convertedFile.previewUrl,
            );
        }

        setSelectedFile(null);
        setConvertedFile(null);
        setError("");
        setStep("upload");
        setIsDragging(false);

        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    /*
     * Step 5:
     *
     * The Converter workflow reaches the processing
     * state here.
     *
     * The actual FastAPI conversion request will be
     * connected in the backend integration step.
     *
     * Do NOT create a fake converted file.
     */
    const handleConvert = () => {
        if (!selectedFile) {
            return;
        }

        setError("");
        setStep("processing");
    };

    return (
        <div className="w-full">
            <div
                className="
                    mx-auto
                    w-full
                    max-w-130
                    overflow-hidden
                    rounded-3xl
                    border
                    border-slate-200
                    bg-white
                    shadow-sm
                    dark:border-slate-700
                    dark:bg-slate-900
                "
            >
                {/* Conversion Selector */}
                <ConversionSelector
                    value={conversion}
                    onChange={handleConversionChange}
                />

                {/* Converter-specific workspace spacing */}
                <div>

                    {/* ========================= */}
                    {/* Upload */}
                    {/* ========================= */}

                    {step === "upload" && (
                        <div className="px-3 pt-2.5 pb-2.5 sm:px-3 sm:pt-2.5 sm:pb-2.5">
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`
                                    flex
                                    flex-col
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    border-2
                                    border-dashed
                                    px-6
                                    py-4
                                    text-center
                                    transition
                                    ${
                                        isDragging
                                            ? "border-blue-500 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/20"
                                            : "border-slate-200 bg-slate-50/60 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/40"
                                    }
                                `}
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
                                        rounded-2xl
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
                                <h2
                                    className="
                                        text-2xl
                                        font-bold
                                        text-slate-900
                                        dark:text-white
                                    "
                                >
                                    Upload File
                                </h2>

                                {/* Description */}
                                <p
                                    className="
                                        mt-3
                                        max-w-md
                                        text-center
                                        leading-6
                                        text-slate-600
                                        dark:text-slate-300
                                    "
                                >
                                    Select a file or drag and drop it
                                    here to convert it to{" "}
                                    {currentConversion.outputLabel}.
                                </p>

                                {/* Accepted Formats */}
                                <div className="mt-5 flex flex-wrap justify-center gap-2">
                                    {currentConversion.acceptedExtensions.map(
                                        (extension) => (
                                            <span
                                                key={extension}
                                                className="
                                                    rounded-full
                                                    bg-blue-100
                                                    px-3
                                                    py-1
                                                    text-sm
                                                    font-medium
                                                    text-blue-700
                                                    dark:bg-blue-950/40
                                                    dark:text-blue-300
                                                "
                                            >
                                                {extension
                                                    .replace(
                                                        ".",
                                                        "",
                                                    )
                                                    .toUpperCase()}
                                            </span>
                                        ),
                                    )}
                                </div>

                                {/* Select File Button */}
                                <button
                                    type="button"
                                    onClick={handleBrowse}
                                    className="
                                        mt-6
                                        w-full
                                        max-w-md
                                        rounded-2xl
                                        bg-linear-to-r
                                        from-blue-600
                                        via-indigo-500
                                        to-pink-500
                                        px-6
                                        py-3
                                        font-semibold
                                        text-white
                                        shadow-sm
                                        transition
                                        duration-300
                                        hover:scale-[1.01]
                                        hover:shadow-md
                                    "
                                >
                                    Select File
                                </button>

                                {/* Error */}
                                {error && (
                                    <p
                                        className="
                                            mt-3
                                            text-sm
                                            font-medium
                                            text-red-600
                                            dark:text-red-400
                                        "
                                    >
                                        {error}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ========================= */}
                    {/* Preview */}
                    {/* ========================= */}

                    {step === "preview" &&
                        selectedFile && (
                            <PreviewView
                                selectedFile={selectedFile}
                                conversion={
                                    currentConversion
                                }
                                onConvert={
                                    handleConvert
                                }
                                onSelectAnother={
                                    handleSelectAnother
                                }
                            />
                        )}

                    {/* ========================= */}
                    {/* Processing */}
                    {/* ========================= */}

                    {step === "processing" && (
                        <ProcessingView
                            outputLabel={
                                currentConversion.outputLabel
                            }
                        />
                    )}

                    {/* ========================= */}
                    {/* Download / Result */}
                    {/* ========================= */}

                    {step === "download" &&
                        selectedFile &&
                        convertedFile && (
                            <DownloadView
                                selectedFile={
                                    selectedFile
                                }
                                convertedFile={
                                    convertedFile
                                }
                                conversion={
                                    currentConversion
                                }
                                onSelectAnother={
                                    handleSelectAnother
                                }
                            />
                        )}
                </div>

                {/* Hidden File Input */}
                <input
                    ref={inputRef}
                    type="file"
                    accept={currentConversion.acceptedExtensions.join(
                        ",",
                    )}
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>
        </div>
    );
}