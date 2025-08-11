import { User, StaffUser, StudentUser, ParentUser } from '@/types/user.js';

export interface Login {
    email: string;
    password: string;
}

export interface LoginResponse {
    status: boolean;
    message: string;
    data?: User;
    error?: string;
    token?: string;
}

export interface MultiUserLoginResponse {
    status: boolean;
    message: string;
    data?: {
        user: StaffUser | StudentUser | ParentUser;
        token: string;
        userType: 'staff' | 'parent';
        permissions?: string[];
        schoolInfo?: any;
    };
    error?: string;
}

export interface AuthUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    otherName?: string;
    userType: 'staff' | 'parent';
    schoolId?: string;
    roleId?: string;
    status: string;
}
