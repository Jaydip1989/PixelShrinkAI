console.log("ImageUploader loaded");
import { validateImage } from "../utils/fileValidation";
import {
    getImageDimensions,
    formatFileSize,
} from "../utils/imageHelpers";
import { setWorkspaceImage } from "./workspaceData";
import { setWorkspaceState } from "./workspaceState";

/* ======================================================
    DOM Elements
====================================================== */

const uploadZone = document.getElementById(
    "upload-zone"
) as HTMLLabelElement | null; 

const fileInput = document.getElementById(
    "file-input"
) as HTMLInputElement | null;

const selectButton = document.getElementById(
    " select-image-button"
) as HTMLButtonElement | null;

const errorText = document.getElementById(
    "upload-error"
) as HTMLParagraphElement | null;

/* ======================================================
    Uploaded Image Inetrface
====================================================== */

interface UploadedImage {
    file: File;
    previewURL: string;
    width: number;
    height: number;
}

/* ======================================================
    Initialization
====================================================== */
if (!uploadZone || !fileInput || !errorText) {
    console.warn("Image uploader elements not found.");
} else {
    initializeUploader();
}

function initializeUploader() {
    fileInput?.addEventListener("change", handleFileSelection);
    selectButton?.addEventListener("click", () => fileInput?.click());

    uploadZone?.addEventListener("dragover", handleDragOver);
    uploadZone?.addEventListener("dragleave", handleDragLeave);
    uploadZone?.addEventListener("drop", handleDrop);
}

/* ======================================================
    File Selection
====================================================== */

function handleFileSelection(event: Event) {
    const input = event.target as HTMLInputElement;

    if(!input.files?.length) return;

    processFile(input.files[0]);
}

/* ======================================================
    Drag & Drop
====================================================== */
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
    if(!files?.length) return;

    processFile(files[0])
}

/* ======================================================
    Main Upload Logic
====================================================== */
async function processFile(file: File) {
    clearError();

    const validation = validateImage(file);

    if (!validation.valid) {
        showError(validation.message);
        return;
    }

    const dimensions = await getImageDimensions(file);

    const uploadedImage:UploadedImage = {
        file,

        previewURL: URL.createObjectURL(file),

        width: dimensions.width,
        
        height: dimensions.height,
    };

    console.log(uploadedImage);
    updateImagePreview(uploadedImage);
    updateFileInfo(uploadedImage);

    const imageURL = URL.createObjectURL(file);

    setWorkspaceImage({
        file,

        url: imageURL,

        width: dimensions.width,

        height: dimensions.height,

        name: file.name,

        size:file.size,

        type:file.type
    });
    setWorkspaceState("preview");
}


/* ======================================================
    Image Preview
====================================================== */
function updateImagePreview(uploadedImage:UploadedImage) {
    const previewContainer = 
        document.getElementById("image-preview") as HTMLDivElement | null;
    
    const previewImage = 
        document.getElementById("preview-image") as HTMLImageElement | null;
    
    if(!previewContainer || !previewImage) return ;

    previewImage.src = uploadedImage.previewURL;
    previewImage.alt = uploadedImage.file.name;
    previewContainer.classList.remove('hidden');

}

/* ======================================================
    File Information
====================================================== */

function updateFileInfo(uploadedImage:UploadedImage) {

    const fileInfo = 
        document.getElementById("file-info") as HTMLDivElement | null;
    
    if(!fileInfo) return ;

    fileInfo.classList.remove("hidden");
    (
        document.getElementById("file-name") as HTMLParagraphElement
    ).textContent = uploadedImage.file.name;

    (
        document.getElementById("file-type") as HTMLParagraphElement
    ).textContent = uploadedImage.file.type;

    (
        document.getElementById("file-size") as HTMLParagraphElement
    ).textContent = formatFileSize(uploadedImage.file.size);

    (
        document.getElementById("image-dimensions") as HTMLParagraphElement
    ).textContent = `${uploadedImage.width} x ${uploadedImage.height}`;
}

/* ======================================================
    Error Handling
====================================================== */

function showError(message: string) {
    if (!errorText) return ;

    errorText.textContent = message;
    errorText.classList.remove("hidden");
}

function clearError() {
    if (!errorText) return;

    errorText.textContent = "";
    errorText.classList.add("hidden");
}