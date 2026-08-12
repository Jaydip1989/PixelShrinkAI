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
                <select
                    id="output-format"
                    value={outputFormat}
                    onChange={(event) => 
                        onOutputFormatChange(
                            (event.currentTarget as HTMLSelectElement).value as OutputFormat,
                        )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm
                            font-medium text-slate-900 outltine-none transition focus:border-blue-500
                            dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                    <option value="original">Original Format</option>
                    <option value="jpeg">JPG/JPEG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                </select>
                <button
                    type="button"
                    onClick={onCompress}
                    className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3
                                text-sm font-semibold text-white shadow-lg transition-all duration-200
                                hover:-translate-y-0.5 hover:shadow-xl"
                >
                    Compress Image
                </button>
            </div>
        </section>
    );
}