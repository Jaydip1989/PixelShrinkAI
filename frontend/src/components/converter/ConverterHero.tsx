import { useEffect, useRef, useState, } from "preact/hooks";

import ConversionSelector, {
    conversions,
    type ConversionDefinition,
} from "./ConversionSelector";

import PreviewView from "./views/PreviewView";
import ProcessingView from "./views/ProcessingView";
import DownloadView from "./views/DownloadView";
import { Download } from "lucide-preact";

const API_BASE_URL = (
    import.meta.env.PUBLIC_API_BASE_URL ?? ""
).replace(/\/+$/,"");

type ConverterStep =
    | "upload"
    | "preview"
    | "processing"
    | "download"

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
    const [conversion, setConversion] = useState("Image to SVG");

    const [avifOutputFormat, setAvifOutputFormat] = useState<"jpg" | "png" | "webp">("jpg");

    const [isAvifFormatOpen, setIsAvifFormatOpen] = useState(false);
    const [activeAvifFormatIndex, setActiveAvifFormatIndex] = useState(0);

    const avifFormatContainerRef = useRef<HTMLDivElement>(null);
    const avifFormatTriggerRef = useRef<HTMLButtonElement>(null);
    const avifFormatOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const avifFormatOptions = [
        { value: "jpg" as const, label: "JPG / JPEG" },
        { value: "png" as const, label: "PNG" },
        { value: "webp" as const, label: "WEBP" },
    ];

    const selectedAvifFormatIndex = avifFormatOptions.findIndex(
        (option) => option.value === avifOutputFormat,
    );

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent)=> {
            if (
                avifFormatContainerRef.current &&
                !avifFormatContainerRef.current.contains(event.target as Node)
            ) {
                setIsAvifFormatOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isAvifFormatOpen){
                setIsAvifFormatOpen(false);
                avifFormatTriggerRef.current?.focus();
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isAvifFormatOpen]);

    useEffect(() => {
        if (isAvifFormatOpen) {
            avifFormatOptionRefs.current[activeAvifFormatIndex]?.focus();
        }
    }, [isAvifFormatOpen, activeAvifFormatIndex]);

    const openAvifFormatMenu = (index = selectedAvifFormatIndex) => {
        setActiveAvifFormatIndex(index);
        setIsAvifFormatOpen(true);
    };

    const chooseAvifFormat = (format: "jpg" | "png" | "webp") => {
        handleAvifOutputFormatChange(format);
        setIsAvifFormatOpen(false);
        avifFormatTriggerRef.current?.focus();
    };

    const handleAvifTriggerKeyDown = (event: KeyboardEvent) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openAvifFormatMenu();
        }
    };

    const handleAvifOptionKeyDown = (
        event: KeyboardEvent,
        index: number,
    ) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveAvifFormatIndex((index + 1) % avifFormatOptions.length);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveAvifFormatIndex(
                (index - 1 + avifFormatOptions.length) % avifFormatOptions.length,
            );
        } else if (event.key === "Home") {
            event.preventDefault();
            setActiveAvifFormatIndex(0);
        } else if (event.key === "End") {
            event.preventDefault();
            setActiveAvifFormatIndex(avifFormatOptions.length - 1);
        } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            chooseAvifFormat(avifFormatOptions[index].value);
        } else if (event.key === "Escape") {
            event.preventDefault();
            setIsAvifFormatOpen(false);
            avifFormatTriggerRef.current?.focus();
        } else if (event.key === "Tab") {
            setIsAvifFormatOpen(false);
        }
    };

    const [step, setStep] = useState<ConverterStep>("upload");

    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);

    const [convertedFile, setConvertedFile] = useState<ConvertedFile | null>(null);

    const [error, setError] = useState("");

    const [isDragging, setIsDragging] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    const selectedConversion: ConversionDefinition =
        conversions.find(
            (item) => item.label === conversion,
        ) ?? conversions[0];

    const currentConversion: ConversionDefinition =
        selectedConversion.id === "avif-to-image"
            ? {
                    ...selectedConversion,
                    outputLabel: avifOutputFormat.toUpperCase(),
                    outputExtension: avifOutputFormat,
                    outputMimeType:
                        avifOutputFormat === "jpg"
                            ? "image/jpeg"
                            : avifOutputFormat === "png"
                                ? "image/png"
                                : "image/webp",
                    target: avifOutputFormat,
                }
            : selectedConversion;

    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent("pixelshrinkai:tool-state", {
                detail: {
                    active: true,
                    tool: "converter",
                    step,
                },
            }),
        );
    }, [step]);

    useEffect(() => {
        const previewUrl = selectedFile?.previewUrl;
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [selectedFile?.previewUrl]);
    useEffect(() => {
        const previewUrl = convertedFile?.previewUrl;
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [convertedFile?.previewUrl]);

    const handleBrowse = () => {
        inputRef.current?.click();
    };

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

    const handleFileChange = (
        event: Event
    ) => {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }
        selectFile(file);
        input.value = "";
    };

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

    const resetWorkflow = () => {
        setSelectedFile(null);
        setConvertedFile(null);
        setError("");
        setStep("upload");
        setIsDragging(false);
        if (inputRef.current) inputRef.current.value = "";
    };

    const handleConversionChange = (value: string) => {
        setConversion(value);
        setAvifOutputFormat("jpg");
        resetWorkflow();
    };


    const handleAvifOutputFormatChange = (
        nextFormat : "jpg" | "png" | "webp",
    ) => {
        setAvifOutputFormat(nextFormat);
        setConvertedFile(null);
        setError("");
        setStep(selectedFile ? "preview" : "upload");
    };

    const handleSelectAnother = () => {
        resetWorkflow();
    };

    const handleConvert = async () => {
        if (!selectedFile) {
            return;
        }
        setError("");
        setStep("processing");
        try {
            const formData = new FormData();
            formData.append("file", selectedFile.file);
            // AVIF -> Image conversions require a target form field.
            if (currentConversion.target) {
                formData.append("target", currentConversion.target);
            }
            const endpoint = `${API_BASE_URL}${currentConversion.endpoint}`;
            const response = await fetch(endpoint,{
                method: "POST",
                body: formData,
            });
            if (!response.ok) {
                let message = `Conversion failed (HTTP ${response.status}).`;
                try {
                    const body = await response.json();
                    if (typeof body.detail === "string"){
                        message = body.detail;
                    }
                } catch {
                    // Keep the HTTP status message if the response is not JSON.
                }
                throw new Error(message);
            }
            const contentType = response.headers
                .get("content-type")
                ?.split(";")[0]
                .trim()
                .toLowerCase();

            const expectedType = currentConversion.outputMimeType.toLowerCase();
            if (contentType !== expectedType) {
                throw new Error(
                    `The server returned an unexpected file format. Expected
                    ${expectedType}; received ${contentType ?? "unkown"}.`,
                );
            }
            const blob = await response.blob();
            if (blob.size > selectedFile.size) {
                throw new Error(
                    "The converted file is larger than the original. This does not meet PixelShrinkAI's \
                    file-size requirement.",
                );
            }
            // Validate the output signature or content for known formats.
            if (expectedType === "image/svg+xml") {
                const svgText = await blob.text();
                if (!/<svg\b/i.test(svgText)) {
                    throw new Error(
                        "The server response does not contain valid SVG markup.",
                    );
                }
            } else if (expectedType === "application/pdf") {
                const signature = new Uint8Array(
                    await blob.slice(0, 5).arrayBuffer(),
                );
                if (
                    signature.length !== 5 ||
                    String.fromCharCode(...signature) !== "%PDF-"
                ){
                    throw new Error("The server did not return a valid PDF.");
                }
            }
            const baseName = selectedFile.name.replace(/\.[^.]+$/, "");
            const outputFile = new File(
                [blob],
                `${baseName || "converted"}.${currentConversion.outputExtension}`,
                { type: expectedType },
            );
            const previewUrl = URL.createObjectURL(outputFile);
            setConvertedFile({
                name: outputFile.name,
                size: outputFile.size,
                type: outputFile.type,
                previewUrl,
                file: outputFile,
            });
            setStep("download");
        }  catch (error) {
            setError (
                error instanceof Error
                    ? error.message
                    : "Conversion failed. Please try again.",
            );
            setStep("preview");
        }
    };
    return(
        <div className="w-full">
            <div
                className="
                    mx-auto
                    w-full
                    max-w-130
                    overflow-visible
                    rounded-3xl
                    border
                    border-slate-200
                    bg-white
                    shadow-sm
                    dark:border-slate-700
                    dark:bg-slate-900
                "
            >
                <ConversionSelector
                    value={conversion}
                    onChange={handleConversionChange}
                />

                {conversion === "Convert from AVIF" && (
                    <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-700">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300">
                                    AVIF CONVERSION
                                </p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Choose your preferred output format.
                                </p>
                            </div>

                            <div
                                ref={avifFormatContainerRef}
                                className="relative z-30 w-full sm:max-w-44"
                            >
                                <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    Output format
                                </span>

                                <button
                                    ref={avifFormatTriggerRef}
                                    id="avif-output-format"
                                    type="button"
                                    aria-haspopup="listbox"
                                    aria-expanded={isAvifFormatOpen}
                                    aria-controls="avif-format-options"
                                    onKeyDown={handleAvifTriggerKeyDown}
                                    onClick={() => {
                                        if (isAvifFormatOpen) {
                                            setIsAvifFormatOpen(false);
                                        } else {
                                            openAvifFormatMenu();
                                        }
                                    }}
                                    className="flex w-full items-center justify-between gap-3 rounded-xl border
                                        border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-800
                                        shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2
                                        focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100
                                        dark:hover:border-slate-600"
                                >
                                    <span>
                                        {avifFormatOptions[selectedAvifFormatIndex]?.label}
                                    </span>

                                    <svg
                                        aria-hidden="true"
                                        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isAvifFormatOpen ? "rotate-180" : ""}`}
                                        viewBox="0 0 20 20"
                                        fill="none"
                                    >
                                        <path
                                            d="m5 7.5 5 5 5-5"
                                            stroke="currentColor"
                                            strokeWidth="1.7"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>

                                {isAvifFormatOpen && (
                                    <div
                                        id="avif-format-options"
                                        role="listbox"
                                        aria-label="Available output formats"
                                        className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden
                                        rounded-xl border border-slate-200 bg-white shadow-xl
                                        dark:border-slate-700 dark:bg-slate-900"
                                    >
                                        {avifFormatOptions.map((option, index) => (
                                            <button
                                                key={option.value}
                                                ref={(element) => {
                                                    avifFormatOptionRefs.current[index] = element;
                                                }}
                                                type="button"
                                                role="option"
                                                aria-selected={option.value === avifOutputFormat}
                                                onClick={() => chooseAvifFormat(option.value)}
                                                onKeyDown={(event) =>
                                                    handleAvifOptionKeyDown(event, index)
                                                }
                                                className={`flex w-full items-center justify-between px-3 py-2.5 text-left
                                                    text-sm font-semibold text-slate-800 transition hover:bg-slate-50
                                                    focus:bg-blue-50 focus:outline-none dark:text-slate-100
                                                    dark:hover:bg-slate-800 dark:focus:bg-blue-950/30 ${
                                                    index > 0
                                                        ? "border-t border-slate-100 dark:border-slate-800"
                                                        : ""
                                                }`}
                                            >
                                                <span>{option.label}</span>

                                                {option.value === avifOutputFormat && (
                                                    <svg
                                                        aria-hidden="true"
                                                        className="h-4 w-4 text-blue-600 dark:text-blue-400"
                                                        viewBox="0 0 20 20"
                                                        fill="none"
                                                    >
                                                        <path
                                                            d="m4 10 4 4 8-8"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {error && step !== "upload" && (
                    <div
                        role="alert"
                        className="
                            mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm
                            text-red-700 dark:border-red-900/50 dark:bg-red-950/20
                            dark:text-red-300
                        "
                    >
                        {error}
                    </div>
                )}
                {/* Converter specific workspace spacing */}
                <div>
                    {/* =============================== */}
                    {/* Upload */}
                    {/* =============================== */}
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
                                    ${isDragging
                                        ?"border-blue-500 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/20"
                                        :"border-slate-200 bg-slate-50/60 hover:border-slate-300 dark:border-slate-700 \
                                            dark:bg-slate-800/40"
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
                                    Select a file or drag and drop it here
                                    to convert it to{" "}
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
                                                {extension.replace(".", "",).toUpperCase()}
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
                    {/* =============================== */}
                    {/* Preview */}
                    {/* =============================== */}
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
                    {/* =============================== */}
                    {/* Processing */}
                    {/* =============================== */}
                    {step === "processing" && (
                        <ProcessingView
                            outputLabel={
                                currentConversion.outputLabel
                            }
                        />
                    )}
                    {/* =============================== */}
                    {/* Download / Result */}
                    {/* =============================== */}
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
