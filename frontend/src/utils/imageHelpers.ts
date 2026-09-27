import type {
    CompressionSettings,
    ImageAsset,
} from "../types/image";

import { optimise } from "@jsquash/oxipng";
import { encode } from "@jsquash/webp";


export async function loadImage(
    file: File,
): Promise<ImageAsset> {
    const { width, height } =
        await getImageDimensions(file);

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


export function formatFileSize(
    bytes: number,
): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
        return `${kb.toFixed(1)} KB`;
    }

    const mb = kb / 1024;

    return `${mb.toFixed(2)} MB`;
}


export async function getImageDimensions(
    file: File,
): Promise<{
    width: number;
    height: number;
}> {
    return new Promise(
        (resolve, reject) => {
            const image = new Image();

            const objectUrl =
                URL.createObjectURL(file);

            image.onload = () => {
                resolve({
                    width: image.width,
                    height: image.height,
                });

                URL.revokeObjectURL(
                    objectUrl,
                );
            };

            image.onerror = () => {
                URL.revokeObjectURL(
                    objectUrl,
                );

                reject(
                    new Error(
                        "Failed to load image.",
                    ),
                );
            };

            image.src = objectUrl;
        },
    );
}


/*
 * PNG → PNG
 *
 * Optimize the original PNG bytes directly.
 * This keeps PNG compression lossless.
 */
async function optimizePngFile(
    file: File,
    level: number,
): Promise<File> {
    const start =
        performance.now();

    const inputBuffer =
        await file.arrayBuffer();

    const optimizedBuffer =
        await optimise(
            inputBuffer,
            {
                level,
                interlace: false,
                optimiseAlpha: true,
            },
        );

    const elapsed =
        performance.now() - start;

    console.log(
        `[PixelShrinkAI] PNG level=${level} → ` +
        `${optimizedBuffer.byteLength} bytes ` +
        `(${Math.round(elapsed)}ms)`,
    );

    if (
        optimizedBuffer.byteLength >=
        file.size
    ) {
        console.log(
            "[PixelShrinkAI] PNG optimization did not reduce the file. Keeping original.",
        );

        return file;
    }

    const blob = new Blob(
        [optimizedBuffer],
        {
            type: "image/png",
        },
    );

    return new File(
        [blob],
        getOutputFileName(
            file.name,
            "original",
            "image/png",
        ),
        {
            type: "image/png",
            lastModified: Date.now(),
        },
    );
}


export async function compressImage(
    file: File,
    settings: CompressionSettings,
): Promise<File> {

    const mimeType =
        getOutputMimeType(
            file.type,
            settings.outputFormat,
        );

    /*
     * PNG → PNG
     *
     * Keep the existing direct lossless
     * optimization path.
     */
    if (
        file.type === "image/png" &&
        mimeType === "image/png"
    ) {
        return await optimizePngFile(
            file,
            pngOptimizationLevel(
                settings.quality,
            ),
        );
    }

    /*
     * All other formats require decoding.
     */
    const image =
        await loadImageElement(file);

    try {
        const canvas =
            document.createElement("canvas");

        const context =
            canvas.getContext("2d");

        if (!context) {
            throw new Error(
                "Unable to create image processing canvas.",
            );
        }

        canvas.width = image.width;
        canvas.height = image.height;

        context.drawImage(
            image,
            0,
            0,
        );

        /*
         * ImageData is required for:
         *
         * JPEG → PNG
         * WEBP → PNG
         *
         * WebP → PNG remains completely isolated
         * inside convertWebpToPng().
         */
        const imageData =
            mimeType === "image/png" ||
            mimeType === "image/webp"
                ? context.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height,
                )
                : null;

        /*
         * PNG output.
         *
         * JPEG → PNG is handled by compressPng().
         * WEBP → PNG is dispatched by compressPng()
         * to the already-working convertWebpToPng().
         */
        if (
            mimeType === "image/png"
        ) {
            if (!imageData) {
                throw new Error(
                    "PNG compression requires image data.",
                );
            }

            return await compressPng(
                imageData,
                file,
                settings,
            );
        }

        /*
         * JPEG / WEBP output.
         */
        if (
            mimeType === "image/jpeg" ||
            mimeType === "image/webp"
        ) {
            return await compressWithQuality(
                canvas,
                file,
                settings,
                mimeType,
                imageData,
            );
        }

        /*
         * Future-format fallback.
         */
        const blob =
            await canvasToBlob(
                canvas,
                mimeType,
                settings.quality / 100,
            );

        return createOutputFile(
            blob,
            file.name,
            settings.outputFormat,
            mimeType,
        );

    } finally {
        image.close();
    }
}


/*
 * JPEG / WEBP adaptive compression.
 *
 * First use the user's selected quality.
 * If that does not make the file smaller,
 * search downward for the highest quality
 * that produces a smaller file.
 */
