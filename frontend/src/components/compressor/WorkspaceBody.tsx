import type { ImageAsset } from "../../types/image";
import UploadView from "./views/UploadView";
import PreviewView from "./views/PreviewView";
import ProcessingView from "./views/ProcessingView";
import DownloadView from "./views/DownloadView";

interface WorkspaceBodyProps {
  step: "upload" | "preview" | "processing" | "download";
  image: ImageAsset | null;
  compressedImage: ImageAsset | null;
  error: string;
  settings: Parameters<typeof PreviewView>[0]["settings"];
  setSettings: Parameters<typeof PreviewView>[0]["setSettings"];
  
  selectImage: () => void;
  handleFileChange: (event: Event) => void;
  compressImage: () => Promise<void>;
}

export default function WorkspaceBody({
  step,
  image,
  compressedImage,
  error,
  settings,
  setSettings,
  
  selectImage,
  handleFileChange,
  compressImage,
}: WorkspaceBodyProps) {
  function renderView() {
    switch (step) {
      case "upload":
        return (
          <UploadView image={image} error={error} onSelectImage={selectImage} 
          />
        );

      case "preview":
        return image ? (
          <PreviewView
            image={image}
            compressedImage = {compressedImage}
            settings={settings}
            setSettings={setSettings}
            onSelectAnother = {selectImage}
            onCompress={compressImage}
          />
        ) : (
          <UploadView
            image={image}
            error={error}
            onSelectImage={selectImage}
          />
        );

      case "processing":
        return <ProcessingView />;

      case "download":
        return image && compressedImage ? (
          <DownloadView 
            image = {image}
            compressedImage={compressedImage}
            onSelectAnother={selectImage}
          />
        ):(
          <UploadView 
            image = {image}
            error = {error}
            onSelectImage={selectImage}
          />
        );

      default:
        return (
          <UploadView
            image={image}
            error={error}
            onSelectImage={selectImage}
          />
        );
    }
  }

  return (
    <div className="flex flex-col">
      {renderView()}

    </div>
  );
}