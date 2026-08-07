import type { Dispatch, StateUpdater } from "preact/hooks";

import type { CompressionSettings, ImageAsset } from "../../../types/image";

import ImagePreview from "../ui/ImagePreview";
import FileInfo from "../ui/FileInfo";
import ToolSettings from "../ui/ToolSettings";

interface PreviewViewProps{
    image: ImageAsset;
    settings:CompressionSettings;
    setSettings: Dispatch<StateUpdater<CompressionSettings>>;
}

export default function PreviewView({
    image,
    settings,
    setSettings,
}: PreviewViewProps) {
    return (
        <div className="space-y-6">

            <ImagePreview image={image} />

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
                    setSettings((currentSettings) =>({
                        ...currentSettings,
                        outputFormat
                    }))
                }
            />

        </div>
    );
}