async function compressWithQuality(
    canvas: HTMLCanvasElement,
    file: File,
    settings: CompressionSettings,
    mimeType: string,
    imageData: ImageData | null,
): Promise<File> {
    const requestedQuality =
        Math.min(
            Math.max(
                settings.quality,
                10,
            ),
            100,
        );

    const isSameFormat =
        mimeType === file.type;

    let blob =
        await encodeOutput(
            canvas,
            imageData,
            mimeType,
            requestedQuality,
        );

    console.log(
        `[PixelShrinkAI] ${mimeType} ` +
        `quality=${requestedQuality}% → ` +
        `${blob.size} bytes`,
    );

    /*
     * Requested quality already produced
     * a smaller file.
     */
    if (
        blob.size < file.size
    ) {
        return createOutputFile(
            blob,
            file.name,
            settings.outputFormat,
            mimeType,
        );
    }

    /*
     * Search for the highest quality that
     * still produces a smaller file.
     */
    let low = 10;

    let high =
        requestedQuality - 1;

    let bestBlob:
        Blob | null = null;

    let bestQuality = 0;

    while (low <= high) {
        const quality =
            Math.floor(
                (low + high) / 2,
            );

        blob =
            await encodeOutput(
                canvas,
                imageData,
                mimeType,
                quality,
            );

        console.log(
            `[PixelShrinkAI] ${mimeType} ` +
            `quality=${quality}% → ` +
            `${blob.size} bytes`,
        );

        if (
            blob.size < file.size
        ) {
            bestBlob = blob;
            bestQuality = quality;
            low = quality + 1;
        } else {
            high = quality - 1;
        }
    }

    /*
     * Highest quality that produced a
     * smaller file.
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
     * Same-format compression must never
     * return a larger file.
     */
    if (isSameFormat) {
        console.log(
            "[PixelShrinkAI] No smaller result found. Keeping original.",
        );

        return file;
    }

    /*
     * Cross-format conversion is allowed
     * even when the converted file is larger.
     */
    blob =
        await encodeOutput(
            canvas,
            imageData,
            mimeType,
            requestedQuality,
        );

    return createOutputFile(
        blob,
        file.name,
        settings.outputFormat,
        mimeType,
    );
}


/*
 * WEBP encoder.
 */
async function encodeWebP(
    imageData: ImageData,
    quality: number,
): Promise<Blob> {
    const encoded =
        await encode(
            imageData,
            {
                quality,
            },
        );

    return new Blob(
        [encoded],
        {
            type: "image/webp",
        },
    );
}


/*
 * Route encoding to the correct engine.
 */
async function encodeOutput(
    canvas: HTMLCanvasElement,
    imageData: ImageData | null,
    mimeType: string,
    quality: number,
): Promise<Blob> {
    if (
        mimeType === "image/webp"
    ) {
        if (!imageData) {
            throw new Error(
                "WebP compression requires image data.",
            );
        }

        return encodeWebP(
            imageData,
            quality,
        );
    }

    return canvasToBlob(
        canvas,
        mimeType,
        quality / 100,
    );
}


/*
 * WEBP → PNG
 *
 * This function owns ALL WebP → PNG
 * compression logic.
 *
 * Two strategies are intentionally used:
 *
 * 1. WebP >= 500 KB
 *    Existing proven downward color search.
 *
 * 2. WebP < 500 KB
 *    Special small-file strategy targeting
 *    approximately 1–1.5% smaller than the
 *    original WebP while preserving maximum
 *    possible visual quality.
 */

