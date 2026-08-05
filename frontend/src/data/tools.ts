import {
    Minimize2,
    Expand,
    Crop,
    RefreshCw,
    Droplets,
    Image,
    FileImage,
    Layers3
} from "lucide-preact"

export type ToolStatus = "live" | "coming" | "planned";

export interface Tool {
    id:string;
    title:string;
    description:string;

    icon:any;

    status: ToolStatus;

    gradient: string;

    href:string

}

export const TOOLS: Tool[] = [
  {
    id: "compressor",
    title: "Image Compressor",
    description: "Reduce image size without losing quality.",
    icon: Minimize2,
    status: "live",
    gradient: "from-blue-500 via-indigo-500 to-pink-500",
    href: "#compressor",
  },

  {
    id: "resizer",
    title: "Image Resizer",
    description: "Resize images to any dimensions.",
    icon: Expand,
    status: "coming",
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
    href: "#",
  },

  {
    id: "crop",
    title: "Crop Images",
    description: "Crop images quickly and accurately.",
    icon: Crop,
    status: "coming",
    gradient: "from-orange-500 via-amber-500 to-yellow-500",
    href: "#",
  },

  {
    id: "converter",
    title: "Convert Formats",
    description: "Convert JPG, PNG, WebP and AVIF.",
    icon: RefreshCw,
    status: "coming",
    gradient: "from-purple-500 via-violet-500 to-fuchsia-500",
    href: "#",
  },

  {
    id: "watermark",
    title: "Watermark Images",
    description: "Add image or text watermarks.",
    icon: Droplets,
    status: "coming",
    gradient: "from-pink-500 via-rose-500 to-red-500",
    href: "#",
  },

  {
    id: "background",
    title: "Remove Background",
    description: "Remove backgrounds instantly.",
    icon: Image,
    status: "planned",
    gradient: "from-green-500 via-emerald-500 to-teal-500",
    href: "#",
  },

  {
    id: "metadata",
    title: "Remove Metadata",
    description: "Protect privacy by removing EXIF data.",
    icon: FileImage,
    status: "planned",
    gradient: "from-teal-500 via-cyan-500 to-sky-500",
    href: "#",
  },

  {
    id: "batch",
    title: "Batch Processing",
    description: "Compress multiple images together.",
    icon: Layers3,
    status: "planned",
    gradient: "from-indigo-500 via-purple-500 to-violet-500",
    href: "#",
  },
];