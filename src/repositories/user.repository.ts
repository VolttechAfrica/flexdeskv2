import { PrismaClient } from "@prisma/client";
import { RegisterUser } from "../types/user.js";
import { HttpStatusCode } from "axios";
import { AuthError } from "../utils/errorhandler.js";
import { responseMessage } from "../utils/responseMessage.js";
import { BaseRepository } from "./base.repository.js";
import { FastifyInstance } from "fastify";
import prisma from "../model/prismaClient.js";

interface CreateUserInput {
  firstName: string;
  lastName: string;
  otherName?: string | null;
  email: string;
  password: string;
  roleId: string;
  schoolId: string;
  staffId: string;
  type?: 'ADMIN' | 'CLASS_ROOM_TEACHER' | 'SUBJECT_TEACHER' | 'OTHER';
  classId?: string;
  classArmId?: string | null;
  subjects?: string[]; // Array of subject IDs to assign
}

class UserRepositories extends BaseRepository {
  constructor(prisma: PrismaClient, fastify: FastifyInstance) {
    super(prisma, fastify);
  }

  private async handleClassAssignment(
    prisma: PrismaClient,
    params: { classId: string; classArmId?: string | null; staffId: string }
  ): Promise<void> {
    const { classId, classArmId, staffId } = params;

    const existingAssignment = await prisma.assignedClasses.findFirst({
      where: { classId, classArmId: classArmId || null },
    });

    if (existingAssignment) {
      await prisma.assignedClasses.update({
        where: {
          id: existingAssignment.id,
        },
        data: { staffId },
      });
    } else {
      await prisma.assignedClasses.create({
        data: { staffId, classId, classArmId },
      });
    }
  }

  private async handleSubjectAssignment(
    prisma: PrismaClient,
    staffId: string,
    subjectIds: string[]
  ): Promise<void> {
    // Remove existing subject assignments
    await prisma.assignedSubject.deleteMany({
      where: { staffId },
    });

    // Create new subject assignments
    if (subjectIds.length > 0) {
      await prisma.assignedSubject.createMany({
        data: subjectIds.map(subjectId => ({
          staffId,
          subjectId,
        })),
      });
    }
  }

  private async handleStaffLogin(
    prisma: PrismaClient,
    staffId: string,
    password: string
  ): Promise<void> {
    await (prisma as any).login.create({
      data: {
        staffId,
        password,
      },
    });
  }

