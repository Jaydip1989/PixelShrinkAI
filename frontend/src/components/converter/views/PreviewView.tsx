import type { ConversionDefinition } from "../ConversionSelector";

interface SelectedFile {
    file: File;
    name: string;
    size: number;
    type: string;
    previewUrl: string | null;
}

interface PreviewViewProps {
    selectedFile: SelectedFile;
    conversion: ConversionDefinition;
    onConvert: () => void;
    onSelectAnother: () => void;
}

function formatFileSize(bytes: number): string {
    if(bytes < 1024) {
        return `{bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PreviewView({
    selectedFile,
    conversion,
    onConvert,
    onSelectAnother,
}: PreviewViewProps){
    const fileExtension = 
        selectedFile.name.split(".").pop()?.toUpperCase() || "FILE";

    return (
        <div className="p-4 sm:p-6">
            {/* Preview */}
            <div
                className="
                    flex
                    min-h-65
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-2xl
                    border
                    border-slate-200
                    bg-slate-50
                    dark:border-slate-700
                    dark:bg-slate-800/50
                "
            >
                {selectedFile.previewUrl ? (
                    <img 
                        src={selectedFile.previewUrl}
                        alt={selectedFile.name}
                        className="
                            max-h-70
                            max-w-full
                            object-contain
                        "
                    />
                ):(
                    <div className="px-4 text-center">
                        <div
                            className="
                                mx-auto
                                flex
                                h-16
                                w-16
                                items-center
                                justify-center
                                rounded-2xl
                                bg-blue-100
                                text-blue-600
                                dark:bg-blue-950/40
                                dark:text-blue-400
                            "
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-8 w-8"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.8}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M7 3h7l5 5v13H7a2 2 0 01-2-2V5a2 2 0 012-2z" 
                                />
                                <path 
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M14 3v6h5"
                                />
                            </svg>
                        </div>

                        <p className="mt-3 break-all text-sm font-semibold text-slate-900 dark:text-white">
                            {selectedFile.name}
                        </p>
                        <p className="mt-1 text-xs text-slate dark:text-slate-400">
                            Preview unavailable
                        </p>
                    </div>
                )}
            </div>
            {/* File Information */}
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Selected File
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {selectedFile.name}
                        </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700
                    dark:bg-blue-950/40 dark:text-blue-300">
                        {fileExtension}
                    </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            File Size
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                            {formatFileSize(selectedFile.size)}
                        </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Output
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                            {conversion.outputLabel}
                        </p>
                    </div>
                </div>
            </div>

            {/* Conversion Information */}
            <div
                className="
                    relative mt-4 overflow-hidden 
                    rounded-2xl border border-blue-100
                    bg-blue-50/70 p-4 sm:p-5
                    dark:border-blue-900/40
                    dark:bg-blue-950/20
                " 
            >
                <div className="flex items-start gap-3">
                    <div
                        className="
                            flex h-10 w-10 shrink-0 items-center
                            justify-center rounded-xl
                            border border-blue-100 bg-white
                            text-blue-600 shadow-sm
                            dark:border-blue-900/50
                            dark:bg-slate-900
                            dark:text-blue-400
                        "
                    >
                        <svg
                            xmlns ="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                        >
                            <path 
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M7 7h10m0 0-3-3m3 3-3 3M17 17H7m0 0 3 3m-3-3 3-3"
                            />
                        </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
                            Conversion
                        </p>

                        <p className="mt-1.5 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                            {conversion.label}
                        </p>

                        <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {conversion.description}
                        </p>
                    </div>

                    <span
                        className="
                            hidden shrink-0 rounded-lg
                            border border-blue-100 bg-white
                            px-2.5 py-1 text-xs font-semibold
                            text-blue-700 sm:inline-flex
                            dark:border-blue-900/50
                            dark:bg-slate-900
                            dark:text-blue-300
                        "
                    >
                        {conversion.outputLabel}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    onClick={onConvert}
                    className="
                        flex-1
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
                        hover:shadow-sm
                        focus:ring-blue-500/40
                        focus:ring-offset-2
                        dark:focus:ring-offset-slate-900
                    "
                >
                    Convert to {conversion.outputLabel}
                </button>

                
                <button
                    type="button"
                    onClick={onSelectAnother}
                    className="
                        flex-1
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
                        focus:outline-none
                        focus:ring-2
                        focus:ring-blue-500/40
                        focus:ring-offset-2
                        dark:focus:ring-offset-slate-900
                    "
                >
                    Select Another File
                </button>

            </div>
        </div>
    );
}

