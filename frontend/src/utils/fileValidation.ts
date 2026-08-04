import {
    MAX_FILE_SIZE,
    SUPPORTED_IMAGE_TYPES,
} from "./constants";

export interface ValidationResult {
    valid:boolean;
    message:string;
} 

export function validateImage(file: File): ValidationResult {
    if(!SUPPORTED_IMAGE_TYPES.includes(file.type as typeof SUPPORTED_IMAGE_TYPES[number])) {
        return {
            valid:false,
            message:
            "Unsupported file format. Please upload JPEG, JPG, PNG, WEBP or AVIF."
        };
    }
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            message:
                "File is too large. Maximum allowed size is 25 MB."
        };
    }
    
    return {
        valid: true,
        message: "",
    };
}
