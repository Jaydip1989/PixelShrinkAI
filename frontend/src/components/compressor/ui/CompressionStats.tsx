
import { formatFileSize } from "../../../utils/imageHelpers";

interface CompressionStatsProps {
    originalSize: number;
    compressedSize: number;
}

export default function CompressionStats({
    originalSize,
    compressedSize
}: CompressionStatsProps) {

    const isIncreased = compressedSize > originalSize;
    const isUnchanged = compressedSize === originalSize;

    const percentage =
        originalSize > 0
            ? (Math.abs(originalSize - compressedSize) / originalSize) * 100
            : 0;

    const statLabel = isIncreased
        ? "Size increased"
        : isUnchanged
            ? "No change"
            : "Saved";

    const cardStyle = isIncreased
        ? "border-amber-100 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30"
        : "border-blue-100 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30";

    const labelStyle = isIncreased
        ? "text-amber-600 dark:text-amber-400"
        : "text-blue-600 dark:text-blue-400";

    const valueStyle = isIncreased
        ? "text-amber-700 dark:text-amber-300"
        : "text-blue-700 dark:text-blue-300";

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

            <div className={`rounded-2xl border p-4 ${cardStyle}`}>
                <p className={`text-[9px] uppercase tracking-wide sm:text-[11px] ${labelStyle}`}>
                    {statLabel}
                </p>
                <p className={`mt-1 text-sm font-semibold ${valueStyle}`}>
                    {percentage.toFixed(1)}%
                </p>
            </div>

        </div>
    );
}
