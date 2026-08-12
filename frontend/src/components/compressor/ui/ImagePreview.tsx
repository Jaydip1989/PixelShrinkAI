import type { ImageAsset } from "../../../types/image";

interface ImagePreviewProps {
    image: ImageAsset | null;
}

export default function ImagePreview({
    image,
}: ImagePreviewProps) {
    return (
        <div
            className="
                flex
                h-[260px]
                w-full
                items-center
                justify-center
                overflow-hidden
                rounded-2xl
                bg-slate-200
                dark:bg-slate-800
                sm:h-[280px]
                lg:h-[300px]
            "
        >
            {image ? (
                <img
                    src={image.previewUrl}
                    alt={image.name}
                    className="
                        block
                        max-h-full
                        max-w-full
                        object-contain
                    "
                />
            ) : (
                <span className="text-sm text-slate-400">
                    No Preview
                </span>
            )}
        </div>
    );
}