import { useState } from "preact/hooks";
import type { OutputFormat } from "../../../types/image";

interface ToolSettingsProps {
  quality: number;
  outputFormat: OutputFormat;

  onQualityChange: (quality:number) => void;
  onOutputFormatChange: (format:OutputFormat) => void;
  onCompress: () => void;
}

export default function ToolSettings({
    quality,
    outputFormat,
    onQualityChange,
    onOutputFormatChange,
    onCompress
}: ToolSettingsProps) {
    const [isFormatOpen, setIsFormatOpen] = useState(false);

    const formatOptions : { value: OutputFormat; label: string}[] = [
        { value: "original", label: "Original Format" },
        { value: "jpeg", label: "JPG/JPEG" },
        { value: "png", label: "PNG" },
        { value: "webp", label: "WebP"},
    ];

    const selectedFormat = formatOptions.find(
        (option) => option.value === outputFormat
    );

    return (
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <div>
                <div className="flex items-center justify-between">
                    <label
                        htmlFor="compression-quality"
                        className="text-sm font-semibold text-slate-900 dark:text-white"
                        >
                        Compression Quality
                    </label>
                    <span
                        className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700
                                    dark:bg-blue-900/40 dark:text-blue-300"
                    >
                        {quality}%
                    </span>
                </div>
                <input
                    id="compression-quality"
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={quality}
                    onInput={(event) =>
                        onQualityChange(
                            Number((event.currentTarget as HTMLInputElement).value),
                        )
                    } 
                    className = "mt-5 w-full accent-blue-600"
                    aria-label="Compression quality"
                />
                <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Smaller file</span>
                    <span>Better quality</span>
                </div>
            </div>
            <div>
                <label
                    htmlFor="output-format"
                    className="text-sm font-semibold text-slate-900 dark:text-white"
                >
                    Output Format
                </label>
                <div className="relative mt-2">
                        <button
                            type="button"
                            id="output-format"
                            aria-haspopup="listbox"
                            aria-expanded={isFormatOpen}
                            aria-controls="output-format-options"
                            onClick={() => setIsFormatOpen((open) => !open)}
                            className="flex w-full items-center justify-between rounded-xl border border-amber-400 bg-slate-800 px-4 py-3 text-left text-sm font-medium text-white outline-none transition focus:ring-2 focus:ring-blue-500"
                        >
                            <span>{selectedFormat?.label ?? "Select Format"}</span>

                            <svg
                                className={`h-4 w-4 transition-transform ${
                                    isFormatOpen ? "rotate-180" : ""
                                }`}
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="m5 7.5 5 5 5-5" />
                            </svg>
                        </button>

                        {isFormatOpen && (
                            <div
                                id="output-format-options"
                                role="listbox"
                                aria-label="Output format"
                                className="absolute left-0 top-full z-50 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 p-1 shadow-2xl"
                            >
                                {formatOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="option"
                                        aria-selected={outputFormat === option.value}
                                        onClick={() => {
                                            onOutputFormatChange(option.value);
                                            setIsFormatOpen(false);
                                        }}
                                        className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm transition ${
                                            outputFormat === option.value
                                                ? "bg-blue-600 text-white"
                                                : "text-slate-200 hover:bg-slate-800"
                                        }`}
                                    >
                                        <span>{option.label}</span>

                                        {outputFormat === option.value && (
                                            <span aria-hidden="true">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                <button
                    type="button"
                    onClick={onCompress}
                    className="mt-6 w-full rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-5 py-3
                                text-sm font-semibold text-white shadow-lg transition-all duration-200
                                hover:-translate-y-0.5 hover:shadow-xl"
                >
                    Compress Image
                </button>
            </div>
        </section>
    );
}