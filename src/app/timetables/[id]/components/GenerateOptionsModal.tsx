"use client";

import type { ReactNode } from "react";
import { Loader2, PlusCircle, Sparkles, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { GenerationMode } from "@/lib/types";

interface GenerateOptionsModalProps {
    isOpen: boolean;
    timetableName: string;
    loading?: boolean;
    loadingMode?: GenerationMode | null;
    onClose: () => void;
    onGenerate: (mode: GenerationMode) => void;
    onStop?: () => void;
}

export default function GenerateOptionsModal({
    isOpen,
    loading = false,
    loadingMode = null,
    onClose,
    onGenerate,
    onStop,
}: GenerateOptionsModalProps) {
    const renderIcon = (mode: GenerationMode, fallback: ReactNode) => {
        if (loading && loadingMode === mode) {
            return <Loader2 className="h-5 w-5 animate-spin" />;
        }
        return fallback;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Generate Timetable</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => onGenerate("NEW")}
                        className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                {renderIcon("NEW", <Sparkles className="h-5 w-5" />)}
                            </div>
                            <div>
                                <div className="font-medium">Full generation</div>
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => onGenerate("APPEND")}
                        className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                                {renderIcon("APPEND", <PlusCircle className="h-5 w-5" />)}
                            </div>
                            <div>
                                <div className="font-medium">Partial generation</div>
                            </div>
                        </div>
                    </button>
                </div>

                <DialogFooter>
                    {loading && (
                        <Button type="button" variant="outline" onClick={onStop}>
                            <Square className="h-4 w-4" />
                            Stop
                        </Button>
                    )}
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
