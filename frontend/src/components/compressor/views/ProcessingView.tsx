export default function ProcessingView() {
    return (
        <div className="flex min-h-[420px] items-center justify-center">
            <div className="text-center">
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    Processing...
                </p>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Compressing your image
                </p>
            </div>
        </div>
    );
}