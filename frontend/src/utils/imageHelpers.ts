export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;

    const kb = bytes/ 1024;

    if (kb < 1024) {
        return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024 ;

    return `${mb.toFixed(2)} MB`;
}

export async function getImageDimensions(
    file: File
): Promise < {width: number; height: number} > {
    return new Promise((resolve, reject) =>{
        const image = new Image();

        image.onload = () => {
            resolve({
                width:image.width,
                height:image.height,
            });

            URL.revokeObjectURL(image.src);
        };

        image.onerror = reject;

        image.src = URL.createObjectURL(file);
    });
}