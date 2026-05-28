import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "AIU Timetable",
    icons: {
        icon: "/logo_aiu.png",
    },
};

export default function AiuTimetableLayout({ children }: { children: ReactNode }) {
    return children;
}
