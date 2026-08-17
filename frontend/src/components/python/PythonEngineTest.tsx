import { useEffect, useState } from "preact/hooks";

type EngineStatus = 
| "checking"
| "connected"
| "error";

export default function PythonEngineTest() {
    const [status, setStatus] = useState<EngineStatus>("checking");
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function checkPythonEngine() {
            try {
                const response = await fetch(
                    "http://127.0.0.1:8000/health"
                );
                if(!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const data = await response.json();
                
                setStatus("connected");
                setMessage(data.service);
            } catch (error) {
                console.error("Python engine connection failed:", error);
                setStatus("error");
                setMessage("Unable to connect to Python engine");
            }
        }
        checkPythonEngine();
    }, []);
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">
                Python Engine Test
            </h1>
            <div className="mt-4">
                {status === "checking" && (
                    <p className="text-slate-500">
                        Connecting to Python engine..
                    </p>
                )}

                {status === "connected" && (
                    <p className="font-semibold text-green-600">
                        🟢 Python Engine Connected
                    </p>
                )}
                {status === "error" && (
                    <p className="font-semibold text-red-600">
                        🔴 Python Engine Connection Failed
                    </p>
                )}
            </div>
            {message && (
                <p className="mt-2 text-sm text-slate-500">
                    {message}
                </p>
            )}
        </div>
    );
}