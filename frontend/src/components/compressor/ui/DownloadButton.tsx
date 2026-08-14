interface DownloadButtonProps {
    file: File;
}

export default function DownloadButton({
    file,
}: DownloadButtonProps){
    function handleDownload() {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");

        link.href = url;
        link.download = file.name;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }
    return (
        <button
            type="button"
            onClick = {handleDownload}
            className="
                flex-1
                rounded-xl
                bg-gradient-to-r
                from-blue-600
                via-indigo-500
                to-pink-500
                px-5
                py-3
                text-sm
                font-semibold
                text-white
                transition
                hover:scale-[1.01]
            "
        >
            Download Compressed Image
        </button>
    );
}