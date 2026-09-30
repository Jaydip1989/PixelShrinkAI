import type { Dispatch, StateUpdater } from "preact/hooks";

import type {
    CompressionSettings,
    ImageAsset,
} from "../../../types/image";

import ImagePreview from "../../compressor/ui/ImagePreview";
import FileInfo from "../../compressor/ui/FileInfo";
import ToolSettings from "../../compressor/ui/ToolSettings";

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
        <div className="space-y-4 pb-4">
            <ImagePreview image={image} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-stretch *:h-full *:mt-0">
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
                className="w-full rounded-xl bg-linear-to-r from-blue-600 via-indigo-600 
                to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-md 
                transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
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