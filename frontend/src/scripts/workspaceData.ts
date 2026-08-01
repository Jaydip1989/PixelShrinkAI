export interface WorkspaceImage {
    file: File;
    url:string;
    width:number;
    height:number;
    name:string;
    size:number;
    type:string;
}

let currentImage: WorkspaceImage | null = null;

export function setWorkspaceImage(image: WorkspaceImage) {
    currentImage = image;
}

export function getWorkspaceImage() {
    return currentImage;
}

export function clearWorkspaceImage() {
    currentImage = null;
}