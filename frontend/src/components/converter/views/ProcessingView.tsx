interface ProcessingViewProps {
    outputLabel: string;
}

export default function ProcessingView({
    outputLabel,
}: ProcessingViewProps){
    return (
        <div
            className="
                flex
                min-h-90
                items-center
                justify-center
                px-6
                py-10
            "
        >
            <div className="text-center">
                {/* Spinner */}
                <div
                    className="
                        mx-auto
                        flex
                        h-16
                        w-16
                        items-center
                        justify-center
                        rounded-full
                        bg-blue-50
                        dark:bg-blue-950/30
                    "
                >
                    <div
                        className="
                            h-9
                            w-9
                            animate-spin
                            rounded-full
                            border-4
                            border-slate-200
                            border-t-slate-600
                            dark:border-slate-700
                            dark:border-t-slate-400
                        "
                    />
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                    Converting File
                </h2>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Your file is being converted to {" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {outputLabel}
                    </span>
                    .
                </p>

                <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
                    Please wait...
                </p>
            </div>
        </div>
    );
}