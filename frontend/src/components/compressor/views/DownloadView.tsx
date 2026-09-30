import type { ImageAsset } from "../../../types/image";

import ImagePreview from "../../compressor/ui/ImagePreview";
import FileInfo from "../../compressor/ui/FileInfo";
import CompressionStats from "../../compressor/ui/CompressionStats";
import DownloadButton from "../../compressor/ui/DownloadButton";

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
        <div className="mx-auto w-full max-w-250 px-4 py-2">
            {/* Image comparison */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch [&>div]:h-full">

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
                        bg-linear-to-r
                        from-blue-600
                        via-indigo-600
                        to-pink-500
                        px-5
                        py-3
                        text-sm
                        font-semibold
                        text-white
                        shadow-md
                        transition-all
                        duration-200
                        hover:-translate-y-0.5
                        hover:shadow-lg
                    "
                >
                    Select Another Image
                </button>
            </div>
        </div>
    );
}