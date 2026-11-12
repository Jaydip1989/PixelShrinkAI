import { useEffect, useRef, useState } from "preact/hooks";

export interface ConversionDefinition {
    id: string;
    label: string;
    description: string;
    outputLabel: string;
    acceptedExtensions: string[];
    acceptedMimeTypes: string[];
    inputLabel: string;
    endpoint: string;
    outputExtension: string;
    outputMimeType: string;
    target?: string;
}

/**
 * All five conversion options are managed in one registry
 * and displayed in the main conversion selector.
 */

export const conversions: ConversionDefinition[] = [
    {
        id: "image-to-svg",
        label: "Image to SVG",
        description: "Transform raster images into scalable SVG files.",
        outputLabel: "SVG",
        acceptedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
        acceptedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
        inputLabel: "PNG, JPG, JPEG or WEBP",
        endpoint: "/api/convert/svg",
        outputExtension: "svg",
        outputMimeType: "image/svg+xml",
    },
    {
        id: "image-to-pdf",
        label: "Image to PDF",
        description: "Turn images into portable PDF documents.",
        outputLabel: "PDF",
        acceptedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
        acceptedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
        inputLabel: "PNG, JPG, JPEG or WEBP",
        endpoint: "/api/convert/pdf",
        outputExtension: "pdf",
        outputMimeType: "application/pdf",
    },
    {
        id: "svg-to-pdf",
        label: "SVG to PDF",
        description: "Convert SVG artwork into PDF documents.",
        outputLabel: "PDF",
        acceptedExtensions: [".svg"],
        acceptedMimeTypes: ["image/svg+xml"],
        inputLabel: "SVG",
        endpoint: "/api/convert/svg-to-pdf",
        outputExtension: "pdf",
        outputMimeType: "application/pdf",
    },
    {
        id: "image-to-avif",
        label: "Image to AVIF",
        description: "Convert images to the modern AVIF format.",
        outputLabel: "AVIF",
        acceptedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
        acceptedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
        inputLabel: "PNG, JPG, JPEG or WEBP",
        endpoint: "/api/convert/to-avif",
        outputExtension: "avif",
        outputMimeType: "image/avif",
    },
    {
        id: "avif-to-image",
        label: "Convert from AVIF",
        description: "Export AVIF images as JPG, PNG or WEBP.",
        outputLabel: "JPG",
        acceptedExtensions: [".avif"],
        acceptedMimeTypes: ["image/avif"],
        inputLabel: "AVIF",
        endpoint: "/api/convert/avif",
        outputExtension: "jpg",
        outputMimeType: "image/jpeg",
        target: "jpg",
    },
];

export const primaryConversions = conversions;

interface ConversionSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export default function ConversionSelector({
    value,
    onChange,
}: ConversionSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const selectedIndex = Math.max(
        0,
        primaryConversions.findIndex((item) => item.label === value),
    );
    const selectedConversion =
        primaryConversions[selectedIndex] ?? primaryConversions[0];

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            optionRefs.current[activeIndex]?.focus();
        }
    }, [isOpen, activeIndex]);

    const openMenu = (index = selectedIndex) => {
        setActiveIndex(index);
        setIsOpen(true);
    };

    const chooseConversion = (item: ConversionDefinition) => {
        onChange(item.label);
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    const handleTriggerKeyDown = (event: KeyboardEvent) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(selectedIndex);
        }
    };

    const handleOptionKeyDown = (event: KeyboardEvent, index: number) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index + 1) % primaryConversions.length);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(
                (index - 1 + primaryConversions.length) % primaryConversions.length,
            );
        } else if (event.key === "Home") {
            event.preventDefault();
            setActiveIndex(0);
        } else if (event.key === "End") {
            event.preventDefault();
            setActiveIndex(primaryConversions.length - 1);
        } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            chooseConversion(primaryConversions[index]);
        } else if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
            triggerRef.current?.focus();
        } else if (event.key === "Tab") {
            setIsOpen(false);
        }
    };

    return (
        <div ref={containerRef} className="relative z-20 w-full">
            <div className="px-4 pt-3 pb-2.5 sm:px-4">
                <span
                    className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400"
                >
                    Convert
                </span>

                <button
                    ref={triggerRef}
                    id="conversion-trigger"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-controls="conversion-options"
                    onKeyDown={handleTriggerKeyDown}
                    onClick={() => {
                        if (isOpen) {
                            setIsOpen(false);
                        } else {
                            openMenu(selectedIndex);
                        }
                    }}
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                >
                    <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                            {selectedConversion.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {selectedConversion.description}
                        </span>
                    </span>
                    <svg
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
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

                {isOpen && (
                    <div
                        id="conversion-options"
                        role="listbox"
                        aria-label="Available conversions"
                        className="absolute left-4 right-4 top-full z-50 mt-2 max-h-[min(60vh,420px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                    >
                        {primaryConversions.map((item, index) => (
                            <button
                                key={item.id}
                                ref={(element) => {
                                    optionRefs.current[index] = element;
                                }}
                                type="button"
                                role="option"
                                aria-selected={item.id === selectedConversion.id}
                                onClick={() => chooseConversion(item)}
                                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                                className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus:bg-blue-50 focus:outline-none dark:hover:bg-slate-800 dark:focus:bg-blue-950/30 ${index > 0 ? "border-t border-slate-100 dark:border-slate-800" : ""}`}
                            >
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                                        {item.label}
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                                        {item.description}
                                    </span>
                                </span>
                                <span className="mt-0.5 shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {item.outputLabel}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
