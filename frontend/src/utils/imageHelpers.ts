import type { ImageAsset } from "../types/image";

export async function loadImage(file: File): Promise<ImageAsset> {
    const {width, height} = await getImageDimensions(file);

    return {
        file,
        previewUrl: URL.createObjectURL(file),

        name: file.name,
        type: file.type,
        size: file.size,

        width,
        height,
    };
}


export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;

    const kb = bytes/ 1024;

    if (kb < 1024) {
        return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024 ;

    return `${mb.toFixed(2)} MB`;
}


export async function getImageDimensions(
    file: File
): Promise < {width: number; height: number} > {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = () => {
            resolve({
                width:image.width,
                height:image.height,
            });

            URL.revokeObjectURL(objectUrl);
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image."));
        };

        image.src = objectUrl;
    });
}

