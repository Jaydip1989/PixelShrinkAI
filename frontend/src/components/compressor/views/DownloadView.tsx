import type { ImageAsset } from "../../../types/image";

import ImagePreview from "../ui/ImagePreview";
import FileInfo from "../ui/FileInfo";
import CompressionStats from "../ui/CompressionStats";
import DownloadButton from "../ui/DownloadButton";

interface DownloadViewProps {
    image: ImageAsset;
    compressedImage: ImageAsset;
    onSelectAnother: () => void;
}

export default function DownloadView({
    image,
    compressedImage,
    onSelectAnother,
}: DownloadViewProps) { 
    return (
        <div className="mx-auto w-full max-w-[1000px] px-4 py-2">
            {/* Image comparison */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Original */}
                <div className="min-w-0">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Original Image
                        </h2>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                            Original
                        </span>
                    </div>

                    <ImagePreview image={image} />

                    <FileInfo image={image} />
                </div>

                {/* Compressed */}
                <div className="min-w-0">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Compressed Image
                        </h2>

                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                            Compressed
                        </span>
                    </div>

                    <ImagePreview image={compressedImage} />

                    <FileInfo image={compressedImage} />
                </div>
            </div>

            {/* Compression statistics */}
            <div className="mt-6">
                <CompressionStats
                    originalSize={image.size}
                    compressedSize={compressedImage.size}
                />
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <DownloadButton file={compressedImage.file} />

                <button
                    type="button"
                    onClick={onSelectAnother}
                    className="
                        shrink-0
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-5
                        py-3
                        text-sm
                        font-semibold
                        text-slate-700
                        transition
                        hover:border-blue-500
                        hover:text-blue-600
                        dark:border-slate-700
                        dark:bg-slate-900
                        dark:text-slate-200
                        dark:hover:border-blue-400
                        dark:hover:text-blue-400
                    "
                >
                    Select Another Image
                </button>
            </div>
        </div>
    );
}