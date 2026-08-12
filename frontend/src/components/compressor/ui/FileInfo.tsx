import type { ImageAsset } from "../../../types/image";
import { formatFileSize } from "../../../utils/imageHelpers";

interface FileInfoProps {
    image: ImageAsset | null;
}

export default function FileInfo({
    image,
}: FileInfoProps) {
    if (!image) return null;
    return (
        <div className = "mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
                File Information
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        Filename
                    </p>
                    <p
                        className="mt-1 break-words text-xs font-medium leading-5 text-slate-900 dark:text-white"
                        title={image.name}
                    >
                        {image.name}
                    </p>
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        Format
                    </p>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-900 dark:text-white"> 
                        {image.type}
                    </p>
                </div>
                <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        File Size
                    </p>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-900 dark:text-white">
                        {formatFileSize(image.size)}
                    </p>
                </div>
                <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        Dimensions
                    </p>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-900 dark:text-white">
                        {image.width} x {image.height}
                    </p>
                </div>
            </div>
        </div>
    );
}