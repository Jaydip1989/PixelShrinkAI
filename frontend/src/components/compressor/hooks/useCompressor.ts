import {useRef, useState} from "preact/hooks";
import type { CompressionSettings,ImageAsset} from "../../../types/image";
import { loadImage } from "../../../utils/imageHelpers";
import { validateImage } from "../../../utils/fileValidation";

export function useCompressor() {
    const [image, setImage] = useState<ImageAsset | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState("");
    const [settings, setSettings] = useState<CompressionSettings>({
        quality:80,
        outputFormat: "original",
    });
    async function selectImage() {
        fileInputRef.current?.click();
    }

    async function handleFileChange(
        event: Event
    ){
        const input = event.target as HTMLInputElement;

        if(!input.files?.length) return;

        const file = input.files[0];
        
        const validation = validateImage(file);

        if (!validation.valid) {
            setImage(null)
            setError(validation.message); 
            return;
        }

        setError("");

        try {
            const loadedImage = await loadImage(file);

            setImage(loadedImage);

            input.value = "";
        } catch {
            setError("Failed to load image.");
        }
    }

    return {
        image,
        error,

        settings,
        setSettings,

        fileInputRef,

        selectImage,
        handleFileChange,
    };
}