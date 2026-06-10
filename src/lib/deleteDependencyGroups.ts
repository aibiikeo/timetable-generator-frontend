import type {
    AssignmentResponse,
    LessonResponse,
    LunchResponse,
    TimetableResponse,
} from "./types";

export interface DeleteDependencyGroup {
    label: string;
    items: string[];
}

export function compactGroups(groups: DeleteDependencyGroup[]) {
    return groups.filter((group) => group.items.length > 0);
}

export function uniqueItems(items: string[]) {
    return [...new Set(items)];
}

export function formatAssignment(assignment: AssignmentResponse) {
    const groupLabel = assignment.groupNames?.length
        ? ` (${assignment.groupNames.join(", ")})`
        : "";

    return `${assignment.subjectName} - ${assignment.teacherName}${groupLabel}`;
}

export function formatLesson(lesson: LessonResponse) {
    const groupLabel = lesson.groupNames?.length
        ? ` (${lesson.groupNames.join(", ")})`
        : "";
    const roomLabel = lesson.roomName ? `, ${lesson.roomName}` : "";

    return `${lesson.subjectName} - ${lesson.teacherName}${groupLabel}, ${lesson.dayOfWeek} ${lesson.startTime}${roomLabel}`;
}

export function formatLunch(lunch: LunchResponse) {
    return `Group ${lunch.groupId} - ${lunch.dayOfWeek} ${lunch.startTime}-${lunch.endTime}`;
}

export function formatTimetable(timetable: TimetableResponse) {
    return `${timetable.name} (${timetable.academicYearStart}-${timetable.academicYearEnd}, ${timetable.semester})`;
}
