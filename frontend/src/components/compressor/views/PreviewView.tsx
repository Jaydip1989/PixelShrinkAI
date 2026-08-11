import type { Dispatch, StateUpdater } from "preact/hooks";
import type { CompressionSettings, ImageAsset } from "../../../types/image";

import ImagePreview from "../ui/ImagePreview";
import FileInfo from "../ui/FileInfo";
import ToolSettings from "../ui/ToolSettings";

interface PreviewViewProps {
    image: ImageAsset;
    settings: CompressionSettings;
    setSettings: Dispatch<StateUpdater<CompressionSettings>>;
}

export default function PreviewView({
    image,
    settings,
    setSettings,
}: PreviewViewProps) {
    return (
        <div className="mx-auto w-full max-w-[840px] px-4 py-6 sm:px-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">

                {/* ORIGINAL PANEL */}
                <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 
                            dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Original Image
                        </h2>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold 
                                    text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            Original
                        </span>
                    </div>

                    <ImagePreview image={image} />

                    <div className="mt-4">
                        <FileInfo image={image} />
                    </div>
                </section>

                {/* COMPRESSION PANEL */}
                <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 
                                dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Compression
                        </h2>

                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold 
                                    text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                            Settings
                        </span>
                    </div>

                    <ToolSettings
                        quality={settings.quality}
                        outputFormat={settings.outputFormat}
                        onQualityChange={(quality) =>
                            setSettings((currentSettings) => ({
                                ...currentSettings,
                                quality,
                            }))
                        }
                        onOutputFormatChange={(outputFormat) =>
                            setSettings((currentSettings) => ({
                                ...currentSettings,
                                outputFormat,
                            }))
                        }
                    />
                </section>

            </div>
        </div>
    );
}