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

interface ConversionDefinition {
    id: string;
    label: string;
    description: string;
    outputLabel: string;
    acceptedExtensions: string[];
    acceptedMimeTypes: string[];
    inputLabel: string;
}

interface DownloadViewProps {
    selectedFile: SelectedFile;
    convertedFile: ConvertedFile;
    conversion: ConversionDefinition;
    onSelectAnother: () => void;
}

function formatFileSize(bytes: number | null) : string {
    if (bytes === null) {
        return "-";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DownloadView({
    selectedFile,
    convertedFile,
    conversion,
    onSelectAnother,
}: DownloadViewProps) {
    const handleDownload =() => {
        if (!convertedFile.file) {
            return;
        }
        const url = URL.createObjectURL(
            convertedFile.file,
        )

        const link = document.createElement("a");

        link.href = url;
        link.download = convertedFile.name;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-4 sm:p-6">
            {/* Result Heading */}
            <div className="text-center">
                <div
                    className="
                        mx-auto
                        flex
                        h-14
                        w-14
                        items-center
                        justify-center
                        rounded-full
                        bg-green-100
                        text-green-600
                        dark:bg-green-950/30
                        dark:text-green-400
                    "
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-7 w-7"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 1314 4L19 7" 
                        />
                    </svg>
                </div>
                <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
                    Conversion Complete
                </h2>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Your file has been converted to {" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {conversion.outputLabel}
                    </span>
                    . 
                </p>
            </div>
            {/* File Comparison */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Original */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            Original
                        </p>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            Input
                        </span>
                    </div>

                    <p className="mt-3 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                        {formatFileSize(selectedFile.size)}
                    </p>
                </div>
                {/* Converted */}
                <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 dark:border-purple-900/40 dark:bg-purple-950/20">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            Converted
                        </p>

                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                            {conversion.outputLabel}
                        </span>
                    </div>

                    <p className="mt-3 truncate text-sm font-medium text-slate-700 dark:text-slate-700">
                        {convertedFile.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatFileSize(convertedFile.size)}
                    </p>
                </div>
            </div>
            {/* Converted Preview */}
            <div
                className="
                    mt-5
                    flex
                    min-h-55
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
                {convertedFile.previewUrl ? (
                    <img 
                        src={convertedFile.previewUrl}
                        alt={convertedFile.name}
                        className="
                            max-h-65
                            max-w-full
                            object-contain
                        "
                    />
                ):(
                    <div className="text-center">
                        <div
                            className="
                                mx-auto
                                flex
                                h-16
                                w-16
                                items-center
                                justify-center
                                rounded-2xl
                                bg-purple-100
                                text-purple-600
                                dark:bg-purple-950/30
                                dark:text-purple-400
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
                                    strokeLinejoin ="round"
                                    d="M14 3v6h5"
                                />
                            </svg>
                        </div>

                        <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                            {conversion.outputLabel} ready
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Preview is not available for this format.
                        </p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!convertedFile.file}
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
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                    "
                >
                    Download Converted File
                </button>

                <button
                    type="button"
                    onClick={onSelectAnother}
                    className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        px-6
                        py-3
                        font-semibold
                        text-slate-700
                        transition
                        hover:border-blue-500
                        hover:text-blue-600
                        dark:border-slate-700
                        dark:bg-slate-200
                        dark:hover:border-blue-400
                        dark:hover:text-blue-400
                    "
                >
                    Select Another File
                </button>
            </div>
        </div>
    );
}