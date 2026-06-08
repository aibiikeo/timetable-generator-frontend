// ====================== ENUMS ======================

export type UserRole = "SUPER_ADMIN" | "ADMIN";

export type DayOfWeek =
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";

export type Shift = "MORNING" | "AFTERNOON" | "ANY";

export type RoomType = "CLASSROOM" | "COMPUTER_LAB" | "ANY";

export type Semester = "FALL" | "SPRING";

export type TimetableStatus =
    | "DRAFT"
    | "GENERATED"
    | "PARTIAL"
    | "PUBLISHED"
    | "ARCHIVED";

export type DeleteMode = "SIMPLE" | "DETACH" | "WITH";

export type GenerationMode = "NEW" | "APPEND";

export type Degree = "BACHELOR" | "MASTER" | "PHD" | "SPECIALIST";

// ====================== AUTH ======================

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string | null;
    expires_in: number;
}

// ====================== USERS ======================

export interface UserRequest {
    email: string;
    password: string;
    role: UserRole;
}

export interface UserResponse {
    id: number;
    email: string;
    role: UserRole;
}

// ====================== FACULTY ======================

export interface FacultyRequest {
    name: string;
}

export interface FacultyResponse {
    id: number;
    name: string;
}

// ====================== DEPARTMENT ======================

export interface DepartmentRequest {
    name: string;
    facultyId: number;
}

export interface DepartmentResponse {
    id: number;
    name: string;
    facultyId: number;
    facultyName: string;
}

// ====================== MAJOR ======================

export interface MajorRequest {
    name: string;
    shortName: string;
    departmentId: number;
}

export interface MajorResponse {
    id: number;
    name: string;
    shortName: string;
    departmentId: number;
    departmentName: string;
    facultyId: number;
    facultyName: string;
}

// ====================== STUDY GROUP ======================

export interface StudyGroupRequest {
    name: string;
    majorId: number;
    degree: Degree;
    course: number;
    studentCount: number;
}

export interface StudyGroupResponse {
    id: number;
    name: string;
    course: number;
    studentCount: number;
    majorId: number;
    majorName: string;
    degree: Degree;
    departmentId: number;
    departmentName: string;
    facultyId: number;
    facultyName: string;
}

// ====================== ROOM ======================

export interface RoomRequest {
    name: string;
    capacity: number;
    type: RoomType;
}

export interface RoomResponse {
    id: number;
    name: string;
    capacity: number;
    type: RoomType;
}

// ====================== TEACHER ======================

export interface TeacherRequest {
    fullName: string;
}

export interface TeacherResponse {
    id: number;
    fullName: string;
}

// ====================== SUBJECT ======================

export interface SubjectRequest {
    name: string;
    code: string;
    totalHours: number;
    hoursPerWeek: number;
    majorId: number;
}

export interface SubjectResponse {
    id: number;
    name: string;
    code: string;
    totalHours: number;
    hoursPerWeek: number;
    majorId: number;
    majorName: string;
    degree: Degree;
    departmentId: number;
    departmentName: string;
    facultyId: number;
    facultyName: string;
}

// ====================== TIME SLOT ======================

export interface TimeSlotRequest {
    dayOfWeek?: DayOfWeek;
    order: number;
    startTime: string;
    endTime: string;
    description?: string;
}

export interface TimeSlotResponse {
    id: number;
    dayOfWeek?: DayOfWeek;
    order: number;
    startTime: string;
    endTime: string;
    description?: string;
}

// Backward-compatible alias.
// Later we should replace imports of TimeSlot with TimeSlotResponse.
export type TimeSlot = TimeSlotResponse;

// ====================== LUNCH ======================

export interface LunchRequest {
    timetableId: number;
    groupId: number;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    manual?: boolean;
}

export interface LunchResponse {
    id: number;
    timetableId: number;
    groupId: number;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    manual: boolean;
}

// ====================== ASSIGNMENT ======================

export interface TimeSlotExclusion {
    day: DayOfWeek;
    startTime: string;
    endTime: string;
}

export interface AssignmentRequest {
    subjectId: number;
    teacherId: number;
    groupIds: number[];
    hoursPerWeek: number;
    shift: Shift;
    roomTypeRequired: RoomType;
    hoursSplitting?: string;
    excludedDays?: DayOfWeek[];
    excludedTimeSlots?: TimeSlotExclusion[];
    preferredDays?: DayOfWeek[];
    specificRoomId?: number;
}

