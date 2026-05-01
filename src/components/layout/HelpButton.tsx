"use client";

import { useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HelpButton() {
    const router = useRouter();

    return (
        <Button
            variant="default"
            size="icon"
            onClick={() => router.push("/guide")}
            className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-slate-950 text-white shadow-xl shadow-slate-950/25 hover:bg-slate-800"
            aria-label="Open guide"
            title="Guide"
        >
            <HelpCircle className="h-5 w-5" />
        </Button>
    );
}