import {useState} from "preact/hooks";
import UploadView from "./views/UploadView";

export type WorkspaceStage = 
  | "upload"
  | "preview"
  | "processing"
  | "download";


  export default function WorkspaceBody() {
    const [stage] = useState<WorkspaceStage>("upload");
    function renderView() {
    switch (stage) {
        case "upload":
          return <UploadView />;
        
        case "preview":
          return <div>Preview View</div>


        case "processing":
          return <div>Processing View</div>

        case "download":
          return <div>Download View</div>
        
          default:
          return null;
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
      </div>
    );
}