  async createUser(data: CreateUserInput): Promise<any> {
    return this.executeQuery('createUser', 'staff', async () => {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const staff = await tx.staff.create({
            data: {
              id: data.staffId,
              firstName: data.firstName,
              lastName: data.lastName,
              otherName: data.otherName || null,
              email: data.email,
              roleId: data.roleId,
              schoolId: data.schoolId,
              type: data.type || 'OTHER',
            },
          });

          if (data.password) {
            await this.handleStaffLogin(tx as PrismaClient, staff.id, data.password);
          }

          if (data.classId) {
            await this.handleClassAssignment(tx as PrismaClient, {
              classId: data.classId,
              classArmId: data?.classArmId || null,
              staffId: staff.id,
            });
          }

          if (data.subjects && data.subjects.length > 0 && data.type === 'SUBJECT_TEACHER') {
            await this.handleSubjectAssignment(tx as PrismaClient, staff.id, data.subjects);
          }

          return staff;
        });

        // Invalidate relevant caches
        await this.invalidateCache(`user:email:${data.email}`);
        await this.invalidateCache(`user:profile:${data.staffId}`);
        await this.invalidateCache(`user:info:${data.staffId}`);

        return result;
      } catch (error) {
        throw new AuthError(
          responseMessage.InternalServerError.message,
          HttpStatusCode.InternalServerError
        );
      }
    });
  }


  async findByEmail(email: string) {
    const cacheKey = `user:email:${email}`;
  
    return this.withCache(cacheKey, 'findByEmail', () =>
      this.executeQuery('findByEmail', 'staff', () =>
        this.prisma.staff.findUnique({
          where: { email },
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
                city: true,
              },
            },
            firstTimeLogin: true,
            staffLogin: {
              select: {
                password: true,
              },
            },
            assignedClasses: {
              select: {
                classId: true,
                classArmId: true,
              },
            },
            assignedSubjects: {
              select: {
                subject: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
            role: {
              select: {
                name: true,
                RolePermission: {
                  select: {
                    permission: {
                      select: {
                        action: true,
                      },
                    },
                  },
                },
              },
            },
            school: true,
          },
        })
      )
    );
  }

  async getUserProfile(staffId: string): Promise<any> {
    const cacheKey = `user:profile:${staffId}`;
    return this.withCache(cacheKey, 'getUserProfile', () =>
      this.executeQuery('getUserProfile', 'staffProfile', () =>
        this.prisma.staffProfile.findUnique({
          where: { staffId },
          select: {
            profilePicture: true,
            dateOfBirth: true,
            phoneNumber: true,
            address: true,
            lga: true,
            gender: true,
            city: true,
          },
        })
      )
    );
  }

  async getUserInfo(staffId: string): Promise<any> {
    const cacheKey = `user:info:${staffId}`;
    return this.withCache(cacheKey, 'getUserInfo', () =>
      this.executeQuery('getUserInfo', 'staff', async () => {
        return this.prisma.staff.findUnique({
          where: { id: staffId },
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
                city: true,
              },
            },
            firstTimeLogin: true,
            staffLogin: {
              select: {
                password: true,
              },
            },
            assignedClasses: {
              select: {
                classId: true,
                classArmId: true,
              },
            },
            assignedSubjects: {
              select: {
                subject: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
            role: {
              select: {
                name: true,
                RolePermission: {
                  select: {
                    permission: {
                      select: {
                        action: true,
                      },
                    },
                  },
                },
              },
            },
            school: true,
          },
        });
      })
    );
  }

  async updateEducationalQualification(data: any): Promise<boolean> {
    try {
      const existingQualification = await this.prisma.staffQualification.findFirst({
        where: { 
          staffId: data.staffId,
          qualification: data.qualification,
          institution: data.institution,
          course: data.course
        },
      });
      
      if (existingQualification) {
        await this.prisma.staffQualification.updateMany({
          where: { 
            staffId: data.staffId,
            qualification: data.qualification,
            institution: data.institution,
            course: data.course
          },
          data: {
            grade: data.grade,
            yearObtained: data.yearObtained,
          },
        });
      } else {
        await this.prisma.staffQualification.create({
          data: {
            staffId: data.staffId,
            qualification: data.qualification,
            institution: data.institution,
            course: data.course,
            grade: data.grade,
            yearObtained: data.yearObtained,
          },
        });
      }
      
      await this.invalidateCache(`user:info:${data.staffId}`);
      await this.invalidateCache(`user:profile:${data.staffId}`);

      return true;
    } catch (error) {
      console.log('Error updating educational qualification:', error);
      return false;
    }
  }

  async getEducationalQualifications(staffId: string): Promise<any[]> {
    try {
      const qualifications = await this.prisma.staffQualification.findMany({
        where: { staffId },
        orderBy: { yearObtained: 'desc' }
      });
      return qualifications;
    } catch (error) {
      console.log('Error getting educational qualifications:', error);
      return [];
    }
  }

  async updateUserProfilePicture(data: any): Promise<boolean> {
    try {
      const user = await this.getUserProfile(data.staffId);
      if (user) {
        await this.prisma.staffProfile.update({
          where: { staffId: data.staffId },
          data: { profilePicture: data.profilePicture },
        });
      } else {
        await this.prisma.staffProfile.create({
          data: { profilePicture: data.profilePicture, staffId: data.staffId },
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async updateProfile(data: any): Promise<boolean> {
    try {
      const userProfile = await this.prisma.staffProfile.findUnique({
        where: { staffId: data.staffId },
      });
      
      if (userProfile) {
        await this.prisma.staffProfile.update({
          where: { staffId: data.staffId },
          data: {
            profilePicture: data.profilePicture,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            phoneNumber: data.phoneNumber,
            address: data.address,
            state: data.state,
            city: data.city,
            lga: data.lga,
          },
        });
      } else {
        await this.prisma.staffProfile.create({
          data: {
            staffId: data.staffId,
            profilePicture: data.profilePicture,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            phoneNumber: data.phoneNumber,
            address: data.address,
            state: data.state,
            city: data.city,
            lga: data.lga,
          },
        });
      }
      
      await this.invalidateCache(`user:profile:${data.staffId}`);
      await this.invalidateCache(`user:info:${data.staffId}`);
      await this.invalidateCache(`user:email:${data.email}`);
      return true;
    } catch (error) {
      console.log('Error updating profile:', error);
      return false;
    }
  }

  async updateEmergencyContact(data: any): Promise<boolean> {
    try {
      const existingContact = await this.prisma.emergencyContact.findFirst({
        where: { staffId: data.staffId },
      });
      
      if (existingContact) {
        await this.prisma.emergencyContact.update({
          where: { id: existingContact.id },
          data: {
            name: data.name,
            relationship: data.relationship,
            phone: data.phoneNumber,
          },
        });
      } else {
        await this.prisma.emergencyContact.create({
          data: {
            staffId: data.staffId,
            name: data.name,
            relationship: data.relationship,
            phone: data.phoneNumber,
          },
        });
      }
      
      await this.invalidateCache(`user:info:${data.staffId}`);
      return true;
    } catch (error) {
      console.log('Error updating emergency contact:', error);
      return false;
    }
  }

  async updateNotificationSettings(data: any): Promise<boolean> {
    try {
      const existingSettings = await this.prisma.userNotificationSettings.findFirst({
        where: { userId: data.userId },
      });
      
      if (existingSettings) {
        await this.prisma.userNotificationSettings.update({
          where: { id: existingSettings.id },
          data: {
            emailNotifications: data.email,
            smsNotifications: data.sms,
            pushNotifications: data.push,
          },
        });
      } else {
        await this.prisma.userNotificationSettings.create({
          data: {
            userId: data.userId,
            emailNotifications: data.email,
            smsNotifications: data.sms,
            pushNotifications: data.push,
          },
        });
      }
      
      await this.invalidateCache(`user:info:${data.userId}`);
      return true;
    } catch (error) {
      console.log('Error updating notification settings:', error);
      return false;
    }
  }

  async getFirstTimeLogin(staffId: string): Promise<any> {
    try {
      const user = await this.prisma.firstTimeLogin.findFirst({
        where: { staff: { id: staffId } },
      });
      return user || null;
    } catch (error) {
      return null;
    }
  }

  async deleteFirstTimeLogin(staffId: string): Promise<boolean> {
    try {
      const user = await this.getFirstTimeLogin(staffId);
      if (user) { 
        await this.prisma.firstTimeLogin.delete({
          where: { id: user.id },
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async findStudentByEmail(email: string) {
    const cacheKey = `student:email:${email}`;
  
    return this.withCache(cacheKey, 'findStudentByEmail', () =>
      this.executeQuery('findStudentByEmail', 'student', () =>
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
                email: true,
              },
            },
            class: true,
            classArm: true,
            school: true,
            role: {
              select: {
                name: true,
                RolePermission: {
                  select: {
                    permission: {
                      select: {
                        action: true,
                      },
                    },
                  },
                },
              },
            },
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        })
      )
    );
  }

  async findParentByEmail(email: string) {
    const cacheKey = `parent:email:${email}`;
  
    return this.withCache(cacheKey, 'findParentByEmail', () =>
      this.executeQuery('findParentByEmail', 'parent', () =>
        this.prisma.parent.findUnique({
          where: { email },
          include: {
            role: {
              select: {
                name: true,
                RolePermission: {
                  select: {
                    permission: {
                      select: { action: true },
                    },
                  },
                },
              },
            },
            firstTimeLogin: true,
            parentLogin: {
              select: {
                password: true,
              },
            },
            children: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                class: true,
                classArm: true,
                school: true,
              },
            },
          },
        })
      )
    );
  }

  async getSchoolById(schoolId: string) {
    const cacheKey = `school:${schoolId}`;
  
    return this.withCache(cacheKey, 'getSchoolById', () =>
      this.executeQuery('getSchoolById', 'school', () =>
        this.prisma.school.findUnique({
          where: { id: schoolId },
          select: {
            id: true,
            name: true,
            shortName: true,
            address: true,
            state: true,
            lga: true,
          },
        })
      )
    );
  }
}

export const createUserRepository = (fastify: FastifyInstance) => {
  return new UserRepositories(prisma, fastify);
};