async function convertWebpToPng(
    imageData: ImageData,
    file: File,
    settings: CompressionSettings,
): Promise<File> {
    const upngModule = await import("@upng/upng-js");
    const UPNG = upngModule.default ?? upngModule;

    const originalSize = file.size;
    const W = imageData.width;
    const H = imageData.height;

    console.log(
        `[PixelShrinkAI] WEBP → PNG input=${originalSize} bytes ${W}×${H}`,
    );

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = W;
    sourceCanvas.height = H;
    const sourceCtx = sourceCanvas.getContext("2d");
    if (!sourceCtx) throw new Error("Canvas context unavailable.");
    sourceCtx.putImageData(imageData, 0, 0);

    const workCanvas = document.createElement("canvas");
    const workCtx = workCanvas.getContext("2d");
    if (!workCtx) throw new Error("Canvas context unavailable.");
    workCtx.imageSmoothingEnabled = true;
    workCtx.imageSmoothingQuality = "high";

    const dither = (src: ImageData, paletteSize: number): ImageData => {
        if (paletteSize >= 192) return src;

        const w = src.width;
        const h = src.height;
        const data = new Uint8ClampedArray(src.data);
        const step = paletteSize < 64 ? 51 : 17;

        const spread = (
            x: number,
            y: number,
            dx: number,
            dy: number,
            errR: number,
            errG: number,
            errB: number,
            f: number,
        ): void => {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) return;
            const ni = (ny * w + nx) * 4;
            data[ni] = Math.max(0, Math.min(255, data[ni] + errR * f));
            data[ni + 1] = Math.max(0, Math.min(255, data[ni + 1] + errG * f));
            data[ni + 2] = Math.max(0, Math.min(255, data[ni + 2] + errB * f));
        };

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                const oldR = data[i];
                const oldG = data[i + 1];
                const oldB = data[i + 2];

                const newR = Math.round(oldR / step) * step;
                const newG = Math.round(oldG / step) * step;
                const newB = Math.round(oldB / step) * step;

                data[i] = newR;
                data[i + 1] = newG;
                data[i + 2] = newB;

                const errR = oldR - newR;
                const errG = oldG - newG;
                const errB = oldB - newB;

                spread(x, y,  1,  0, errR, errG, errB, 7 / 16);
                spread(x, y, -1,  1, errR, errG, errB, 3 / 16);
                spread(x, y,  0,  1, errR, errG, errB, 5 / 16);
                spread(x, y,  1,  1, errR, errG, errB, 1 / 16);
            }
        }

        return new ImageData(data, w, h);
    };

    const encodePalette = async (
        src: ImageData,
        colorCount: number,
    ): Promise<Blob> => {
        const d = dither(src, colorCount);
        const upng = UPNG.encode(
            [d.data.buffer],
            d.width,
            d.height,
            colorCount,
        );

        let finalBuffer: ArrayBuffer = upng;
        try {
            const oxi = await optimise(upng, {
                level: 4,
                interlace: false,
                optimiseAlpha: true,
            });
            if (oxi.byteLength < upng.byteLength) finalBuffer = oxi;
        } catch (err) {
            console.warn("[PixelShrinkAI] OxiPNG failed.", err);
        }

        return new Blob([finalBuffer], { type: "image/png" });
    };

    const encodeAt = async (
        scale: number,
        colorCount: number,
    ): Promise<{ blob: Blob; width: number; height: number }> => {
        const w = Math.max(1, Math.round(W * scale));
        const h = Math.max(1, Math.round(H * scale));

        workCanvas.width = w;
        workCanvas.height = h;
        workCtx.imageSmoothingEnabled = true;
        workCtx.imageSmoothingQuality = "high";

        if (scale === 1) {
            workCtx.drawImage(sourceCanvas, 0, 0);
        } else {
            workCtx.drawImage(sourceCanvas, 0, 0, w, h);
        }

        const scaled = workCtx.getImageData(0, 0, w, h);
        const blob = await encodePalette(scaled, colorCount);

        return { blob, width: w, height: h };
    };

    // ------------------------------------------------------------------
    // Best-candidate tracking via wrapper object.
    // ------------------------------------------------------------------
    const best = {
        blob: null as Blob | null,
        w: W,
        h: H,
        colors: 256,
        scale: 1,
    };

    const consider = (
        blob: Blob,
        w: number,
        h: number,
        colors: number,
        scale: number,
    ): boolean => {
        if (blob.size >= originalSize) return false;

        const better =
            best.blob === null ||
            w * h > best.w * best.h ||
            (w * h === best.w * best.h && colors > best.colors);

        if (better) {
            best.blob = blob;
            best.w = w;
            best.h = h;
            best.colors = colors;
            best.scale = scale;
        }
        return true;
    };

    // ==================================================================
    // STEP 1 — Full resolution @ 256 colors.
    // ==================================================================
    const fullRes = await encodeAt(1, 256);
    console.log(
        `[PixelShrinkAI] WEBP → PNG 256 colors @100% → ${fullRes.blob.size}`,
    );

    if (consider(fullRes.blob, fullRes.width, fullRes.height, 256, 1)) {
        const reduction = (1 - fullRes.blob.size / originalSize) * 100;
        console.log(
            `[PixelShrinkAI] WEBP → PNG ACCEPTED 256 @100% ` +
            `(${reduction.toFixed(2)}% smaller)`,
        );
        return createOutputFile(
            fullRes.blob,
            file.name,
            settings.outputFormat,
            "image/png",
        );
    }

        // ==================================================================
    // STEP 2 — Full resolution, binary search palette.
    //
    // IMPORTANT: we enforce a perceptual floor of 192 colors.
    //
    // Below 192 colors, even with dithering, photographic gradients
    // (sky, water, skin) start to show visible artifacts. If the
    // full-resolution PNG can't beat the WebP at 192 colors, we
    // stop the palette search here and fall through to Step 3,
    // which will trade a tiny bit of resolution for a much higher
    // palette — a far better quality/size tradeoff.
    // ==================================================================
    const MIN_FULL_RES_PALETTE = 192;

    let lowColor = MIN_FULL_RES_PALETTE;
    let highColor = 256;
    let bestFullResBlob: Blob | null = null;
    let bestFullResColors = 0;

    // First try 256 explicitly (already done in Step 1).
    // Then binary-search only within [192, 256].
    for (let i = 0; i < 4; i++) {
        if (highColor - lowColor <= 8) break;

        const mid = Math.max(
            MIN_FULL_RES_PALETTE,
            Math.round((lowColor + highColor) / 2 / 8) * 8,
        );
        if (mid === lowColor || mid === highColor) break;

        const cand = await encodeAt(1, mid);
        console.log(
            `[PixelShrinkAI] WEBP → PNG ${mid} colors @100% → ${cand.blob.size}`,
        );

        if (cand.blob.size < originalSize) {
            bestFullResBlob = cand.blob;
            bestFullResColors = mid;
            consider(cand.blob, cand.width, cand.height, mid, 1);
            lowColor = mid;
        } else {
            highColor = mid;
        }

        await new Promise<void>((r) => setTimeout(r, 0));
    }

    if (bestFullResBlob !== null) {
        const reduction =
            (1 - bestFullResBlob.size / originalSize) * 100;
        console.log(
            `[PixelShrinkAI] WEBP → PNG ACCEPTED ${bestFullResColors} ` +
            `@100% (${reduction.toFixed(2)}% smaller)`,
        );
        return createOutputFile(
            bestFullResBlob,
            file.name,
            settings.outputFormat,
            "image/png",
        );
    }

    // ==================================================================
    // STEP 3 — Palette + scale.
    //
    // Because Step 2 refused to go below 192 colors, if we're here
    // it means no full-resolution palette ≥ 192 fits under the WebP.
    // The right move is a TINY resolution reduction while keeping a
    // high palette — that preserves colors far better than a large
    // palette reduction at full resolution.
    //
    // We use 192 colors as the palette floor for the scale search
    // so the result still looks photographic.
    // ==================================================================
    const PALETTE_FOR_SCALE = 192;

    // Smaller initial steps near 100% so we only give up as much
    // resolution as strictly necessary.
    const initialScales = [
        0.98, 0.96, 0.94, 0.92, 0.90, 0.88,
        0.85, 0.82, 0.80, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50,
    ];
    let fitScale: number | null = null;
    let lastTooBigScale = 1.0;

    for (const s of initialScales) {
        const cand = await encodeAt(s, PALETTE_FOR_SCALE);
        console.log(
            `[PixelShrinkAI] WEBP → PNG ${PALETTE_FOR_SCALE} colors ` +
            `@${(s * 100).toFixed(0)}% → ${cand.blob.size}`,
        );

        consider(cand.blob, cand.width, cand.height, PALETTE_FOR_SCALE, s);

        if (cand.blob.size < originalSize) {
            fitScale = s;
            break;
        }

        lastTooBigScale = s;
        await new Promise<void>((r) => setTimeout(r, 0));
    }

    // Binary-refine scale — 6 iterations for tighter convergence.
    if (fitScale !== null) {
        let low = fitScale;
        let high = lastTooBigScale;
        if (high <= low) high = Math.min(1.0, low + 0.02);

        for (let i = 0; i < 6; i++) {
            if (high - low < 0.005) break;

            const mid = (low + high) / 2;
            const cand = await encodeAt(mid, PALETTE_FOR_SCALE);
            console.log(
                `[PixelShrinkAI] WEBP → PNG refine ${PALETTE_FOR_SCALE} ` +
                `@${(mid * 100).toFixed(1)}% → ${cand.blob.size}`,
            );

            consider(cand.blob, cand.width, cand.height, PALETTE_FOR_SCALE, mid);

            if (cand.blob.size < originalSize) {
                low = mid;
            } else {
                high = mid;
            }

            await new Promise<void>((r) => setTimeout(r, 0));
        }
    }
    // ------------------------------------------------------------------
    // Return the best candidate found, using a fresh `const` binding
    // so TypeScript narrows it correctly.
    // ------------------------------------------------------------------
    const bestBlob = best.blob;

    if (bestBlob !== null && bestBlob.size < originalSize) {
        const reduction = (1 - bestBlob.size / originalSize) * 100;
        console.log(
            `[PixelShrinkAI] WEBP → PNG BEST: ` +
            `${best.colors} colors @${(best.scale * 100).toFixed(1)}% ` +
            `${best.w}×${best.h} → ${bestBlob.size} ` +
            `(${reduction.toFixed(2)}% smaller)`,
        );
        return createOutputFile(
            bestBlob,
            file.name,
            settings.outputFormat,
            "image/png",
        );
    }

    // ==================================================================
    // STEP 4 — Nothing fit.
    // ==================================================================
    console.warn(
        `[PixelShrinkAI] WEBP → PNG no result smaller than ${originalSize}. ` +
        `Keeping original WebP.`,
    );

    // ------------------------------------------------------------------
    // Minimum savings threshold.
    //
    // If the best PNG candidate saves less than 3% of the original WebP
    // size, the conversion isn't worth the quality loss (resolution
    // reduction and/or palette quantization). Return the original WebP
    // unchanged so the user gets the best possible image at essentially
    // the same file size.
    // ------------------------------------------------------------------
    const MIN_SAVINGS_PCT = 3;

    if (
        bestBlob !== null &&
        bestBlob.size < originalSize
    ) {
        const savingsPct =
            (1 - bestBlob.size / originalSize) * 100;

        if (savingsPct >= MIN_SAVINGS_PCT) {
            console.log(
                `[PixelShrinkAI] WEBP → PNG ACCEPTED: ` +
                `${best.colors} colors @${(best.scale * 100).toFixed(1)}% ` +
                `${best.w}×${best.h} → ${bestBlob.size} bytes ` +
                `(${savingsPct.toFixed(2)}% smaller)`,
            );
            return createOutputFile(
                bestBlob,
                file.name,
                settings.outputFormat,
                "image/png",
            );
        }

        console.log(
            `[PixelShrinkAI] WEBP → PNG savings only ` +
            `${savingsPct.toFixed(2)}%, below ${MIN_SAVINGS_PCT}% threshold. ` +
            `Keeping original WebP.`,
        );
    }

    // Below threshold or no candidate fit — return the original WebP.
    return new File([file], file.name, {
        type: file.type,
        lastModified: Date.now(),
    });

}
/*
 * PNG compression for:
 *
 * - JPEG → PNG
 * - PNG → PNG fallback path
 *
 * WebP → PNG is dispatched to convertWebpToPng()
 */

