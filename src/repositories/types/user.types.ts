import { StaffType, StaffStatus, ParentStatus } from "@prisma/client";

import { 
    BaseEntity, 
    FilterParams,
  } from './common.types.js';

  export interface StaffEntity extends BaseEntity {
    email: string;
    firstName: string;
    lastName: string;
    otherName?: string | null;
    type: StaffType;
    status: StaffStatus;
    roleId: string;
    schoolId: string;
  }
  
  export interface StudentEntity extends BaseEntity {
    id: string;
    firstName: string;
    lastName: string;
    otherName?: string | null;
    classId: string;
    classArmId?: string | null;
    roleId: string;
    schoolId: string;
    parentId?: string | null;
    termId: string;
    status: string;
  }
  
  export interface ParentEntity extends BaseEntity {
    email: string;
    firstName: string;
    lastName: string;
    otherName?: string | null;
    phone: string;
    address?: string | null;
    state?: string | null;
    lga?: string | null;
    city?: string | null;
    roleId: string;
    status: ParentStatus;
  }
  
  export interface CreateUserInput {
    staffId: string;
    firstName: string;
    lastName: string;
    otherName?: string | null;
    email: string;
    password: string;
    roleId: string;
    schoolId: string;
    type?: StaffType;
    classId?: string;
    classArmId?: string | null;
    subjects?: string[];
  }
  
  export interface UpdateUserInput {
    firstName?: string;
    lastName?: string;
    otherName?: string | null;
    type?: StaffType;
    status?: StaffStatus;
  }
  
  export interface UserFilters extends FilterParams {
    schoolId?: string;
    roleId?: string;
    type?: StaffType;
    status?: StaffStatus;
    email?: string;
    searchTerm?: string;
    classId?: string;
    classArmId?: string;
  }
  
  export interface ProfileUpdateInput {
    staffId: string;
    profilePicture?: string;
    dateOfBirth?: string;
    gender?: string;
    phoneNumber?: string;
    address?: string;
    state?: string;
    city?: string;
    lga?: string;
    email?: string;
  }
  
  export interface QualificationInput {
    staffId: string;
    qualification: string;
    institution: string;
    course: string;
    grade?: string;
    yearObtained?: string;
  }
  
  export interface EmergencyContactInput {
    staffId: string;
    name: string;
    relationship: string;
    phoneNumber: string;
  }
  
  export interface NotificationSettingsInput {
    userId: string;
    email: boolean;
    sms: boolean;
    push: boolean;
  }