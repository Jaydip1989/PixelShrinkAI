export type ToolId = 
    | "compressor"
    | "converter"
    | "ai-enhancer"
    | "resizer"
    | "editor"
    | "watermark-remover"
    | "background-remover"
    | "metadata-cleaner";

export type ToolStatus = "live" | "coming" | "planned";

export interface ToolDefinition {
    id: ToolId;
    name: string;
    status: ToolStatus;
}

export const TOOL_REGISTRY: readonly ToolDefinition[] = [
    {id: "compressor", name: "Compressor", status: "live"},
    {id: "converter", name: "Converter", status: "live"},
    {id: "ai-enhancer", name: "AI Enhancer", status: "coming"},
    {id: "resizer", name: "Resizer", status: "planned"},
    {id: "editor", name: "Editor", status: "planned"},
    {id: "watermark-remover", name: "Watermark Remover", status: "planned"},
    {id: "background-remover", name: "Background Remover", status: "planned"},
    {id: "metadata-cleaner", name: "Metadata Cleaner", status: "planned"},
];