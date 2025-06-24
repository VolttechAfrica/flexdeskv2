interface StaffStatus {
    ACTIVE: String;
    INACTIVE: String;
    GRADUATED: String;
    EXPELLED: String;
    SUSPENDED: String;
}


export interface User {
    id: string;
    email: string;
    roleId: string;
    schoolId: string;
    firstName: string;
    lastName: string;
    otherName?: string;
    status: StaffStatus;

}

export interface RegisterUser {
    firstName: string;
    lastName: string;
    otherName?: string;
    email: string;
    roleId: string;
    schoolId: string;
    staffId?: string;
    classArmId?: string;
    classId?: string;
    password?: string;
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
}
