import { PrismaClient } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { BaseRepository } from './base/base.repository.js';
import { 
  RepositoryResult, 
  UserContext, 
} from './types/common.types.js';
import { 
  EntityNotFoundError
} from './errors/repository.errors.js';
import { StaffEntity, 
  StudentEntity, 
  ParentEntity, 
  CreateUserInput, 
  UpdateUserInput, 
  UserFilters, 
  ProfileUpdateInput,
  QualificationInput,
  EmergencyContactInput,
  NotificationSettingsInput,
} from './types/user.types.js';
import { REDIS_KEYS } from "../services/authorization.service.js";


export class UserRepositories extends BaseRepository<
  StaffEntity,
  CreateUserInput,
  UpdateUserInput,
  UserFilters
> {
  constructor(prisma: PrismaClient, fastify: FastifyInstance) {
    super(prisma, fastify, 'staff');
  }

  // Abstract method implementations
  protected getModel() {
    return this.prisma.staff;
  }

  protected buildWhereClause(filters: UserFilters): any {
    const where: any = {};

    if (filters.schoolId) {
      where.schoolId = filters.schoolId;
    }

    if (filters.roleId) {
      where.roleId = filters.roleId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }

    if (filters.classId) {
      where.assignedClasses = {
        some: {
          classId: filters.classId,
          ...(filters.classArmId && { classArmId: filters.classArmId })
        }
      };
    }

    if (filters.searchTerm) {
      where.OR = [
        { firstName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { lastName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { otherName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { email: { contains: filters.searchTerm, mode: 'insensitive' } }
      ];
    }

    return where;
  }

  protected buildCreateData(data: CreateUserInput, context?: UserContext): any {
    return {
      id: data.staffId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      otherName: data.otherName,
      type: data.type || 'OTHER',
      status: 'INACTIVE',
      roleId: data.roleId,
      schoolId: data.schoolId,
      profile: {
        create: {
          profilePicture: null,
          dateOfBirth: null,
          gender: null,
          phoneNumber: null,
          address: null,
          state: null,
          city: null,
          lga: null
        }
      }
    };
  }

  protected buildUpdateData(data: UpdateUserInput, context?: UserContext): any {
    const updateData: any = {};

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.otherName !== undefined) updateData.otherName = data.otherName;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;

    return updateData;
  }

  protected async validateCreateData(data: CreateUserInput): Promise<RepositoryResult<boolean>> {
    const errors: string[] = [];

    // Required field validation
    if (!data.staffId) errors.push('Staff ID is required');
    if (!data.email) errors.push('Email is required');
    if (!data.firstName) errors.push('First name is required');
    if (!data.lastName) errors.push('Last name is required');
    if (!data.password) errors.push('Password is required');
    if (!data.roleId) errors.push('Role ID is required');
    if (!data.schoolId) errors.push('School ID is required');

    // Email format validation
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    // Name length validation
    if (data.firstName && data.firstName.length > 100) {
      errors.push('First name must be 100 characters or less');
    }
    if (data.lastName && data.lastName.length > 100) {
      errors.push('Last name must be 100 characters or less');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `Validation failed: ${errors.join(', ')}`
      };
    }

    return { success: true, data: true };
  }

  protected async validateUpdateData(data: UpdateUserInput, existing: StaffEntity): Promise<RepositoryResult<boolean>> {
    const errors: string[] = [];

    // Name length validation
    if (data.firstName && data.firstName.length > 100) {
      errors.push('First name must be 100 characters or less');
    }
    if (data.lastName && data.lastName.length > 100) {
      errors.push('Last name must be 100 characters or less');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `Validation failed: ${errors.join(', ')}`
      };
    }

    return { success: true, data: true };
  }

  protected getCacheKey(id: string): string {
    return `user:${id}`;
  }

  protected getCachePattern(): string {
    return 'user:*';
  }

  // Private helper methods
  private async handleClassAssignment(
    prisma: any, // Transaction client
    params: { classId: string; classArmId?: string | null; staffId: string }
  ): Promise<void> {
    const { classId, classArmId, staffId } = params;

    const existingAssignment = await prisma.assignedClasses.findFirst({
      where: { classId, classArmId: classArmId || null }
    });

    if (existingAssignment) {
      await prisma.assignedClasses.update({
        where: { id: existingAssignment.id },
        data: { staffId }
      });
    } else {
      await prisma.assignedClasses.create({
        data: { staffId, classId, classArmId }
      });
    }
  }

  private async handleSubjectAssignment(
    prisma: any, // Transaction client
    staffId: string,
    subjectIds: string[]
  ): Promise<void> {
    // Remove existing subject assignments
    await prisma.assignedSubject.deleteMany({
      where: { staffId }
    });

    // Create new subject assignments
    if (subjectIds.length > 0) {
      await prisma.assignedSubject.createMany({
        data: subjectIds.map(subjectId => ({
          staffId,
          subjectId
        }))
      });
    }
  }

  private async handleStaffLogin(
    prisma: any, // Transaction client
    staffId: string,
    password: string
  ): Promise<void> {
    await prisma.login.create({
      data: {
        staffId,
        password
      }
    });
  }

  // Staff-specific methods
  async createUser(data: CreateUserInput): Promise<RepositoryResult<StaffEntity>> {
    try {
      const result = await this.executeQuery('createUser', async () => {
        return await this.prisma.$transaction(async (tx) => {
          // Create staff record
          const staff = await tx.staff.create({
            data: this.buildCreateData(data)
          });

          // Create login record
          if (data.password) {
            await this.handleStaffLogin(tx, staff.id, data.password);
          }

          // Handle class assignment
          if (data.classId) {
            await this.handleClassAssignment(tx, {
              classId: data.classId,
              classArmId: data.classArmId || null,
              staffId: staff.id
            });
          }

          // Handle subject assignment
          if (data.subjects && data.subjects.length > 0 && data.type === 'SUBJECT_TEACHER') {
            await this.handleSubjectAssignment(tx, staff.id, data.subjects);
          }

          return staff;
        });
      });

      // Invalidate relevant caches
      await this.invalidateCache([
        `user:email:${data.email}`,
        `user:profile:${data.staffId}`,
        `user:info:${data.staffId}`
      ]);

      return { success: true, data: result };
    } catch (error) {
      return this.handleError(error, 'createUser', { data });
    }
  }

  async findByEmail(email: string): Promise<RepositoryResult<StaffEntity | null>> {
    try {
      const cacheKey = `user:email:${email}`;
      
      // Try cache first
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const staff = await this.executeQuery('findByEmail', () =>
        this.prisma.staff.findUnique({
          where: { email },
          include: {
            firstTimeLogin: true,
            staffLogin: {
              select: { password: true }
            },
            role: {
              select: {
                name: true
              }
            }
          }
        })
      );

      if (staff) {
        await this.setCache(cacheKey, staff);
      }

      return { success: true, data: staff };
    } catch (error) {
      return this.handleError(error, 'findByEmail', { email });
    }
  }

  async getUserProfile(staffId: string): Promise<RepositoryResult<any>> {
    try {
      const cacheKey = `user:profile:${staffId}`;
      
      // Try cache first
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
      
      const profile = await this.executeQuery('getUserProfile', () =>
        this.prisma.staffProfile.findUnique({
          where: { staffId },
          select: {
            profilePicture: true,
            dateOfBirth: true,
            phoneNumber: true,
            address: true,
            lga: true,
            gender: true,
            city: true
          }
        })
      );

      if (profile) {
        await this.setCache(cacheKey, profile as any);
      }

      return { success: true, data: profile };
    } catch (error) {
      return this.handleError(error, 'getUserProfile', { staffId });
    }
  }

  // Unified, type-aware user info
  async getUserInfo(userId: string): Promise<RepositoryResult<any>> {
    try {
      const userTypeFromCache = await this.getUserTypeFromCache(userId);
      const resolvedType = userTypeFromCache || 'staff';
      const cacheKey = this.buildUserInfoCacheKey(resolvedType, userId);

      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      let fetched: any = null;
      if (resolvedType === 'parent') {
        fetched = await this.getParentInfoById(userId);
      } else if (resolvedType === 'student') {
        fetched = await this.getStudentInfoById(userId);
      } else {
        fetched = await this.getStaffInfoById(userId);
      }

      if (fetched) {
        const typeForDto: 'staff' | 'student' | 'parent' = (['staff', 'student', 'parent'] as const).includes(resolvedType as any)
          ? (resolvedType as 'staff' | 'student' | 'parent')
          : 'staff';
        const dto = this.mapToUserInfoDTO(fetched, typeForDto);
        await this.setCache(cacheKey, dto as any);

        return { success: true, data: dto };
      }

      return { success: true, data: null };
    } catch (error) {
      console.log('REPO ERROR', error);
      return this.handleError(error, 'getUserInfo', { userId });
    }
  }

  private async getStaffInfoById(userId: string) {
    return this.executeQuery('getStaffInfo', () =>
      this.prisma.staff.findUnique({
        where: { id: userId },
        include: {
          profile: {
            select: {
              profilePicture: true,
              dateOfBirth: true,
              phoneNumber: true,
              address: true,
              state: true,
              lga: true,
              gender: true,
              city: true
            }
          },
          firstTimeLogin: true,
          assignedClasses: { select: { classId: true, classArmId: true } },
          assignedSubjects: {
            select: {
              subject: { select: { id: true, name: true, code: true } }
            }
          },
          role: { select: { name: true } },
          school: { select: { id: true, name: true, shortName: true, status: true } }
        }
      })
    );
  }

  private async getStudentInfoById(userId: string) {
    return this.executeQuery('getStudentInfo', () =>
      this.prisma.student.findUnique({
        where: { id: userId },
        include: {
          profile: {
            select: {
              profilePicture: true,
              dateOfBirth: true,
              phoneNumber: true,
              address: true,
              state: true,
              lga: true,
              email: true
            }
          },
          class: { select: { id: true, name: true } },
          classArm: { select: { id: true, name: true } },
          school: { select: { id: true, name: true, shortName: true } },
          role: { select: { name: true } },
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        }
      })
    );
  }

  private async getParentInfoById(userId: string) {
    return this.executeQuery('getParentInfo', () =>
      this.prisma.parent.findUnique({
        where: { id: userId },
        include: {
          role: { select: { name: true } },
          children: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              otherName: true,
              class: { select: { id: true, name: true } },
              classArm: { select: { id: true, name: true } }
            }
          }
        }
      })
    );
  }

  // DTO mapper for consistent, compact cache shape
  private mapToUserInfoDTO(entity: any, type: 'staff' | 'student' | 'parent') {
    if (!entity) return null;

    if (type === 'staff') {
      return {
        id: entity.id,
        email: entity.email,
        firstName: entity.firstName,
        otherName: entity.otherName,
        lastName: entity.lastName,
        status: entity.status,
        roleId: entity.roleId,
        profile: entity.profile || null,
        assignedClasses: entity.assignedClasses || [],
        assignedSubjects: entity.assignedSubjects || [],
        role: entity.role || null,
        school: entity.school || null,
        firstTimeLogin: entity.firstTimeLogin || null,
      };
    }

    if (type === 'student') {
      return {
        id: entity.id,
        email: entity.profile?.email || null,
        firstName: entity.firstName,
        otherName: entity.otherName,
        lastName: entity.lastName,
        status: entity.status,
        roleId: entity.roleId,
        profile: entity.profile || null,
        class: entity.class || null,
        classArm: entity.classArm || null,
        school: entity.school || null,
        parent: entity.parent || null,
        firstTimeLogin: null,
      };
    }

    // parent
    return {
      id: entity.id,
      email: entity.email,
      firstName: entity.firstName,
      otherName: entity.otherName,
      lastName: entity.lastName,
      status: entity.status,
      roleId: entity.roleId,
      profile: null,
      children: entity.children || [],
      role: entity.role || null,
      school: null,
      firstTimeLogin: null,
    };
  }

  private buildUserInfoCacheKey(type: string, id: string) {
    const safeType = ['staff', 'student', 'parent'].includes(type) ? type : 'staff';
    return `user:info:v2:${safeType}:${id}`;
  }

  private async handleErrorAndDefault<T>(promise: Promise<T>, operation: string, params: any) {
    try {
      return await promise;
    } catch (error) {
      return this.handleError(error, operation, params);
    }
  }

  // Student methods
  async findStudentByEmail(email: string): Promise<RepositoryResult<StudentEntity | null>> {
    try {
      const cacheKey = `student:email:${email}`;
      
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached as any };
      }

      const student = await this.executeQuery('findStudentByEmail', () =>
        this.prisma.student.findFirst({
          where: { 
            profile: {
              email: email
            }
          },
          include: {
            profile: {
              select: {
                profilePicture: true,
                dateOfBirth: true,
                phoneNumber: true,
                address: true,
                state: true,
                lga: true,
                email: true
              }
            },
            class: true,
            classArm: true,
            school: true,
            role: {
              select: {
                name: true
              }
            },
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        })
      );

      if (student) {
        await this.setCache(cacheKey, student as any);
      }

      return { success: true, data: student };
    } catch (error) {
      return this.handleError(error, 'findStudentByEmail', { email });
    }
  }

  // Parent methods
  async findParentByEmail(email: string): Promise<RepositoryResult<ParentEntity | null>> {
    try {
      const cacheKey = `parent:email:${email}`;
      
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached as any };
      }

      const parent = await this.executeQuery('findParentByEmail', () =>
        this.prisma.parent.findUnique({
          where: { email },
          include: {
            role: {
              select: {
                name: true
              }
            },
            firstTimeLogin: true,
            parentLogin: {
              select: { password: true }
            },
            children: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                otherName: true,
                class: true,
                classArm: true,
              }
            }
          }
        })
      );

      if (parent) {
        await this.setCache(cacheKey, parent as any);
      }

      return { success: true, data: parent };
    } catch (error) {
      return this.handleError(error, 'findParentByEmail', { email });
    }
  }

  // Profile management methods
  async updateProfile(data: ProfileUpdateInput): Promise<RepositoryResult<boolean>> {
    try {
      const userProfile = await this.prisma.staffProfile.findUnique({
        where: { staffId: data.staffId }
      });
      
      if (userProfile) {
        await this.executeQuery('updateProfile', () =>
          this.prisma.staffProfile.update({
            where: { staffId: data.staffId },
            data: {
              profilePicture: data.profilePicture,
              dateOfBirth: data.dateOfBirth,
              gender: data.gender,
              phoneNumber: data.phoneNumber,
              address: data.address,
              state: data.state,
              city: data.city,
              lga: data.lga
            }
          })
        );
      } else {
        await this.executeQuery('createProfile', () =>
          this.prisma.staffProfile.create({
            data: {
              staffId: data.staffId,
              profilePicture: data.profilePicture,
              dateOfBirth: data.dateOfBirth,
              gender: data.gender,
              phoneNumber: data.phoneNumber,
              address: data.address,
              state: data.state,
              city: data.city,
              lga: data.lga
            }
          })
        );
      }
      
      // Invalidate caches
      await this.invalidateCache([
        `user:profile:${data.staffId}`,
        `user:info:${data.staffId}`,
        `user:email:${data.email}`
      ]);

      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error, 'updateProfile', { data });
    }
  }

  async updateUserProfilePicture(data: { staffId: string; profilePicture: string }): Promise<RepositoryResult<boolean>> {
    try {
      const user = await this.getUserProfile(data.staffId);
      if (user.success && user.data) {
        await this.executeQuery('updateUserProfilePicture', () =>
          this.prisma.staffProfile.update({
            where: { staffId: data.staffId },
            data: { profilePicture: data.profilePicture }
          })
        );
      } else {
        await this.executeQuery('createUserProfilePicture', () =>
          this.prisma.staffProfile.create({
            data: { 
              profilePicture: data.profilePicture, 
              staffId: data.staffId 
            }
          })
        );
      }

      // Invalidate caches
      await this.invalidateCache([
        `user:profile:${data.staffId}`,
        `user:info:${data.staffId}`
      ]);

      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error, 'updateUserProfilePicture', { data });
    }
  }

  // Educational qualifications
  async updateEducationalQualification(data: QualificationInput): Promise<RepositoryResult<boolean>> {
    try {
      const existingQualification = await this.prisma.staffQualification.findFirst({
        where: { 
          staffId: data.staffId,
          qualification: data.qualification,
          institution: data.institution,
          course: data.course
        }
      });
      
      if (existingQualification) {
        await this.executeQuery('updateEducationalQualification', () =>
          this.prisma.staffQualification.updateMany({
            where: { 
              staffId: data.staffId,
              qualification: data.qualification,
              institution: data.institution,
              course: data.course
            },
            data: {
              grade: data.grade,
              yearObtained: data.yearObtained
            }
          })
        );
      } else {
        await this.executeQuery('createEducationalQualification', () =>
          this.prisma.staffQualification.create({
            data: {
              staffId: data.staffId,
              qualification: data.qualification,
              institution: data.institution,
              course: data.course,
              grade: data.grade,
              yearObtained: data.yearObtained
            }
          })
        );
      }
      
      // Invalidate caches
      await this.invalidateCache([
        `user:info:${data.staffId}`,
        `user:profile:${data.staffId}`
      ]);

      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error, 'updateEducationalQualification', { data });
    }
  }

  async getEducationalQualifications(staffId: string): Promise<RepositoryResult<any[]>> {
    try {
      const qualifications = await this.executeQuery('getEducationalQualifications', () =>
        this.prisma.staffQualification.findMany({
          where: { staffId },
          orderBy: { yearObtained: 'desc' }
        })
      );

      return { success: true, data: qualifications };
    } catch (error) {
      return this.handleError(error, 'getEducationalQualifications', { staffId });
    }
  }

  // Emergency contacts
  async updateEmergencyContact(data: EmergencyContactInput): Promise<RepositoryResult<boolean>> {
    try {
      const existingContact = await this.prisma.emergencyContact.findFirst({
        where: { staffId: data.staffId }
      });
      
      if (existingContact) {
        await this.executeQuery('updateEmergencyContact', () =>
          this.prisma.emergencyContact.update({
            where: { id: existingContact.id },
            data: {
              name: data.name,
              relationship: data.relationship,
              phone: data.phoneNumber
            }
          })
        );
      } else {
        await this.executeQuery('createEmergencyContact', () =>
          this.prisma.emergencyContact.create({
            data: {
              staffId: data.staffId,
              name: data.name,
              relationship: data.relationship,
              phone: data.phoneNumber
            }
          })
        );
      }
      
      // Invalidate caches
      await this.invalidateCache([`user:info:${data.staffId}`]);

      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error, 'updateEmergencyContact', { data });
    }
  }

  // Notification settings
  async updateNotificationSettings(data: NotificationSettingsInput): Promise<RepositoryResult<boolean>> {
    try {
      const existingSettings = await this.prisma.userNotificationSettings.findFirst({
        where: { userId: data.userId }
      });
      
      if (existingSettings) {
        await this.executeQuery('updateNotificationSettings', () =>
          this.prisma.userNotificationSettings.update({
            where: { id: existingSettings.id },
            data: {
              emailNotifications: data.email,
              smsNotifications: data.sms,
              pushNotifications: data.push
            }
          })
        );
      } else {
        await this.executeQuery('createNotificationSettings', () =>
          this.prisma.userNotificationSettings.create({
            data: {
              userId: data.userId,
              emailNotifications: data.email,
              smsNotifications: data.sms,
              pushNotifications: data.push
            }
          })
        );
      }
      
      // Invalidate caches
      await this.invalidateCache([`user:info:${data.userId}`]);

      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error, 'updateNotificationSettings', { data });
    }
  }

  // First time login management
  async getFirstTimeLogin(staffId: string): Promise<RepositoryResult<any>> {
    try {
      const user = await this.executeQuery('getFirstTimeLogin', () =>
        this.prisma.firstTimeLogin.findFirst({
          where: { staff: { id: staffId } }
        })
      );

      return { success: true, data: user };
    } catch (error) {
      return this.handleError(error, 'getFirstTimeLogin', { staffId });
    }
  }

  async deleteFirstTimeLogin(staffId: string): Promise<RepositoryResult<boolean>> {
    try {
      const user = await this.getFirstTimeLogin(staffId);
      if (user.success && user.data) { 
        await this.executeQuery('deleteFirstTimeLogin', () =>
          this.prisma.firstTimeLogin.delete({
            where: { id: user.data.id }
          })
        );
      }

      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error, 'deleteFirstTimeLogin', { staffId });
    }
  }

  // Password management
  async updateUserPassword(userId: string, password: string, email: string): Promise<RepositoryResult<boolean>> {
    try {
      const loginRecord = await this.prisma.login.findFirst({
        where: {
          OR: [
            { staffId: userId },
            { parentId: userId },
            { studentId: userId }
          ]
        }
      });

      if (!loginRecord) {
        throw new EntityNotFoundError('Login record', userId);
      }

      await this.executeQuery('updateUserPassword', () =>
        this.prisma.login.update({
          where: { id: loginRecord.id },
          data: { password }
        })
      );

      // Invalidate all related caches
      await this.invalidateCache([
        `user:info:${userId}`,
        `user:profile:${userId}`,
        `user:email:${email}`,
        `student:email:${email}`,
        `parent:email:${email}`
      ]);

      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error, 'updateUserPassword', { userId, email });
    }
  }

  // School management
  async getSchoolById(schoolId: string): Promise<RepositoryResult<any>> {
    try {
      const cacheKey = `school:${schoolId}`;
      
      // Try cache first
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const school = await this.executeQuery('getSchoolById', () =>
        this.prisma.school.findUnique({
          where: { id: schoolId },
          select: {
            id: true,
            name: true,
            shortName: true,
            address: true,
            state: true,
            lga: true
          }
        })
      );

      if (!school) {
        throw new EntityNotFoundError('School', schoolId);
      }

      // Cache the result
      await this.setCache(cacheKey, school as any);

      return { success: true, data: school };
    } catch (error) {
      return this.handleError(error, 'getSchoolById', { schoolId });
    }
  }

  protected async invalidateRelatedCaches(entity: StaffEntity): Promise<void> {
    const cacheKeys = [
      this.getCacheKey(entity.id),
      `user:email:${entity.email}`,
      `user:school:${entity.schoolId}`,
      `user:role:${entity.roleId}`,
      this.buildUserInfoCacheKey('staff', entity.id),
      this.buildUserInfoCacheKey('student', entity.id),
      this.buildUserInfoCacheKey('parent', entity.id)
    ];

    await this.invalidateCache(cacheKeys);
  }
}

export const createUserRepository = (fastify: FastifyInstance) => {
  return new UserRepositories(fastify.prisma as any, fastify);
};

