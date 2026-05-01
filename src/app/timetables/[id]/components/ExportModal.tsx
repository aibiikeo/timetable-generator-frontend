"use client";

import { FileSpreadsheet, FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ExportModalProps {
    isOpen: boolean;
    timetableName: string;
    onClose: () => void;
    onExport: (format: "pdf" | "excel") => void;
}

export default function ExportModal({
                                        isOpen,
                                        timetableName,
                                        onClose,
                                        onExport,
                                    }: ExportModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">
                            Export Timetable
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Choose export format for “{timetableName}”.
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => onExport("pdf")}
                        className="rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:bg-accent"
                    >
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
                            <FileText className="h-5 w-5" />
                        </div>

                        <div className="font-medium">PDF</div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Export as printable timetable document.
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => onExport("excel")}
                        className="rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:bg-accent"
                    >
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <FileSpreadsheet className="h-5 w-5" />
                        </div>

                        <div className="font-medium">Excel</div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Export as spreadsheet for editing and sharing.
                        </p>
                    </button>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}