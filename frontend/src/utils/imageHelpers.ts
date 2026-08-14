import type { CompressionSettings, ImageAsset } from "../types/image";
import { optimise } from "@jsquash/oxipng";
import { encode } from "@jsquash/webp";

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

async function optimizePngFile(
    file: File,
    level: number,
): Promise<File>{
    const start = performance.now();

    const inputBuffer = await file.arrayBuffer();

    const optimizedBuffer = await optimise(
        inputBuffer,
        {
            level,
            interlace: false,
        },
    );
    const elapsed = performance.now() - start;
    console.log(
        `[PixelShrinkAI] PNG level=${level}→`+
        `${optimizedBuffer.byteLength}bytes`+
        `(${Math.round(elapsed)}ms)`
    );
    if (optimizedBuffer.byteLength >= file.size) {
        console.log(
            "[PixelShrinkAI] PNG optimization did not reduce the file. Keeping original.",
        );
        return file;
    }
    const blob = new Blob (
        [optimizedBuffer],
        {type: "image/png"},
    );
    return new File(
        [blob],
        file.name,
        {
            type:"image/png",
            lastModified: Date.now(),
        }
    );
}

export async function compressImage(
    file: File,
    settings: CompressionSettings
): Promise<File>{
    const mimeType = getOutputMimeType(
        file.type,
        settings.outputFormat,
    );
    /*
    *
    * PNG + PNG
    * 
    * Use the original PNG bytes directly
    * Do NOT decode the image or create a canvas
    * 
    * This is both faster and more appropriate for
    * Lossless PNG optimization
    */
    if (
        file.type === "image/png" &&
        mimeType === "image/png"
    ) {
        return await optimizePngFile(file, 1);
    }
    /*
    *
    * All other operations require the image to be decoded into a canvas
    */
    const image = await loadImageElement(file);
    try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context){
            throw new Error(
                "Unable to create image processing canvas.",
            );
        }
        canvas.width = image.width;
        canvas.height = image.height;

        context.drawImage(image, 0, 0);

        const imageData = 
            mimeType === "image/webp"||
            mimeType === "image/png"
                ? context.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height,
                )
                :null;
        /*
        * PNG output from another format
        *
        * Example:
        * JPEG -> PNG
        * WBEP -> PNG
        * 
        * These still need ImageData because the source
        * is not an original PNG byte stream
        */
        if (mimeType === "image/png"){
            if(!imageData) {
                throw new Error(
                    "PNG compression requires image data."
                );
            }
            return await compressPng(
                imageData,
                file,
                settings,
            );
        }
        /*
        * JPEG and WebP use adaptive quality compression
        */
       if (
            mimeType === "image/jpeg"||
            mimeType === "image/webp"
       ){
            return await compressWithQuality(
                canvas,
                file,
                settings,
                mimeType,
                imageData,
            );
       }
       /*
       * Fallback for any future format that reaches
       * this path.
       */
       const blob = await canvasToBlob(
            canvas,
            mimeType,
            settings.quality / 100
       );
       return createOutputFile(
            blob,
            file.name,
            settings.outputFormat,
            mimeType
       );
    }finally {
        image.close();
    }
}

