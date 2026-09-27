 import { useState } from "preact/hooks";
 import ToolLauncher from "./ToolLauncher";
 import type { ToolId } from "./ToolRegistry";

 export default function ToolController() {
    const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);
    

    const handleToolSelect = (tool: ToolId) => {
        setSelectedTool(tool);
    };

    const handleStartTool = () => {
        if (!selectedTool) {
            return;
        }
        window.dispatchEvent(
            new CustomEvent("pixelshrinkai:tool-activated", {
                detail: {
                    tool: selectedTool,
                },
            }),
        );
        
    };
    return (
        <div className="flex flex-col">
            <ToolLauncher 
                activeTool={selectedTool}
                onToolChange={handleToolSelect}
            />
            <button
                type="button"
                onClick={handleStartTool}
                className="
                    w-full
                    rounded-2xl
                    bg-linear-to-r
                    from-blue-600
                    via-indigo-500
                    to-pink-500
                    px-6 py-3
                    font-semibold
                    text-white
                    transition
                    duration-300
                    hover:scale-[1.02]
                "
            >
                Select Image
            </button>
        </div>
    );
 }