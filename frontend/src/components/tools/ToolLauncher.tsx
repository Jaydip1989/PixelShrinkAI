import { ChevronDown, Check, Clock3 } from "lucide-preact";
import { useState } from "preact/hooks";
import  { TOOL_REGISTRY , type ToolId } from "./ToolRegistry";

interface ToolLauncherProps {
    activeTool: ToolId | null;
    onToolChange: (tool: ToolId) => void;
}

export default function ToolLauncher({
    activeTool,
    onToolChange,
}: ToolLauncherProps) {
    const [open, setOpen] = useState(false);

    const activeToolLabel = 
        TOOL_REGISTRY.find((tool) => tool.id === activeTool)?.name ?? "Our Tools";
    
    const handleToolSelect = (toolId: ToolId) => {
        const tool = TOOL_REGISTRY.find((item) => item.id === toolId);

        if (!tool || tool.status !== "live"){
            return;
        }
        
        onToolChange(tool.id);
        setOpen(false);
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200
                bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition 
                hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
                <span>{activeToolLabel}</span>
                <ChevronDown
                    size={18}
                    strokeWidth={2}
                    className={`transition-transform duration-200 ${ 
                        open ? "rotate-180": ""
                    }`}
                />
            </button>
            {open && (
                <div className="absolute left-0 right-0 z-50 mt-0 max-h-[min(18rem,60vh)] overflow-y-auto 
                overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl 
                dark:border-slate-700 dark:bg-slate-900"
                >
                {TOOL_REGISTRY.map((tool) => {
                    const isLive = tool.status === "live";
                    const isActive = tool.id === activeTool;

                    return (
                    <button
                        key={tool.id}
                        type="button"
                        disabled={!isLive}
                        onClick={() => handleToolSelect(tool.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition 
                            ${
                                isLive
                                    ? "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                    : "cursor-not-allowed text-slate-400 dark:text-slate-600"
                        }`}
                    >
                        <span className="flex w-5 items-center justify-center">
                        {isActive && (
                            <Check
                            size={16}
                            strokeWidth={2.5}
                            className="text-blue-600 dark:text-blue-400"
                            />
                        )}
                        </span>

                        <span className="flex-1">{tool.name}</span>

                        {!isLive && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock3 size={13} strokeWidth={2} />
                            {tool.status === "coming" ? "Soon" : "Planned"}
                        </span>
                        )}
                    </button>
                    );
                })}
                </div>
            )}
        </div>
    );
}