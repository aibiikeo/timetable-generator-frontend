import type { AssignmentResponse } from "./types";

export type NormalizedPlacementStatus = "SCHEDULED" | "PARTIAL" | "UNPLACED";

export function normalizePlacementStatus(status?: string | null): NormalizedPlacementStatus {
    const normalized = String(status || "").toUpperCase();

    if (
        normalized === "SCHEDULED" ||
        normalized === "PLACED" ||
        normalized === "FULLY_SCHEDULED" ||
        normalized === "COMPLETE"
    ) {
        return "SCHEDULED";
    }

    if (
        normalized === "PARTIAL" ||
        normalized === "PARTIALLY_SCHEDULED" ||
        normalized === "PARTIALLY_PLACED"
    ) {
        return "PARTIAL";
    }

    return "UNPLACED";
}

export function getAssignmentUnplacedLessons(assignment: AssignmentResponse) {
    const requiredBlocks =
        assignment.requiredLessonBlocksCount ?? assignment.requiredLessonsCount ?? 0;
    const placedBlocks =
        assignment.generatedLessonBlocksCount ?? assignment.generatedLessonsCount ?? 0;

    return Math.max(
        requiredBlocks - placedBlocks,
        0,
    );
}

export function getAssignmentLessonStats(assignments: AssignmentResponse[]) {
    return assignments.reduce(
        (acc, assignment) => {
            const status = normalizePlacementStatus(assignment.placementStatus);
            const requiredBlocks =
                assignment.requiredLessonBlocksCount ?? assignment.requiredLessonsCount ?? 0;
            const placedBlocks =
                assignment.generatedLessonBlocksCount ?? assignment.generatedLessonsCount ?? 0;

            acc.total += 1;
            acc.requiredLessons += requiredBlocks;
            acc.placedLessons += placedBlocks;
            acc.unplacedLessons += getAssignmentUnplacedLessons(assignment);

            if (status === "SCHEDULED") {
                acc.scheduled += 1;
            } else if (status === "PARTIAL") {
                acc.partial += 1;
            } else {
                acc.unplaced += 1;
            }

            return acc;
        },
        {
            total: 0,
            scheduled: 0,
            partial: 0,
            unplaced: 0,
            requiredLessons: 0,
            placedLessons: 0,
            unplacedLessons: 0,
        },
    );
}