async function compressWithQuality(
    canvas: HTMLCanvasElement,
    file: File,
    settings: CompressionSettings,
    mimeType: string,
    imageData: ImageData | null,
): Promise<File> {
    const requestedQuality = Math.min(
        Math.max(settings.quality, 10),
        100,
    );

    const isSameFormat = mimeType === file.type;

    /*
     * First attempt:
     * use exactly the quality selected by the user.
     */
    let blob = await encodeOutput(
        canvas,
        imageData,
        mimeType,
        requestedQuality,
    );

    console.log(
        `[PixelShrinkAI] ${mimeType} quality=${requestedQuality}% → ${blob.size} bytes`,
    );

    /*
     * If the result is already smaller than the
     * original, use it immediately.
     */
    if (blob.size < file.size) {
        return createOutputFile(
            blob,
            file.name,
            settings.outputFormat,
            mimeType,
        );
    }

    /*
     * The requested quality did not produce a smaller
     * result.
     *
     * Search for the highest quality that DOES.
     */
    let low = 30;
    let high = requestedQuality - 1;

    let bestBlob: Blob | null = null;
    let bestQuality = 0;

    while (low <= high) {
        const quality = Math.floor(
            (low + high) / 2,
        );

        blob = await encodeOutput(
            canvas,
            imageData,
            mimeType,
            quality,
        );

        console.log(
            `[PixelShrinkAI] ${mimeType} quality=${quality}% → ${blob.size} bytes`,
        );

        if (blob.size < file.size) {
            /*
             * This quality produces a smaller file.
             * Try a higher quality.
             */
            bestBlob = blob;
            bestQuality = quality;
            low = quality + 1;
        } else {
            /*
             * Still too large.
             * Try a lower quality.
             */
            high = quality - 1;
        }
    }

    /*
     * We found the highest quality that produces
     * a smaller file.
     */
    if (bestBlob) {
        console.log(
            `[PixelShrinkAI] Selected quality=${bestQuality}%`,
        );

        return createOutputFile(
            bestBlob,
            file.name,
            settings.outputFormat,
            mimeType,
        );
    }

    /*
     * Same-format compression:
     * if nothing produced a smaller result, preserve
     * the original file.
     */
    if (isSameFormat) {
        console.log(
            "[PixelShrinkAI] No smaller result found. Keeping original.",
        );

        return file;
    }

    /*
     * Cross-format conversion:
     *
     * The user explicitly requested another format.
     * If no quality produced a smaller file,
     * perform the requested conversion at the
     * selected quality.
     */
    blob = await encodeOutput(
        canvas,
        imageData,
        mimeType,
        requestedQuality,
    );

    console.log(
        `[PixelShrinkAI] Conversion retained at requested quality=${requestedQuality}%`,
    );

    return createOutputFile(
        blob,
        file.name,
        settings.outputFormat,
        mimeType,
    );
}

async function encodeWebP(
    imageData: ImageData,
    quality: number,
): Promise<Blob> {
    const encoded = await encode(imageData, {
        quality,
    });

    return new Blob([encoded], {
        type: "image/webp",
    });
}

async function encodeOutput(
    canvas: HTMLCanvasElement,
    imageData: ImageData | null,
    mimeType: string,
    quality:number,
):Promise<Blob> {
    if (mimeType === "image/webp"){
        if(!imageData) {
            throw new Error (
                "WebP compression requires image data."
            )
        }
        return encodeWebP(
            imageData, 
            quality,
        );
    }
    return canvasToBlob(
        canvas,
        mimeType,
        quality / 100
    );
}

async function compressPng(
    imageData: ImageData,
    file: File,
    settings: CompressionSettings,
): Promise<File>{
    /*
    * Map the quality slider to OxiPNG's optimization level
    *
    * This is NOT lossy image quality
    * OxiPNG is a lossless PNG optimizer
    */
    const level = pngOptimizationLevel(
        settings.quality,
    );
    
    const startTime = performance.now();
    const optimizedBuffer = await optimise(
        imageData,
        {
            level,
            interlace: false,
            optimiseAlpha: true,
        },
    );
    const processingTime = performance.now() - startTime;

    const blob = new Blob(
        [optimizedBuffer],
        {
            type: "image/png",
        },
    );
    console.log(
        `[PixelShrinkAI] PNG level =${level} → ${blob.size} bytes (${processingTime.toFixed(0)}ms)`,
    );
    /*
    * Same-format PNG Compression must never
    * make the file larger.
    */
    if(
        file.type === "image/png" && blob.size >= file.size
    ){
        console.log(
            "[PixelShrinkAI] PNG optimization did not reduce the file. Keep Original.",
        );
        return file;
    }
    return createOutputFile(
        blob,
        file.name,
        settings.outputFormat,
        "image/png"
    );
}

function pngOptimizationLevel(
    quality: number,
): number {
    if(quality >= 90) return 1;
    if(quality >= 75) return 2;
    if(quality >= 60) return 3;
    if(quality >= 40) return 4;
    return 4;
}



function createOutputFile(
    blob: Blob,
    originalName: string,
    outputFormat: CompressionSettings["outputFormat"],
    mimeType: string,
): File {
    const outputName = getOutputFileName(
        originalName,
        outputFormat,
        mimeType,
    );

    return new File(
        [blob],
        outputName,
        {
            type: mimeType,
            lastModified: Date.now(),
        },
    );
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
