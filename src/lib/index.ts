export { api, useAuth } from "./api";

export { assignmentApi } from "./assignmentApi";
export { departmentApi } from "./departmentApi";
export { facultyApi } from "./facultyApi";
export { groupApi } from "./groupApi";
export { lessonApi } from "./lessonApi";
export { lunchApi } from "./lunchApi";
export { majorApi } from "./majorApi";
export { publicTimetableApi } from "./publicTimetableApi";
export { quickActionApi } from "./quickActionApi";
export { roomApi } from "./roomApi";
export { subjectApi } from "./subjectApi";
export { teacherApi } from "./teacherApi";
export { timeSlotApi } from "./timeSlotApi";
export { timetableApi } from "./timetableApi";
export { userApi } from "./userApi";

export {
    getApiErrorMessage,
    getDeleteErrorMessage,
    getDeleteRelatedRecordsMessage,
    getDeleteSuccessMessage,
    getMissingResourceMessage,
    isMissingResourceError,
} from "./apiError";
export {
    compactGroups,
    formatAssignment,
    formatLesson,
    formatLunch,
    formatTimetable,
    uniqueItems,
} from "./deleteDependencyGroups";
export type { DeleteDependencyGroup } from "./deleteDependencyGroups";
export {
    getAssignmentLessonStats,
    getAssignmentUnplacedLessons,
    normalizePlacementStatus,
} from "./assignmentStats";
export type { NormalizedPlacementStatus } from "./assignmentStats";

export type * from "./types";
