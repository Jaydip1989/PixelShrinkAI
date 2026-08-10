import {useRef, useState} from "preact/hooks";

import type {
    CompressionSettings,
    ImageAsset,
    WorkspaceStep,
} from "../../../types/image";

import {loadImage} from "../../../utils/imageHelpers";
import { validateImage } from "../../../utils/fileValidation";

export function useImageTool() {
    const [step, setStep] = useState<WorkspaceStep>("upload");
    const [image, setImage] = useState<ImageAsset | null>(null);
    const [error, setError] = useState("");

    const [settings, setSettings] = useState<CompressionSettings>({
        quality: 80,
        outputFormat: "original",
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    function selectImage() {
        fileInputRef.current?.click();
    }


    async function handleFileChange(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];

        if(!file) {
            return;
        }

        const validation = validateImage(file);

        if (!validation.valid) {
            setImage(null);
            setError(validation.message);
            return;
        }

        setError("");

        try {
            const loadedImage = await loadImage(file);

            setImage(loadedImage);
            setStep("preview");
            input.value = "";
        } catch {
            setImage(null);
            setError("Failed to load map");
        }
    }

    return {
        step,
        setStep,
        image,
        error,
        settings,
        setSettings,
        fileInputRef,
        selectImage,
        handleFileChange,
    };
}

