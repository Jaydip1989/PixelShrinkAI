import { useLayoutEffect } from "preact/hooks";
import { useImageTool } from "./hooks/useImageTool";
import WorkspaceBody from "./WorkspaceBody";

export default function CompressorHero() {
  const {
    step,
    image,
    error,
    settings,
    setSettings,
    selectImage,
    handleFileChange,
    fileInputRef,
  } = useImageTool();

  useLayoutEffect(() => {
    window.dispatchEvent(
      new CustomEvent("pixelshrinkai:tool-state", {
        detail: { step },
      }),
    );
  }, [step]);


  return (
    <>
      <WorkspaceBody
        step={step}
        image={image}
        error={error}
        settings={settings}
        setSettings={setSettings}
        selectImage={selectImage}
        handleFileChange={handleFileChange}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}