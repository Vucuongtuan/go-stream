"use client";

import { useThemeStore } from "@/store/themeStore";
import { ChevronUp } from "lucide-react";

export default function ScrollToTop() {
    // const {theme} = useThemeStore();
    const handleScrollToTop = () => 
        window.scrollTo({ top: 0, behavior: "smooth" });

    return (
        <button
            onClick={handleScrollToTop}
            className="fixed bottom-4 right-4 p-3 rounded-full bg-zinc-800 text-white shadow-lg hover:bg-zinc-700 transition-colors"
        >
            <ChevronUp />
        </button>
    );
}