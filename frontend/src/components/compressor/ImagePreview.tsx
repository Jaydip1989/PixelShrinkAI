---
interface Props {
    imageUrl?: string;
    alt?:string;
}

const {imageUrl = "", 
alt= "Uploaded Image",
} = Astro.props;
---

<div
        class="
            flex
            h-[220px]
            items-center
            justify-center
            overflow-hidden
            rounded-2xl
            bg-slate-200
            dark:bg-slate-800
        "
    >
    {
        imageUrl? (
            <img
                src = {imageUrl}
                alt = {alt}
                class = "h-full w-full object-contain"
            />
        ):(
            <span class="text-slate-400"
            >
                No Preview
            </span>
        )
    }
</div>
