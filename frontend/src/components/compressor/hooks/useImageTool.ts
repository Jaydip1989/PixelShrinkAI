import {useRef, useState} from "preact/hooks";

import type {
    CompressionSettings,
    ImageAsset,
    WorkspaceStep,
} from "../../../types/image";

import {
    compressImage as createCompressedImage,
    loadImage
} from "../../../utils/imageHelpers";

import { validateImage } from "../../../utils/fileValidation";

export function useImageTool() {
    const [step, setStep] = useState<WorkspaceStep>("upload");
    const [image, setImage] = useState<ImageAsset | null>(null);
    const [compressedImage, setCompressedImage] = useState<ImageAsset | null>(null);

    const [error, setError] = useState("");
    const [isCompressing, setIsCompressing] = useState(false);

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
        setCompressedImage(null);

        try {
            const loadedImage = await loadImage(file);

            setImage(loadedImage);
            setStep("preview");
            input.value = "";
        } catch {
            setImage(null);
            setCompressedImage(null);
            setError("Failed to load map");
        }
    }
    async function compressImage(){
        if (!image || isCompressing) {
            return;
        }
        setError("");
        setIsCompressing(true);
        setStep("processing");

        try {
            const compressedFile = await createCompressedImage(
                image.file,
                settings,
            );

            const compressedAsset = await loadImage(compressedFile);

            setCompressedImage(compressedAsset);
            setStep("download");
        }catch{
            setError("Failed to compress image.");
            setStep("preview");
        }finally {
            setIsCompressing(false);
        }
    }
    function selectAnotherImage() {
    setImage(null);
    setError("");
    setStep("upload");

    fileInputRef.current?.click();
}
    return {
        step,
        setStep,
        image,
        compressedImage,
        error,
        settings,
        setSettings,
        isCompressing,
        fileInputRef,
        selectImage,
        selectAnotherImage,
        handleFileChange,
        compressImage
    };
}

