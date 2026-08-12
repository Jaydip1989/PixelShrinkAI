import { useLayoutEffect } from "preact/hooks";
import { useImageTool } from "./hooks/useImageTool";
import WorkspaceBody from "./WorkspaceBody";

export default function CompressorHero() {
  const {
    step,
    setStep,
    image,
    compressedImage,
    error,
    settings,
    setSettings,
    isCompressing,
    fileInputRef,
    selectImage,
    handleFileChange,
    compressImage
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
        compressedImage = {compressedImage}
        error={error}
        settings={settings}
        setSettings={setSettings}
        selectImage={selectImage}
        handleFileChange={handleFileChange}
        compressImage = {compressImage}
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