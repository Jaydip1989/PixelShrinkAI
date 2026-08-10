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
        <div className="space-y-4">
            <ImagePreview image={image} />

            <div className="grid grid-cols-1 gap:4 sm:grid-cols-2">
                <FileInfo image={image} />

                <ToolSettings 
                    quality={settings.quality}
                    outputFormat = {settings.outputFormat}
                    onQualityChange={(quality) => 
                        setSettings((currentSettings) =>({
                            ...currentSettings,
                            quality,
                        }))
                    }
                    onOutputFormatChange={(outputFormat)=>
                        setSettings((currentSettings) =>({
                            ...currentSettings,
                            outputFormat,
                        }))
                    }
                />
            </div>
        </div>
    )
}