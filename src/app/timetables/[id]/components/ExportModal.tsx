"use client";

import { FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ExportModalProps {
    isOpen: boolean;
    timetableName: string;
    onClose: () => void;
    onExport: (format: "pdf" | "excel") => void;
}

export default function ExportModal({
                                        isOpen,
                                        onClose,
                                        onExport,
                                    }: ExportModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Export Timetable</DialogTitle>
                </DialogHeader>

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
                    </button>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
