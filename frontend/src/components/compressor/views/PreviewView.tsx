import type { Dispatch, StateUpdater } from "preact/hooks";

import type {
    CompressionSettings,
    ImageAsset,
} from "../../../types/image";

import ImagePreview from "../ui/ImagePreview";
import FileInfo from "../ui/FileInfo";
import ToolSettings from "../ui/ToolSettings";

interface PreviewViewProps {
    image: ImageAsset;
    compressedImage: ImageAsset | null;
    settings: CompressionSettings;
    setSettings: Dispatch<StateUpdater<CompressionSettings>>;
    onSelectAnother: () => void;
    onCompress: () => Promise<void>;
}

export default function PreviewView({
    image,
    compressedImage,
    settings,
    setSettings,
    onSelectAnother,
    onCompress,
}: PreviewViewProps) {
    return (
        <div className="space-y-4">
            <ImagePreview image={image} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FileInfo image={image} />

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
                    onCompress={onCompress}
                />
            </div>

            <button
                type="button"
                onClick={onSelectAnother}
                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:text-blue-400"
            >
                Select Another Image
            </button>

            {compressedImage && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                    Compressed image ready.
                </div>
            )}
        </div>
    );
}