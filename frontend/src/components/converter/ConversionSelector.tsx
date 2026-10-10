import {useEffect, useRef, useState } from "preact/hooks";

export interface ConversionDefinition {
    id: string;
    label: string;
    description: string;
    outputLabel: string;
    acceptedExtensions: string[];
    acceptedMimeTypes: string[];
    inputLabel: string;
}

export const conversions: ConversionDefinition[] = [
    {
        id: "image-to-svg",
        label: "Image -> SVG",
        description: "Convert PNG, JPG or WEBP to SVG.",
        outputLabel: "SVG",
        acceptedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
        acceptedMimeTypes: [
            "image/png", 
            "image/jpeg",
            "image/webp",
        ],
        inputLabel: "PNG, JPG, JPEG or WEBP",
    },

    {
        id: "image-to-pdf",
        label: "Image -> PDF",
        description: "Convert PNG, JPG or WEBP to PDF.",
        outputLabel: "PDF",
        acceptedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
        acceptedMimeTypes: [
            "image/png", 
            "image/jpeg",
            "image/webp",
        ],
        inputLabel: "PNG, JPG, JPEG or WEBP",
    },

    {
        id: "svg-to-pdf",
        label: "SVG -> PDF",
        description: "Convert SVG to PDF.",
        outputLabel: "PDF",
        acceptedExtensions: [".svg"],
        acceptedMimeTypes: [
            "image/svg+xml"
        ],
        inputLabel: "SVG",
    },

    {
        id: "image-to-avif",
        label: "Image -> AVIF ",
        description: "Convert PNG, JPG or WEBP to AVIF.",
        outputLabel: "AVIF",
        acceptedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
        acceptedMimeTypes: [
            "image/png", 
            "image/jpeg",
            "image/webp",
        ],
        inputLabel: "PNG, JPG, JPEG or WEBP",
    },
];

interface ConversionSelectorProps {
    value: string,
    onChange: (value: string) => void,
}