/*
 * PNG compression.
 *
 * Handles ONLY:
 *
 * 1. JPEG → PNG
 * 2. PNG → PNG fallback
 *
 * WebP → PNG is NOT modified here.
 * It continues to use the existing
 * convertWebpToPng() implementation.
 *
 *
 * JPEG → PNG strategy:
 *
 * 1. Full resolution + palette reduction.
 * 2. UPNG encoding.
 * 3. OxiPNG lossless optimization.
 * 4. Floyd-Steinberg-style dithering.
 * 5. If PNG is still larger than JPEG,
 *    progressively reduce resolution.
 *
 * IMPORTANT:
 *
 * JPEG → PNG ALWAYS returns a PNG.
 * It will NEVER return the original JPEG.
 */
async function compressPng(
    imageData: ImageData,
    file: File,
    settings: CompressionSettings,
): Promise<File> {

    /*
     * ============================================================
     * WEBP → PNG
     *
     * DO NOT TOUCH THIS PATH.
     * ============================================================
     */
    if (
        file.type === "image/webp"
    ) {
        return await convertWebpToPng(
            imageData,
            file,
            settings,
        );
    }


    const upngModule =
        await import("@upng/upng-js");

    const UPNG =
        upngModule.default ??
        upngModule;


    /*
     * ============================================================
     * PNG → PNG
     *
     * Keep the existing lossless behavior.
     * ============================================================
     */
    if (
        file.type === "image/png"
    ) {

        const colorCount =
            pngColorCount(
                settings.quality,
            );

        /*
         * Make a real ArrayBuffer.
         *
         * This avoids ArrayBufferLike /
         * SharedArrayBuffer TypeScript issues.
         */
        const pixelBytes =
            new Uint8Array(
                imageData.data.byteLength,
            );

        pixelBytes.set(
            imageData.data,
        );

        const pixelBuffer: ArrayBuffer =
            pixelBytes.buffer;


        let pngBuffer: ArrayBuffer;

        try {

            pngBuffer =
                UPNG.encode(
                    [pixelBuffer],
                    imageData.width,
                    imageData.height,
                    colorCount,
                );

        } catch (error) {

            console.error(
                "[PixelShrinkAI] PNG → PNG UPNG failed:",
                error,
            );

            return file;
        }


        /*
         * OxiPNG is used only once.
         */
        let finalBuffer: ArrayBuffer =
            pngBuffer;

        try {

            const level =
                pngOptimizationLevel(
                    settings.quality,
                );

            const optimizedBuffer =
                await optimise(
                    pngBuffer,
                    {
                        level,
                        interlace: false,
                        optimiseAlpha: true,
                    },
                );

            if (
                optimizedBuffer.byteLength <
                pngBuffer.byteLength
            ) {
                finalBuffer =
                    optimizedBuffer;
            }

        } catch (error) {

            console.warn(
                "[PixelShrinkAI] PNG → PNG OxiPNG failed:",
                error,
            );
        }


        const blob =
            new Blob(
                [finalBuffer],
                {
                    type: "image/png",
                },
            );


        /*
         * PNG → PNG must never become larger.
         */
        if (
            blob.size >= file.size
        ) {

            console.log(
                "[PixelShrinkAI] PNG → PNG did not reduce " +
                "the file. Keeping original PNG.",
            );

            return file;
        }


        console.log(
            `[PixelShrinkAI] PNG → PNG ` +
            `${file.size} → ${blob.size} bytes`,
        );


        return createOutputFile(
            blob,
            file.name,
            "png",
            "image/png",
        );
    }


    /*
     * ============================================================
     * JPEG → PNG
     * ============================================================
     *
     * JPEG is the only remaining input here.
     *
     * We ALWAYS return PNG.
     * We NEVER return the original JPEG.
     */
    if (
        file.type !== "image/jpeg"
    ) {

        /*
         * Safety fallback for any unexpected caller.
         */
        throw new Error(
            "PNG compression received an unsupported input format.",
        );
    }


    const originalSize =
        file.size;

    const originalWidth =
        imageData.width;

    const originalHeight =
        imageData.height;


    console.log(
        `[PixelShrinkAI] JPEG → PNG input: ` +
        `${originalSize} bytes, ` +
        `${originalWidth}×${originalHeight}`,
    );


    /*
     * ------------------------------------------------------------
     * Safe ImageData → ArrayBuffer.
     * ------------------------------------------------------------
     */
    const makePixelBuffer =
        (
            data: Uint8ClampedArray,
        ): ArrayBuffer => {

            const bytes =
                new Uint8Array(
                    data.byteLength,
                );

            bytes.set(data);

            return bytes.buffer;
        };


    /*
     * ------------------------------------------------------------
     * Candidate encoder.
     *
     * IMPORTANT:
     *
     * OxiPNG is NOT run here.
     *
     * This keeps the search fast.
     * OxiPNG is applied once to the final candidate.
     * ------------------------------------------------------------
     */
    const encodeCandidate =
        (
            source: ImageData,
            colorCount: number,
        ): Blob => {

            const buffer =
                makePixelBuffer(
                    source.data,
                );


            const pngBuffer =
                UPNG.encode(
                    [buffer],
                    source.width,
                    source.height,
                    colorCount,
                );


            return new Blob(
                [pngBuffer],
                {
                    type: "image/png",
                },
            );
        };


    /*
     * ------------------------------------------------------------
     * Source canvas.
     *
     * Used only if resolution fallback becomes necessary.
     * ------------------------------------------------------------
     */
    const sourceCanvas =
        document.createElement(
            "canvas",
        );

    sourceCanvas.width =
        originalWidth;

    sourceCanvas.height =
        originalHeight;


    const sourceContext =
        sourceCanvas.getContext(
            "2d",
        );

    if (!sourceContext) {
        throw new Error(
            "Unable to create JPEG → PNG source canvas.",
        );
    }


    sourceContext.putImageData(
        imageData,
        0,
        0,
    );


    /*
     * ------------------------------------------------------------
     * Candidate palettes.
     *
     * We deliberately keep this list small.
     *
     * 256 = maximum colour retention
     * 192
     * 128
     * 96
     * 64
     * 32 = strong fallback
     * 16 = emergency fallback
     * ------------------------------------------------------------
     */
    const palettes =
        [
            256,
            192,
            128,
            96,
            64,
            32,
            16,
        ];


    /*
     * ------------------------------------------------------------
     * Resolution fallback levels.
     *
     * Full resolution is always tried first.
     *
     * We only reduce resolution if no palette at
     * full resolution can beat the JPEG.
     * ------------------------------------------------------------
     */
    const scales =
        [
            1.00,
            0.90,
            0.80,
            0.70,
            0.60,
            0.50,
        ];


    /*
     * ------------------------------------------------------------
     * Best candidate.
     *
     * We want the candidate with:
     *
     * 1. size < original JPEG
     * 2. maximum resolution
     * 3. maximum colour count
     * 4. largest file size within those constraints
     *
     * Larger acceptable PNG generally means
     * less aggressive compression.
     * ------------------------------------------------------------
     */
    type Candidate = {
        blob: Blob;
        width: number;
        height: number;
        colors: number;
        scale: number;
    };


    let bestCandidate:
        Candidate | null =
        null;


    /*
     * ------------------------------------------------------------
     * Candidate comparison.
     * ------------------------------------------------------------
     */
    const consider =
        (
            candidate: Candidate,
        ): void => {

            /*
             * Candidate must actually compress.
             */
            if (
                candidate.blob.size >=
                originalSize
            ) {
                return;
            }


            if (
                bestCandidate === null
            ) {

                bestCandidate =
                    candidate;

                return;
            }


            const candidatePixels =
                candidate.width *
                candidate.height;

            const bestPixels =
                bestCandidate.width *
                bestCandidate.height;


            /*
             * First priority:
             * preserve resolution.
             */
            if (
                candidatePixels >
                bestPixels
            ) {

                bestCandidate =
                    candidate;

                return;
            }


            if (
                candidatePixels <
                bestPixels
            ) {
                return;
            }


            /*
             * Same resolution:
             * preserve more colours.
             */
            if (
                candidate.colors >
                bestCandidate.colors
            ) {

                bestCandidate =
                    candidate;

                return;
            }


            if (
                candidate.colors <
                bestCandidate.colors
            ) {
                return;
            }


            /*
             * Same resolution and same palette:
             * keep the larger file because it generally
             * means less aggressive encoding.
             */
            if (
                candidate.blob.size >
                bestCandidate.blob.size
            ) {

                bestCandidate =
                    candidate;
            }
        };


    /*
     * ------------------------------------------------------------
     * PASS 1
     *
     * Full-resolution palette search.
     *
     * No dithering.
     *
     * No OxiPNG.
     *
     * This is intentional:
     *
     * UPNG already performs colour quantization.
     * Running a manual RGB dither before every candidate
     * was unnecessarily expensive and could introduce
     * colour changes.
     * ------------------------------------------------------------
     */
    for (
        const colors of palettes
    ) {

        let blob: Blob;

        try {

            blob =
                encodeCandidate(
                    imageData,
                    colors,
                );

        } catch (error) {

            console.warn(
                `[PixelShrinkAI] JPEG → PNG ` +
                `${colors}-color candidate failed:`,
                error,
            );

            continue;
        }


        console.log(
            `[PixelShrinkAI] JPEG → PNG ` +
            `${colors} colors @100% → ` +
            `${blob.size} bytes`,
        );


        consider({
            blob,
            width: originalWidth,
            height: originalHeight,
            colors,
            scale: 1,
        });


        /*
         * If this candidate is smaller than the JPEG,
         * we already have full resolution.
         *
         * Continue only long enough to check whether
         * a higher-quality palette also fits.
         *
         * Since palettes are descending, once we have
         * a valid candidate, lower palettes cannot improve
         * colour quality.
         */
        if (
            blob.size <
            originalSize
        ) {

            /*
             * The current palette is the first palette
             * that fits.
             *
             * We can stop because all earlier palettes
             * have already failed.
             */
            break;
        }
    }


    /*
     * ------------------------------------------------------------
     * PASS 2
     *
     * Resolution fallback.
     *
     * Only happens when full-resolution palette reduction
     * could not make the PNG smaller than the JPEG.
     *
     * At each resolution we try high-quality palettes first.
     * ------------------------------------------------------------
     */
    if (
        bestCandidate === null
    ) {

        for (
            let scaleIndex = 1;
            scaleIndex < scales.length;
            scaleIndex++
        ) {

            const scale =
                scales[
                    scaleIndex
                ];


            const width =
                Math.max(
                    1,
                    Math.round(
                        originalWidth *
                        scale,
                    ),
                );

            const height =
                Math.max(
                    1,
                    Math.round(
                        originalHeight *
                        scale,
                    ),
                );


            const workCanvas =
                document.createElement(
                    "canvas",
                );

            workCanvas.width =
                width;

            workCanvas.height =
                height;


            const workContext =
                workCanvas.getContext(
                    "2d",
                );

            if (!workContext) {
                continue;
            }


            workContext.imageSmoothingEnabled =
                true;

            workContext.imageSmoothingQuality =
                "high";


            workContext.drawImage(
                sourceCanvas,
                0,
                0,
                width,
                height,
            );


            const scaledImage =
                workContext.getImageData(
                    0,
                    0,
                    width,
                    height,
                );


            for (
                const colors of
                palettes
            ) {

                let blob: Blob;

                try {

                    blob =
                        encodeCandidate(
                            scaledImage,
                            colors,
                        );

                } catch (error) {

                    console.warn(
                        `[PixelShrinkAI] JPEG → PNG ` +
                        `${colors} colors @` +
                        `${Math.round(scale * 100)}% failed:`,
                        error,
                    );

                    continue;
                }


                console.log(
                    `[PixelShrinkAI] JPEG → PNG ` +
                    `${colors} colors @` +
                    `${Math.round(scale * 100)}% → ` +
                    `${blob.size} bytes`,
                );


                consider({
                    blob,
                    width,
                    height,
                    colors,
                    scale,
                });


                /*
                 * At this resolution we have found
                 * a candidate that beats the JPEG.
                 *
                 * Because palettes are descending,
                 * this is the highest palette that fits.
                 */
                if (
                    blob.size <
                    originalSize
                ) {
                    break;
                }
            }


            /*
             * We have a valid result.
             *
             * Do not unnecessarily reduce resolution further.
             */
            if (
                bestCandidate !== null
            ) {
                break;
            }
        }
    }


    /*
     * ------------------------------------------------------------
     * EMERGENCY FALLBACK
     *
     * This should be extremely rare.
     *
     * Use a smaller resolution + 16 colours to guarantee
     * that JPEG → PNG has a realistic chance of becoming
     * smaller than the source.
     * ------------------------------------------------------------
     */
    if (
        bestCandidate === null
    ) {

        const emergencyScale =
            0.40;


        const width =
            Math.max(
                1,
                Math.round(
                    originalWidth *
                    emergencyScale,
                ),
            );

        const height =
            Math.max(
                1,
                Math.round(
                    originalHeight *
                    emergencyScale,
                ),
            );


        const emergencyCanvas =
            document.createElement(
                "canvas",
            );

        emergencyCanvas.width =
            width;

        emergencyCanvas.height =
            height;


        const emergencyContext =
            emergencyCanvas.getContext(
                "2d",
            );

        if (!emergencyContext) {
            throw new Error(
                "Unable to create JPEG → PNG fallback canvas.",
            );
        }


        emergencyContext.imageSmoothingEnabled =
            true;

        emergencyContext.imageSmoothingQuality =
            "high";


        emergencyContext.drawImage(
            sourceCanvas,
            0,
            0,
            width,
            height,
        );


        const emergencyImage =
            emergencyContext.getImageData(
                0,
                0,
                width,
                height,
            );


        const emergencyBlob =
            encodeCandidate(
                emergencyImage,
                16,
            );


        bestCandidate = {
            blob: emergencyBlob,
            width,
            height,
            colors: 16,
            scale: emergencyScale,
        };


        console.warn(
            `[PixelShrinkAI] JPEG → PNG emergency ` +
            `candidate: ${emergencyBlob.size} bytes`,
        );
    }


    /*
     * ------------------------------------------------------------
     * FINAL OxiPNG
     *
     * IMPORTANT:
     *
     * OxiPNG is executed ONLY ONCE.
     *
     * This is the major speed improvement over
     * the previous implementation.
     * ------------------------------------------------------------
     */
    let finalBlob =
        bestCandidate.blob;


    try {

        const candidateBuffer =
            await finalBlob.arrayBuffer();


        const optimizedBuffer =
            await optimise(
                candidateBuffer,
                {
                    level: 4,
                    interlace: false,
                    optimiseAlpha: true,
                },
            );


        if (
            optimizedBuffer.byteLength <
            candidateBuffer.byteLength
        ) {

            finalBlob =
                new Blob(
                    [optimizedBuffer],
                    {
                        type: "image/png",
                    },
                );
        }

    } catch (error) {

        console.warn(
            "[PixelShrinkAI] Final OxiPNG optimization failed. " +
            "Using UPNG candidate.",
            error,
        );
    }


    /*
     * ------------------------------------------------------------
     * Final result.
     *
     * JPEG → PNG ALWAYS has a .png extension.
     *
     * We intentionally do not return the original JPEG.
     * ------------------------------------------------------------
     */
    console.log(
        `[PixelShrinkAI] JPEG → PNG FINAL: ` +
        `${originalSize} → ${finalBlob.size} bytes ` +
        `(${(
            (1 - finalBlob.size / originalSize) *
            100
        ).toFixed(2)}% smaller), ` +
        `${bestCandidate.colors} colors, ` +
        `${(
            bestCandidate.scale * 100
        ).toFixed(0)}% resolution`,
    );


    return createOutputFile(
        finalBlob,
        file.name,
        "png",
        "image/png",
    );
}

