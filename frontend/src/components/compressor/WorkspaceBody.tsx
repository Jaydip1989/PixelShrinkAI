import {useEffect} from "preact/hooks";


import UploadView from "./views/UploadView";
import PreviewView from "./views/PreviewView";
import ProcessingView from "./views/ProcessingView";
import DownloadView from "./views/DownloadView";

import { useCompressor } from "./hooks/useCompressor";
import { useWorkspace } from "./hooks/useWorkspace";

export default function WorkspaceBody() { 
  const {step, setStep} = useWorkspace();
  const {
    image, 
    error, 
    fileInputRef, 
    selectImage, 
    handleFileChange
  } = useCompressor();

  useEffect(() =>{
    if (image && step === "upload") {
      setStep("preview");
    }
  }, [image, step, setStep]);

  function renderView() {
    switch (step) 
    {
        case "upload":
          return <UploadView 
            image={image}
            error = {error}
            onSelectImage={selectImage}/>;
        
        case "preview":
          return image ? (
            <PreviewView image={image} />
          ):(
            <UploadView 
              image = {image}
              error = {error}
              onSelectImage={selectImage}
            />
          );


        case "processing":
          return <ProcessingView/>;

        case "download":
          return <DownloadView />;
        
          default:
            return <UploadView 
              image={image}
              error = {error}
              onSelectImage={selectImage}/>;
      }
    }
  return(
    <div
      className="
        flex
        h-[380px]
        flex-col
      "
    >
      {renderView()}
      {/* Hidden file picker */}
      <input 
        ref = {fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}