export const SUPPORTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/avif",
] as const;

export const MAX_FILE_SIZE = 25*1024*1025 ; // 25 MB

export const ACCEPT_ATTRIBUTE = ".jpg, .jpeg, .png, .webp, .avif";