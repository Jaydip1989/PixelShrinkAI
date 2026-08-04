export interface ImageAsset {
    file : File;
    previewUrl: string;

    name:string;
    type:string;
    size:number;

    width: number;
    height:number;
}

export interface ImageDimensions {
    width:number;
    height:number;
}

export type WorkspaceStep = 
    | "upload"
    | "preview"
    | "processing"
    | "download";