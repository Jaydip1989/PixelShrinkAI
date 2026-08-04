import {useState} from "preact/hooks";
import type { WorkspaceStep } from "../../../types/image";

export function useWorkspace() {
    const [step, setStep] = useState<WorkspaceStep>("upload");

    return {
        step,
        setStep
    };
}