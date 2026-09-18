import { useState } from "preact/hooks";
import ConversionSelector from "./ConversionSelector";

export default function ConverterHero(){
    const [conversion, setConversion] = useState("Image -> SVG");

    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-110 overflow-hidden rounded-3xl border border-slate-200
            bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <ConversionSelector 
                    value={conversion}
                    onChange={setConversion}
                />
                <div className="flex min-h-105 items-center justify-center px-6">
                    <div className="text-center">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {conversion}
                        </p>

                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Select a file to begin
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}