export enum StaffType {
    ADMIN = 'ADMIN',
    CLASS_ROOM_TEACHER = 'CLASS_ROOM_TEACHER',
    SUBJECT_TEACHER = 'SUBJECT_TEACHER',
    OTHER = 'OTHER'
}

interface StaffStatus {
    ACTIVE: String;
    INACTIVE: String;
    GRADUATED: String;
    EXPELLED: String;
    SUSPENDED: String;
}

interface StudentStatus {
    ACTIVE: String;
    INACTIVE: String;
    GRADUATED: String;
    EXPELLED: String;
}

interface ParentStatus {
    ACTIVE: String;
    INACTIVE: String;
    BLOCKED: String;
}

export interface User {
    id: string;
    email: string;
    roleId?: string;
    schoolId?: string;
    firstName: string;
    lastName: string;
    otherName?: string;
    status: StaffStatus | StudentStatus | ParentStatus;
    userType?: 'staff' | 'parent';
}

export interface StaffUser {
    id: string;
    email: string;
    roleId: string;
    schoolId: string;
    firstName: string;
    lastName: string;
    otherName?: string;
    status: StaffStatus;
    type: StaffType;
    userType: 'staff';
}

export interface StudentUser {
    id: string;
    email?: string;
    firstName: string;
    lastName: string;
    otherName?: string;
    status: StudentStatus;
    userType: 'student';
    classId: string;
    classArmId?: string;
    schoolId: string;
    roleId: string;
}

export interface ParentUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    otherName?: string;
    status: ParentStatus;
    userType: 'parent';
    phone: string;
    address?: string;
    state?: string;
    lga?: string;
    city?: string;
    roleId: string;
}

export interface RegisterUser {
    firstName: string;
    lastName: string;
    otherName?: string;
    email: string;
    roleId: string;
    schoolId: string;
    staffId?: string;
    type?: StaffType;
    classArmId?: string;
    classId?: string;
    password?: string;
    subjects?: string[]; // Array of subject IDs to assign
    assignClass?: AssignClass;
}

interface AssignClass {
    classId: string;
    classArmId?: string;
}

export interface RegisterRequest {
    user: RegisterUser;
}

export interface RegisterResponse {
    status: boolean;
    message: string;
    error?: string;
    data?: {
        staffId: string;
        email: string;
        type: StaffType;
    };
}
