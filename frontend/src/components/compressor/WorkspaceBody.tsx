import type { ImageAsset } from "../../types/image";
import UploadView from "./views/UploadView";
import PreviewView from "./views/PreviewView";
import ProcessingView from "./views/ProcessingView";
import DownloadView from "./views/DownloadView";

interface WorkspaceBodyProps {
  step: "upload" | "preview" | "processing" | "download";
  image: ImageAsset | null;
  error: string;
  settings: Parameters<typeof PreviewView>[0]["settings"];
  setSettings: Parameters<typeof PreviewView>[0]["setSettings"];
  
  selectImage: () => void;
  handleFileChange: (event: Event) => void;
}

export default function WorkspaceBody({
  step,
  image,
  error,
  settings,
  setSettings,
  
  selectImage,
  handleFileChange,
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
            settings={settings}
            setSettings={setSettings}
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
        return <DownloadView />;

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