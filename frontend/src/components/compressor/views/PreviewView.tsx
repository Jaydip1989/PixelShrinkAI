import type { ImageAsset } from "../../../types/image";
import ImagePreview from "../ui/ImagePreview";
import FileInfo from "../ui/FileInfo";
import ToolSettings from "../ui/ToolSettings";

interface PreviewViewProps{
    image: ImageAsset;
}

export default function PreviewView({
    image,
}: PreviewViewProps) {
    return (
        <div className="flex flex-col gap-5 p-5">
            <ImagePreview image={image} />
            <FileInfo image={image} />
            <ToolSettings />
        </div>
    );
}