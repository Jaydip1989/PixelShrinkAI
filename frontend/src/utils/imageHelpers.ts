import type { CompressionSettings, ImageAsset } from "../types/image";

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

export async function compressImage(
    file: File,
    settings: CompressionSettings,
): Promise<File> {
    const image = await loadImageElement(file);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
        image.close();
        throw new Error("Unable to create image processing canvas.");
    }

    canvas.width = image.width;
    canvas.height = image.height;

    context.drawImage(image, 0, 0);

    const mimeType = getOutputMimeType(
        file.type,
        settings.outputFormat,
    );

    const quality =
        settings.outputFormat === "png"
            ? undefined
            : settings.quality / 100;

    const blob = await canvasToBlob(
        canvas,
        mimeType,
        quality,
    );

    image.close();

    const outputName = getOutputFileName(
        file.name,
        settings.outputFormat,
        mimeType,
    );

    return new File([blob], outputName, {
        type: mimeType,
        lastModified: Date.now(),
    });
}

function loadImageElement(file: File): Promise<ImageBitmap> {
    return createImageBitmap(file, {
        imageOrientation: "from-image",
    }).catch(() => {
        throw new Error("Failed to prepare image for compression.");
    });
}


function canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string,
    quality?: number,
): Promise<Blob> {
    return new Promise((resolve, reject)=> {
        canvas.toBlob(
            (blob) => {
                if(!blob) {
                    reject(new Error("Image compression failed."));
                    return;
                }
                resolve(blob);
            },
            mimeType,
            quality,
        );
    });
}

function getOutputMimeType(
    originalType: string,
    outputFormat: CompressionSettings["outputFormat"],
): string {
    switch (outputFormat){
        case "jpeg":
            return "image/jpeg";
        
        case "png":
            return "image/png";
        
        case "webp":
            return "image/webp";
        
        case "original":
        default:
            if (
                originalType === "image/jpeg" ||
                originalType === "image/png"  ||
                originalType === "image/webp"
            ){
                return originalType;
            }
        return "image/jpeg";
    }

}

function getOutputFileName(
    originalName: string,
    outputFormat: CompressionSettings["outputFormat"],
    mimeType:string,
): string {
    const baseName = originalName.replace(/\.[^/.]+$/, "");
    if (outputFormat === "original") {
        return `${baseName}-compressed${getExtensionFromMimeType(mimeType)}`;

    }
    return `${baseName}-compressed${getExtensionFromMimeType(mimeType)}`;
}

function getExtensionFromMimeType(mimeType:string): string {
    switch(mimeType){
        case "image/jpeg":
            return ".jpg";
        
        case "image/png":
            return ".png";
        
        case "image/webp":
            return ".webp"

        default:
            return ".jpg";
    }
}
