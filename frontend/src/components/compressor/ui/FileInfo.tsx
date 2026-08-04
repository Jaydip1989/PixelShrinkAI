import type { ImageAsset } from "../../../types/image";
import { formatFileSize } from "../../../utils/imageHelpers";

interface FileInfoProps {
    image: ImageAsset | null;
}

export default function FileInfo({
    image,
}: FileInfoProps) {
    if(!image) return null;

    return (
        
        <div
            className="
                mt-6
                rounded-3xl
                border
                border-slate-200
                bg-slate-50
                p-6
                dark:border-slate-700
                dark:bg-slate-900
            "
            >
                <h3
                    className="
                        mb-5,
                        text-lg,
                        font-semibold,
                        text-slate-900,
                        dark:text-white;
                    "
                >
                    File Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                            Filename
                        </p>

                        <p
                            className="mt-1 
                            break-all 
                            font-medium
                            text-slate-900 
                            dark:text-white
                            "
                        >
                            {image.name}
                        </p>
                    </div>

                    <div>
                        
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                            Format
                        </p>

                        <p
                            className="mt-1 font-medium text-slate-900 dark:text-white"
                        >
                            {image.type}
                        </p>
                    </div>

                
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                            File Size
                        </p>

                        <p
                            className="mt-1 font-medium text-slate-900 dark:text-white"
                        >
                            {formatFileSize(image.size)}
                        </p>
                    </div>

                
                    <div>
                        <p className="text-xs uppercase text-slate-500">
                            Dimensions
                        </p>

                        <p
                            className="mt-1 font-medium text-slate-900 dark:text-white"
                        >
                            {image.width} x {image.height}
                        </p>
                        
                    </div>
                
            </div>
            
        </div>

    );
}




        