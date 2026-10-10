interface ProcessingViewProps {
    outputLabel: string;
}

export default function ProcessingView({
    outputLabel,
}: ProcessingViewProps){
    return (
        <div
            role="status"
            aria-live="polite"
            className="
                flex
                min-h-90
                items-center
                justify-center
                px-6
                py-10
            "
        >
            <div className="w-full max-w-sm text-center">
                {/* Animated Processing Indicator */}
                <div
                    className="
                        relative
                        mx-auto
                        flex
                        h-20
                        w-20
                        items-center
                        justify-center
                        rounded-3xl
                        border border-blue-100
                        bg-blue-50
                        dark:border-blue-900/40
                        dark:bg-blue-950/30
                    "
                >
                    <div
                        className="
                            absolute inset-2 rounded-2xl
                            border-2 border-blue-100/80
                            dark:border-blue-900/50
                        "
                    />

                    <div
                        className="
                            h-10 w-10 animate-spin rounded-full
                            border-[3px] border-slate-200
                            border-t-blue-600
                            dark:border-slate-700
                            dark:border-t-blue-400
                        "
                    />

                    <div 
                        className="
                            absolute -right-1 -top-1
                            h-3.5 w-3.5 rounded-full
                            border-2 border-white bg-indigo-500
                            dark:border-slate-900
                        "
                    />
                </div>
                {/* Processing Heading */}
                <p
                    className="
                        mt-6 text-[10px] font-bold uppercase
                        tracking-[0.16em] text-blue-600
                        dark:text-blue-400
                    "
                >
                    Please Wait
                </p>
                <h2
                    className="
                        mt-2 text-xl font-bold tracking-tight
                        text-slate-900 dark:text-white
                    "
                >
                    Converting your file 
                </h2>

                <p
                    className="
                        mx-auto mt-2 max-w-xs text-sm leading-6
                        text-slate-500 dark:text-slate-400
                    "
                >
                    Preparing your file for {" "}
                    <span
                        className="
                            font-semibold text-slate-700
                            dark:text-slate-200
                        "
                    >
                        {outputLabel}
                    </span>{" "}
                    conversion.
                </p>
                {/* Status Indicator */}
                <div
                    className="
                        mx-auto mt-6 inline-flex items-center
                        gap-2 rounded-full border border-slate-200
                        bg-white px-3 py-2 text-xs font-medium
                        text-slate-600
                        dark:border-slate-700
                        dark:bg-slate-900
                        dark:text-slate-300
                    "
                >
                    <span
                        className="
                            h-1.5 w-1.5 animate-pulse
                            rounded-full bg-blue-500
                        " 
                    />
                    Processing in progress
                </div>
            </div>
        </div>
    );
}