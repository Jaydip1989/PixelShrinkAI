import { subscribeWorkspaceState } from "./workspaceState";
import type { WorkspaceState } from "./workspaceState";

const states: Record<WorkspaceState, string> = {
    upload:"upload-state",
    preview:"preview-state",
    processing:"processing-state",
    download:"download-state",
};

export function initializeWorkspace() {
    subscribeWorkspaceState(updateWorkspace);

    updateWorkspace("upload");
}

function updateWorkspace(state: WorkspaceState) {
    Object.entries(states).forEach(([key , id]) =>{
        const element = document.getElementById(id);

        if(!element) return;

        element.classList.toggle("hidden", key !== state);
    });
}