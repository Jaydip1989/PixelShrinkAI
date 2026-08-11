import type { ImageAsset } from "../../../types/image";

interface ImagePreviewProps {
    image: ImageAsset | null;
}

export default function ImagePreview({
    image,
}:ImagePreviewProps) {
    return (
        <div className="flex h-[300px] w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-100
                        dark:bg-slate-800">
            {image ? (
                <img
                    src={image.previewUrl}
                    alt={image.name}
                    className="h-hull w-full object-contain" 
                />
            ):(
                <span className="text-sm text-slate-400">
                    No Preview
                </span>
            )}
        </div>
    );
}