import { validateImage } from "../utils/fileValidation";
import { formatFileSize, getImageDimensions } from "../utils/imageHelpers";

const uploadZone = document.getElementById("upload-zone") as HTMLLabelElement | null;
const fileInput = document.getElementById("image-upload") as HTMLInputElement | null;
const errorText = document.getElementById("upload-error") as HTMLParagraphElement | null;

function showError(message: string) {
    if (!errorText) return;
    errorText.textContent = message;
    errorText?.classList.remove("hidden");
}

function clearError() {
    if (!errorText) return;
    errorText.textContent = "";
    errorText?.classList.add("hidden");
}

if (!uploadZone || !fileInput || !errorText) {
    console.warn("Image uploader elements not found.");
} else {
    initializeUploader();
}

function initializeUploader() {
    fileInput?.addEventListener("change", handleFileSelection);

    uploadZone?.addEventListener("dragover", handleDragOver);
    uploadZone?.addEventListener("dragleave", handleDragLeave);
    uploadZone?.addEventListener("drop", handleDrop);
}

function handleFileSelection(event: Event){
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) return;

    processFile(input.files[0]);
}

function handleDragOver(event: DragEvent) {
    event.preventDefault();

    uploadZone?.classList.add(
        "border-blue-500",
        "bg-blue-50",
        "dark:border-blue-400"
    );
}

function handleDragLeave(event: DragEvent) {
    event.preventDefault();

    uploadZone?.classList.remove(
        "border-blue-500",
        "bg-blue-50",
        "dark:border-blue-400"
    );
}

function handleDrop(event: DragEvent) {
    event.preventDefault();

    uploadZone?.classList.remove(
        "border-blue-500",
        "bg-blue-50",
        "dark:border-blue-400"
    );

    const files = event.dataTransfer?.files;

    if (!files?.length) return;

    processFile(files[0]);
}

async function processFile(file: File) {
    clearError();

    const validation = validateImage(file);

    if(!validation.valid) {
        showError(validation.message);
        return;
    }

    const dimensions = await getImageDimensions(file);

    console.log("File:", file.name);
    console.log("Size:", formatFileSize(file.size));
    console.log("Dimensions:", dimensions.width, "x", dimensions.height);
    console.log("Type:", file.type);

    // ImagePreview will be connected here next
}