export default function ConversionSelector({
    value,
    onChange,
}:ConversionSelectorProps){
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const selectedIndex = Math.max(
        0,
        conversions.findIndex((item) => item.label === value),
    );

    const selectedConversion = conversions[selectedIndex];

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ){
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

    const chooseConversion = (conversion: ConversionDefinition) => {
        onChange(conversion.label);
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    const handleTriggerKeyDown = (
        event: KeyboardEvent,
    ) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            openMenu(selectedIndex);
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(selectedIndex);
        }
    };

    const handleOptionKeyDown = (
        event: KeyboardEvent,
        index: number,
    ) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index + 1) % conversions.length);
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(
                (index - 1 + conversions.length) % conversions.length,
            );
        }

        if (event.key === "Home") {
            event.preventDefault();
            setActiveIndex(conversions.length - 1);
        }

        if (event.key === "Tab") {
            setIsOpen(false);
        }
    };
    return (
        <div
            ref={containerRef}
            className="relative z-20 w-full"
        >
            <div className="px-4 pt-2.5 pb-2.5 sm:px-4">
                <label
                    htmlFor="conversion-trigger"
                    className="
                        mb-2 block
                        text-[11px] font-semibold
                        uppercase
                        tracking-[0.12em]
                        text-slate-500
                        dark:text-slate-400
                    "
                >
                    Convert 
                </label>

                <button
                    ref={triggerRef}
                    id="conversion-trigger"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-controls="conversion-options"
                    onClick={() => {
                        if (isOpen) {
                            setIsOpen(false);
                        } else {
                            openMenu();
                        }
                    }}
                    onKeyDown={handleTriggerKeyDown}
                    className="
                        flex w-full items-center justify-between gap-3
                        rounded-xl border border-slate-200
                        bg-white
                        px-4 py-3
                        text-left
                        shadow-sm
                        transition-all
                        duration-200
                        hover:border-blue-200
                        hover:shadow
                        focus:outline-none
                        focus:ring-2
                        focus:ring-blue-500/20
                        dark:border-slate-700
                        dark:bg-slate-900
                        dark:hover:border-blue-500
                    "
                >
                    <span className="min-w-0">
                        <span className="
                            block
                            truncate
                            text-sm
                            font-semibold
                            text-slate-800
                            dark:text-slate-100
                        ">
                            {selectedConversion.label}
                        </span>
                    </span>

                    <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className={`
                            h-5 w-5 shrink-0
                            text-slate-400
                            transition-transform
                            duration-200
                            ${isOpen ? "rotate-180" : ""}
                        `}
                    >
                        <path 
                            d="M5 7.5 5 5 5-5"
                            stroke="curentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>
            {isOpen && (
                <div
                    id="conversion-options"
                    role="listbox"
                    aria-label="Choose conversion foot"
                    aria-activedescendant={`conversion-option-${activeIndex}`}
                    className="
                        absolute left-3 right-3 top-full z-50
                        mt-1.5 overflow-hidden
                        rounded-2xl border border-slate-200
                        bg-white p-1.5
                        shadow-[0_12px_32px_rgba(15, 23, 42, 0.14)]
                        dark:border-slate-700
                        dark:bg-slate-900
                        dark:shadow-[0_12px_32px_rgba(0,0,0, 0.35)]
                    "
                >
                    {conversions.map((conversion, index) =>{
                        const isSelected = conversion.id === selectedConversion.id;

                        const isActive = index === activeIndex;

                        return (
                            <button
                                key={conversion.id}
                                ref={(element) => {
                                    optionRefs.current[index] = element;
                                }}
                                id={`conversion-option-${index}`}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                tabIndex={isActive ? 0: -1}
                                onClick={() =>
                                    chooseConversion(conversion)
                                }
                                onKeyDown={(event) => 
                                    handleOptionKeyDown(event, index)
                                }
                                onMouseEnter={() => setActiveIndex(index)}
                                className={`
                                    flex w-full items-start gap-3
                                    rounded-xl px-3 py-3
                                    text-left transition-colors durations-150
                                    focus:outline-none
                                    ${
                                        isSelected
                                        ? "bg-blue-50 dark:bg-blue-950/40"
                                        : isActive
                                            ? "bg-slate-50 dark:bg-slate-800"
                                            : "bg-transparent"
                                    }
                                    ${
                                        isSelected
                                            ? "text-blue-700 dark:text-blue-300"
                                            : "text-slate-700 dark:text-slate-200"
                                    }
                                `}
                            >
                                <span className="
                                    flex h-5 w-5 shrink-0
                                    items-center justify-center
                                ">
                                    {isSelected ? (
                                        <svg
                                            aria-hidden="true"
                                            viewBox="0 0 20 20"
                                            fill="none"
                                            className="h-4 w-4"
                                        >
                                            <path
                                                d="m4.5 10.2 3.4 3.4 7.6-7.6"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round" 
                                            />
                                        </svg>
                                    ):(
                                        <span className="
                                            h-1.5 w-1.5 rounded-full
                                            bg-slate-300
                                            dark:bg-slate-600
                                        "
                                        />
                                    )}
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="
                                        block text-sm font-medium
                                    ">
                                        {conversion.label}
                                    </span>
                                    <span className="
                                        mt-1 block text-xs leading-5
                                        text-slate-500
                                        dark:text-slate-400
                                    ">
                                        {conversion.description}
                                    </span>
                                </span>
                                
                                <span className="
                                    mt-0.5 shrink-0 rounded-md
                                    border border-slate-200
                                    bg-white px-1.5 py-0.5
                                    text-[10px] font-semibold
                                    uppercase tracking-wide
                                    text-slate-500
                                    dark:border-slate-700
                                    dark:bg-slate-800
                                    dark:text-slate-300
                                "
                                >
                                    {conversion.outputLabel}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    )
}