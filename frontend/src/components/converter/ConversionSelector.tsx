interface ConversionSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

const conversions = [
    "Image -> SVG",
    "Image -> PDF",
    "SVG -> PDF",
    "Image -> AVIF",
];

export default function ConversionSelector({
    value,
    onChange,
}: ConversionSelectorProps) {
    return (
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
            <label
                htmlFor="conevrsion"
                className = "mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
                Convert
            </label>

            <select
                id="conversion" value={value} 
                onChange={(event) => onChange(event.currentTarget.value)}
                className="
                    w-full 
                    rounded-xl 
                    border border-slate-200 bg-white 
                    px-4 py-3
                    text-sm font-medium text-slate-700
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:ring-2
                    focus: ring-blue-500/20
                    dark:border-slate-700
                    dark:bg-slate-900
                    dark:text-slate-200
                    dark:focus:border-blue-400
                "
            >
                {conversions.map((conversion) =>(
                    <option key={conversion} value={conversion}>
                        {conversion}
                    </option>
                ))}
            </select>
        </div>
    );
}