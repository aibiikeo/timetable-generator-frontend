// ====================== ENUMS ======================
export type UserRole = 'SUPER_ADMIN' | 'ADMIN';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type Shift = 'MORNING' | 'AFTERNOON' | 'ANY';
export type RoomType = 'CLASSROOM' | 'COMPUTER_LAB' | 'ANY';
export type TimetableStatus = 'DRAFT' | 'GENERATED' | 'PARTIAL' | 'PUBLISHED' | 'ARCHIVED';
export type DeleteMode = 'SIMPLE' | 'DETACH' | 'WITH';
export type GenerationMode = 'NEW' | 'APPEND';

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
    refresh_token: string;
    token_type?: string;
    expires_in?: number;
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
    shortName: string;
}

export interface FacultyResponse {
    id: number;
    name: string;
    shortName: string;
}

// ====================== STUDY GROUP ======================
export interface StudyGroupRequest {
    name: string;
    facultyId: number;
    course: number;
    studentCount: number;
}

export interface StudyGroupResponse {
    id: number;
    name: string;
    facultyId: number;
    facultyName: string;
    course: number;
    studentCount: number;
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
    facultyId: number;
}

export interface SubjectResponse {
    id: number;
    name: string;
    code: string;
    totalHours: number;
    hoursPerWeek: number;
    facultyId: number;
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
    shift?: Shift;
    roomTypeRequired?: RoomType;
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
    hoursSplitting: string;
    generatedLessonsCount: number;
    requiredLessonsCount: number;
    placementStatus: string;
    failureReason: string;
    splittingOptions: string[];
    selectedSplitting: string;
    requiresManualInput: boolean;
}

// ====================== TIMETABLE ======================
export interface TimetableRequest {
    name: string;
    assignments: AssignmentRequest[];
    generationSettings: Record<string, any>;
}

export interface TimetableResponse {
    id: number;
    name: string;
    createdAt: string;           // ISO date-time
    isCurrent: boolean;
    status: TimetableStatus;
    assignments: AssignmentResponse[];
    totalLessons: number;
    totalRequiredLessons: number;
}

// ====================== LESSON ======================
export interface LessonRequest {
    assignmentId: number;
    dayOfWeek: DayOfWeek;
    startTime: string;           // например "09:00"
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
    roomName: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    durationHours: number;
}

// ====================== ERROR ======================
export interface ApiError {
    status: number;
    message: string;
    timestamp: string;
    path?: string;
    errors?: Record<string, string[]>;
}

export interface UnplacedLesson {
    assignmentId: number;
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

export interface TimeSlot {
    id: number;
    slot?: string;           // например "1st" – может отсутствовать в ответе API
    dayOfWeek?: DayOfWeek;   // если слот общий для всех дней, то null
    order: number;
    startTime: string;       // "09:00"
    endTime: string;         // "09:55"
    isLunch?: boolean;
    description?: string;
}