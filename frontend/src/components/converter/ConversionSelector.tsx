export interface ConversionDefinition {
    id : string;
    label: string;
    description: string;
    outputLabel: string;
    acceptedExtensions: string[];
    acceptedMimeTypes: string[];
    inputLabel: string;
}

interface ConversionSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export const conversions: ConversionDefinition[] = [
    {
        id: "image-to-svg",
        label: "Image -> SVG",
        description: "Convert PNG, JPG or WEBP to SVG",
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
        description: "Convert PNG, JPG or WEBP to PDF",
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
        description: "Convert an SVG document to PDF.",
        outputLabel: "PDF",
        acceptedExtensions: [".svg"],
        acceptedMimeTypes: [
            "image/svg+xml"
        ],
        inputLabel: "SVG",
    },
    {
        id: "image-to-avif",
        label: "Image -> AVIF",
        description:"Convert PNG, JPG or WEBP to AVIF",
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
export default function ConversionSelector({
    value,
    onChange,
}: ConversionSelectorProps){
    return (
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700 sm:px-6">
            <label
                htmlFor="conversion"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 
                dark:text-slate-300"
            >
                Convert
            </label>
            <select
                id="conversion"
                value={value}
                onChange={(event) => onChange(event.currentTarget.value)}
                className="
                    w-full
                    appearence-none
                    rounded-xl
                    border border-slate-200
                    bg-white
                    px-4 py-3
                    text-sm 
                    font-medium
                    text-slate-800
                    dark:text-white
                    shadow-sm
                    outline-none
                    transition
                    hover:border-slate-300
                    focus:border-blue-500
                    focus:ring-2
                    focus:rising-blue-500/20
                    dark:border-slate-700
                    dark:bg-slate-900
                    dark:hover:border-slate-600
                    dark:focus:border-blue-400 
                "

            >
                {conversions.map((conversion) =>(
                    <option 
                        key={conversion.id} 
                        value={conversion.label}
                    >
                        {conversion.label}
                    </option>
                ))}
            </select>
        </div>
    );
}