export interface AssignmentResponse {
    id: number;
    subjectId: number;
    subjectName: string;
    teacherId: number;
    teacherName: string;
    groupIds: number[];
    groupNames: string[];

    hoursPerWeek: number;
    shift: Shift;
    roomTypeRequired: RoomType;
    specificRoomId: number | null;
    hoursSplitting: string;
    generatedLessonsCount: number;
    requiredLessonsCount: number;

    placementStatus: string;
    failureReason: string | null;
    splittingOptions: string[];
    selectedSplitting: string;
    requiresManualInput: boolean;

    majorId: number;
    majorName: string;
    degree: Degree;
    departmentId: number;
    departmentName: string;
    facultyId: number;
    facultyName: string;
}

// ====================== TIMETABLE ======================

export interface TimetableRequest {
    name: string;
    academicYearStart: number;
    semester: Semester;
    facultyId: number;
    generationSettings: Record<string, unknown>;
}

export interface TimetableResponse {
    id: number;
    name: string;
    academicYearStart: number;
    academicYearEnd: number;
    semester: Semester;
    facultyId: number;
    facultyName: string;
    version: number;
    createdAt: string;
    status: TimetableStatus;
    generationSettings: Record<string, unknown>;
    conflictReport: Record<string, unknown> | null;
    assignments: AssignmentResponse[];
    totalLessons: number;
    totalRequiredLessons: number;
}

// ====================== LESSON ======================

export interface LessonRequest {
    assignmentId: number;
    dayOfWeek: DayOfWeek;
    startTime: string;
    durationHours: number;
    roomId?: number;
}

export interface LessonResponse {
    id: number;
    timetableId: number;
    assignmentId: number;
    subjectName: string;
    teacherName: string;
    groupNames: string[];
    roomName: string | null;
    dayOfWeek: DayOfWeek;
    startTime: string;
    durationHours: number;

    majorId: number;
    majorName: string;
    degree: Degree;
    departmentId: number;
    departmentName: string;
    facultyId: number;
    facultyName: string;
}

// ====================== PUBLIC AIU TIMETABLE ======================

export interface PublicFilterOptionResponse {
    id: number;
    name: string;
}

export interface PublicTimetableLessonResponse {
    id: number;
    timetableId: number;
    timetableName: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    durationHours: number;
    facultyId: number;
    facultyName: string;
    departmentId: number;
    departmentName: string;
    majorId: number;
    majorName: string;
    degree: Degree;
    subjectId: number;
    subjectName: string;
    teacherId: number;
    teacherName: string;
    roomId: number | null;
    roomName: string | null;
    groups: PublicFilterOptionResponse[];
}

export interface PublicTimetableScheduleResponse {
    timetable: TimetableResponse | null;
    totalLessons: number;
    lessons: PublicTimetableLessonResponse[];
}

export interface PublicTimetableFilterOptionsResponse {
    faculties: PublicFilterOptionResponse[];
    departments: PublicFilterOptionResponse[];
    groups: PublicFilterOptionResponse[];
    teachers: PublicFilterOptionResponse[];
    rooms: PublicFilterOptionResponse[];
}

export interface PublicTimetableQuery {
    facultyId?: number;
    departmentId?: number;
    majorId?: number;
    groupId?: number;
    teacherId?: number;
    subjectId?: number;
    roomId?: number;
    dayOfWeek?: DayOfWeek;
}

// ====================== GENERATION ======================

export interface UnplacedLesson {
    assignmentId: number;
    subjectName?: string | null;
    teacherName?: string | null;
    groupNames?: string[];
    reason: string;
}

export interface GenerationResponse {
    timetableId: number;
    timetableName: string;
    totalVertices: number;
    placedLessonsCount: number;
    failedVerticesCount: number;
    status: TimetableStatus;
    failedAssignments: UnplacedLesson[];
}

// ====================== QUICK ACTIONS ======================

export interface QuickActionOptionResponse {
    id: string;
    label: string;
    method: string;
    pathTemplate: string;
    group: string;
}

export interface QuickActionSettingsRequest {
    autoEnabled: boolean;
    selectedActionIds: string[];
}

export interface QuickActionSettingsResponse {
    autoEnabled: boolean;
    maxSelected: number;
    selectedActions: QuickActionOptionResponse[];
    availableActions: QuickActionOptionResponse[];
}

// ====================== ERROR ======================

export interface ApiError {
    status?: number;
    code?: string;
    message: string;
    details?: string;
    timestamp?: string;
    path?: string;
    errors?: Record<string, string[]>;
}
