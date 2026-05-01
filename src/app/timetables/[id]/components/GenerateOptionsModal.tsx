"use client";

import { Loader2, Play, PlusCircle, RefreshCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GenerationMode } from "@/lib/types";

interface GenerateOptionsModalProps {
    isOpen: boolean;
    timetableName: string;
    loading?: boolean;
    onClose: () => void;
    onGenerate: (mode: GenerationMode) => void;
}

export default function GenerateOptionsModal({
                                                 isOpen,
                                                 timetableName,
                                                 loading = false,
                                                 onClose,
                                                 onGenerate,
                                             }: GenerateOptionsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">
                            Generate Timetable
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Choose how to generate lessons for “{timetableName}”.
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close modal"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-3">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => onGenerate("NEW")}
                        className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <RefreshCcw className="h-5 w-5" />
                                )}
                            </div>

                            <div>
                                <div className="font-medium">
                                    Generate from scratch
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Clear generated lessons and create a new schedule.
                                </p>
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
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <PlusCircle className="h-5 w-5" />
                                )}
                            </div>

                            <div>
                                <div className="font-medium">
                                    Append missing lessons
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Keep existing lessons and place only missing ones.
                                </p>
                            </div>
                        </div>
                    </button>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        disabled={loading}
                        onClick={() => onGenerate("NEW")}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                        Generate
                    </Button>
                </div>
            </div>
        </div>
    );
}