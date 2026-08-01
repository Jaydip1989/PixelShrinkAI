export type WorkspaceState = 
    | "upload"
    | "preview"
    | "processing"
    | "download";

let currentState: WorkspaceState = "upload";

const listeners = new Set<(state: WorkspaceState) => void>();

export function getWorkspaceState(): WorkspaceState {
    return currentState;
}

export function setWorkspaceState(state: WorkspaceState) {
    if (currentState === state) return;

    currentState = state;

    listeners.forEach((listener) => listener(state));
}

export function subscribeWorkspaceState(
    listener: (state: WorkspaceState) => void
) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

