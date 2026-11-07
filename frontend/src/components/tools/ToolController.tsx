
import { useState } from "preact/hooks";
import { ArrowRight, ImagePlus } from "lucide-preact";
import ToolLauncher from "./ToolLauncher";
import { TOOL_REGISTRY, type ToolId } from "./ToolRegistry";

export default function ToolController() {
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);

  const handleToolSelect = (tool: ToolId) => {
    setSelectedTool(tool);
  };

  const handleStartTool = () => {
    if (!selectedTool) return;

    const tool = TOOL_REGISTRY.find(
      (item) => item.id === selectedTool,
    );

    if (!tool || tool.status !== "live") return;

    window.dispatchEvent(
      new CustomEvent("pixelshrinkai:tool-activated", {
        detail: { tool: selectedTool },
      }),
    );
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <ToolLauncher
        activeTool={selectedTool}
        onToolChange={handleToolSelect}
      />

      <button
        type="button"
        onClick={handleStartTool}
        disabled={!selectedTool}
        className="
          group inline-flex min-h-12 w-full items-center justify-center gap-2
          rounded-xl bg-linear-to-r from-blue-600 to-indigo-600
          px-5 py-3 text-sm font-semibold text-white
          shadow-lg shadow-blue-600/20 transition-all
          hover:-translate-y-0.5 hover:shadow-xl
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-[#E9B84C] focus-visible:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-45
          disabled:hover:translate-y-0 disabled:hover:shadow-lg
        "
      >
        <ImagePlus size={18} aria-hidden="true" />
        <span>Select Image</span>
        <ArrowRight
          size={16}
          aria-hidden="true"
          className="transition-transform group-hover:translate-x-0.5"
        />
      </button>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Choose a tool to get started
      </p>
    </div>
  );
}
