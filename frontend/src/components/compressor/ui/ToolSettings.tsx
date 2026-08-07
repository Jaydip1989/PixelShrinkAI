import type { OutputFormat } from "../../../types/image";

interface ToolSettingsProps {
  quality: number;
  outputFormat: OutputFormat;

  onQualityChange: (quality:number) => void;
  onOutputFormatChange: (format:OutputFormat) => void;
}

export default function ToolSettings({
    quality,
    outputFormat,
    onQualityChange,
    onOutputFormatChange,
}: ToolSettingsProps) {
    return (
    <section className="rounded-xl bg-red-500 p-6 text-white">
        <h2 className="text-2xl font-bold">
            ToolSettings is rendering
        </h2>
    </section>
);
}