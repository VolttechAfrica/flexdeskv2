import { PrismaClient } from "@prisma/client";
import { RegisterUser } from "../types/user.js";
import { HttpStatusCode } from "axios";
import { AuthError } from "../utils/errorhandler.js";
import { responseMessage } from "../utils/responseMessage.js";
import { BaseRepository } from "./base.repository.js";
import { FastifyInstance } from "fastify";
import prisma from "../model/prismaClient.js";


class UserRepositories extends BaseRepository {
  constructor(prisma: PrismaClient, fastify: FastifyInstance) {
    super(prisma, fastify);
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
                gender: true,
                phoneNumber: true,
                address: true,
                state: true,
                city: true,
                lga: true,
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

  private async handleStaffLogin(
    prisma: PrismaClient,
    staffId: string,
    password: string
  ): Promise<void> {
    await prisma.staffLogin.create({
      data: {
        staffId,
        password,
      },
    });
  }

  async createUser(data: RegisterUser): Promise<any> {
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
            },
          });

          if (data.classId && data.password) {
            await this.handleStaffLogin(tx as PrismaClient, staff.id, data.password);
            await this.handleClassAssignment(tx as PrismaClient, {
              classId: data.classId,
              classArmId: data?.classArmId || null,
              staffId: staff.id,
            });
          }

          return true;
        });

        // Invalidate relevant caches
        await this.invalidateCache(`user:email:${data.email}`);
        await this.invalidateCache(`user:profile:${data.staffId}`);
        await this.invalidateCache(`user:info:${data.staffId}`);

        return result;
      } catch (error) {
        throw new AuthError(
          HttpStatusCode.InternalServerError,
          responseMessage.InternalServerError.message
        );
      }
    });
  }

  private async handleUpdateFirstInfo(
    prisma: PrismaClient,
    data: any
  ): Promise<boolean> {
    try {
      await prisma.staff.update({
        where: { id: data.staffId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          otherName: data.otherName,
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  private async handleUpdateProfile(
    prisma: PrismaClient,
    data: any
  ): Promise<boolean> {
    const selectData: Record<string, any> = {};

    if (data?.address) selectData.address = data?.address;
    if (data?.state) selectData.state = data?.state;
    if (data?.phoneNumber) selectData.phoneNumber = data?.phoneNumber;
    if (data?.gender) selectData.gender = data?.gender;
    if (data?.dateOfBirth) selectData.dateOfBirth = data?.dateOfBirth;
    if (data?.profilePicture) selectData.profilePicture = data?.profilePicture;
    if (data?.city) selectData.city = data?.city;
    if (data?.lga) selectData.lga = data?.lga;

    try {
      const userProfile = await prisma.staffProfile.findUnique({
        where: { staffId: data.staffId },
      });
      if (userProfile) {
        await prisma.staffProfile.update({
          where: { staffId: data.staffId },
          data: selectData,
        });
      } else {
        await prisma.staffProfile.create({
          data: { ...selectData, staffId: data.staffId },
        });
      }
      return true;
    } catch (error) {
      return false;
    }
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
            gender: true,
            phoneNumber: true,
            address: true,
            city: true,
            lga: true,
          },
        })
      )
    );
  }

  async getUserInfo(staffId: string): Promise<any> {
    const cacheKey = `user:info:${staffId}`;
    return this.withCache(cacheKey, 'getUserInfo', () =>
      this.executeQuery('getUserInfo', 'staff', async () => {
        this.prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        profile: {
          select: {
            profilePicture: true,
            dateOfBirth: true,
            gender: true,
            phoneNumber: true,
            address: true,
            state: true,
            city: true,
            lga: true,
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
    })
  );
  }

  async updateOboardingInfo(data: any): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.handleUpdateFirstInfo(tx as PrismaClient, data);
        await this.handleUpdateProfile(tx as PrismaClient, data);
      });
      await this.invalidateCache(`user:info:${data.staffId}`);
      await this.invalidateCache(`user:profile:${data.staffId}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async updateOboarding2(data: any): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.handleUpdateProfile(tx as PrismaClient, data);
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getEducationalQualification(staffId: string): Promise<any> {
    try {
      const user = await this.prisma.staffQualification.findFirst({
        where: { staffId: staffId },
      });
      return user || null;
    } catch (error) {
      return null;
    }
  }

  async updateEducationalQualification(data: any): Promise<boolean> {
    try {
      const user = await this.getEducationalQualification(data.staffId);
      if (user) {
        await this.prisma.staffQualification.update({
          where: { staffId: data.staffId },
          data: data,
        });
      } else {
        await this.prisma.staffQualification.create({
          data: data,
        });
      }
      return true;
    } catch (error) {
      console.log(error);
      return false;
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

  async getFirstTimeLogin(staffId: string): Promise<any> {
    try {
      const user = await this.prisma.firstTimeLogin.findFirst({
        where: { userId: staffId },
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
          where: { userId: staffId },
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  }
}


export const createUserRepository = (fastify: FastifyInstance) => {
  return new UserRepositories(prisma, fastify);
};
