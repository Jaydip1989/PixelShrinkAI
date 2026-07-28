(function (){
    const storageKey = "theme";
    const savedTheme = localStorage.getItem(storageKey);

    if (savedTheme) {
        document.documentElement.classList.toggle(
            "dark",
            savedTheme === "dark"
        );
    } else {
        const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;

        document.documentElement.classList.toggle("dark", prefersDark);
    }
})();