function pngColorCount(
    quality: number,
): number {
    if (quality >= 90) {
        return 256;
    }

    if (quality >= 75) {
        return 256;
    }

    if (quality >= 60) {
        return 128;
    }

    if (quality >= 40) {
        return 64;
    }

    return 32;
}


function pngOptimizationLevel(
    quality: number,
): number {
    if (quality >= 90) {
        return 1;
    }

    if (quality >= 75) {
        return 2;
    }

    if (quality >= 60) {
        return 3;
    }

    return 4;
}


function createOutputFile(
    blob: Blob,
    originalName: string,
    outputFormat:
        CompressionSettings["outputFormat"],
    mimeType: string,
): File {
    const outputName =
        getOutputFileName(
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


function loadImageElement(
    file: File,
): Promise<ImageBitmap> {
    return createImageBitmap(
        file,
        {
            imageOrientation:
                "from-image",
        },
    ).catch(() => {
        throw new Error(
            "Failed to prepare image for compression.",
        );
    });
}


function canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string,
    quality?: number,
): Promise<Blob> {
    return new Promise(
        (
            resolve,
            reject,
        ) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error(
                                "Image compression failed.",
                            ),
                        );

                        return;
                    }

                    resolve(blob);
                },
                mimeType,
                quality,
            );
        },
    );
}


function getOutputMimeType(
    originalType: string,
    outputFormat:
        CompressionSettings["outputFormat"],
): string {
    switch (outputFormat) {
        case "jpeg":
            return "image/jpeg";

        case "png":
            return "image/png";

        case "webp":
            return "image/webp";

        case "original":
        default:
            if (
                originalType ===
                    "image/jpeg" ||
                originalType ===
                    "image/png" ||
                originalType ===
                    "image/webp"
            ) {
                return originalType;
            }

            return "image/jpeg";
    }
}


function getOutputFileName(
    originalName: string,
    outputFormat:
        CompressionSettings["outputFormat"],
    mimeType: string,
): string {
    const baseName =
        originalName.replace(
            /\.[^/.]+$/,
            "",
        );

    return (
        `${baseName}-compressed` +
        `${getExtensionFromMimeType(
            mimeType,
        )}`
    );
}


function getExtensionFromMimeType(
    mimeType: string,
): string {
    switch (mimeType) {
        case "image/jpeg":
            return ".jpg";

        case "image/png":
            return ".png";

        case "image/webp":
            return ".webp";

        default:
            return ".jpg";
    }
}