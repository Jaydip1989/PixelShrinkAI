 import { formatFileSize } from "../../../utils/imageHelpers";

 interface CompressionStatsProps{
    originalSize: number;
    compressedSize: number;
 }

 export default function CompressionStats({
    originalSize,
    compressedSize
 }: CompressionStatsProps){
    const savedBytes = Math.max(originalSize - compressedSize, 0);
    const savedPercentage =  
            originalSize > 0
                ? Math.max((savedBytes / originalSize) * 100, 0)
                :0;
    return (
        <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[9px] uppercase tracking-wide text-slate-500 sm:text-[11px]">
                    Original
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {formatFileSize(originalSize)}
                </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[9px] uppercase tracking-wide text-slate-500 sm:text-[11px]">
                    Compressed
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {formatFileSize(compressedSize)}
                </p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
                <p className="text-[9px] uppercase tracking-wide text-blue-600 dark:text-blue-400 sm:text-[11px]">
                    Saved
                </p>
                <p className="mt-1 text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {savedPercentage.toFixed(1)}%
                </p>
            </div>
        </div>
    );
 }