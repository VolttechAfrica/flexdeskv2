import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./base.repository.js";
import { FastifyInstance } from "fastify";
import prisma from "../model/prismaClient.js";

interface CreateParentInput {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  otherName?: string | null;
  address?: string | null;
  state?: string | null;
  lga?: string | null;
  city?: string | null;
  password?: string; // expected to be hashed by the caller
  roleId: string; // required override for role assignment
}

class ParentRepository extends BaseRepository {
  constructor(prismaClient: PrismaClient, fastify: FastifyInstance) {
    super(prismaClient, fastify);
  }

  async findByEmail(email: string) {
    const cacheKey = `parent:email:${email}`;

    return this.withCache(cacheKey, "findParentByEmail", () =>
      this.executeQuery("findParentByEmail", "parent", () =>
        this.prisma.parent.findUnique({
          where: { email },
          include: {
            role: {
              select: {
                name: true,
                RolePermission: {
                  select: {
                    permission: { select: { action: true } },
                  },
                },
              },
            },
            parentLogin: {
              select: { password: true },
            },
            children: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                class: true,
                classArm: true,
                school: true,
                profile: {
                  select: {
                    email: true,
                    phoneNumber: true,
                    profilePicture: true,
                  },
                },
              },
            },
          },
        })
      )
    );
  }

  async findById(parentId: string) {
    const cacheKey = `parent:id:${parentId}`;

    return this.withCache(cacheKey, "findParentById", () =>
      this.executeQuery("findParentById", "parent", () =>
        this.prisma.parent.findUnique({
          where: { id: parentId },
          include: {
            role: {
              select: {
                name: true,
                RolePermission: {
                  select: {
                    permission: { select: { action: true } },
                  },
                },
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
                profile: {
                  select: {
                    email: true,
                    phoneNumber: true,
                    profilePicture: true,
                  },
                },
              },
            },
          },
        })
      )
    );
  }

  async updateStatus(parentId: string, status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'PENDING'): Promise<boolean> {
    return this.executeQuery("updateParentStatus", "parent", async () => {
      try {
        const updated = await this.prisma.parent.update({
          where: { id: parentId },
          data: { status },
        });

        // Invalidate caches
        await this.invalidateCache(`parent:id:${parentId}`);
        if (updated?.email) {
          await this.invalidateCache(`parent:email:${updated.email}`);
        }

        return true;
      } catch (error) {
        return false;
      }
    });
  }

  async createParent(data: CreateParentInput): Promise<boolean> {
    return this.executeQuery("createParent", "parent", async () => {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const parent = await tx.parent.create({
            data: {
              email: data.email,
              firstName: data.firstName,
              lastName: data.lastName,
              otherName: data.otherName ?? null,
              phone: data.phone,
              address: data.address ?? null,
              state: data.state ?? null,
              lga: data.lga ?? null,
              city: data.city ?? null,
              roleId: data.roleId,
            },
          });

          if (data.password) {
            await (tx as any).login.create({
              data: {
                parentId: parent.id,
                password: data.password,
              },
            });
          }

          return parent;
        });

        // Invalidate relevant caches
        await this.invalidateCache(`parent:email:${data.email}`);
        await this.invalidateCache(`parent:id:${result.id}`);

        return true;
      } catch (error) {
        return false;
      }
    });
  }



  async changeEmail(parentId: string, newEmail: string): Promise<boolean> {
    return this.executeQuery("changeParentEmail", "parent", async () => {
      try {
        // Fetch current parent to invalidate old email cache key
        const current = await this.prisma.parent.findUnique({ where: { id: parentId } });
        const updated = await this.prisma.parent.update({
          where: { id: parentId },
          data: { email: newEmail },
        });

        // Invalidate caches
        await this.invalidateCache(`parent:id:${parentId}`);
        if (current?.email) {
          await this.invalidateCache(`parent:email:${current.email}`);
        }
        await this.invalidateCache(`parent:email:${updated.email}`);

        return true;
      } catch (error) {
        return false;
      }
    });
  }

  async changePassword(parentId: string, newPassword: string): Promise<boolean> {
    return this.executeQuery("changeParentPassword", "parent", async () => {
      try {
        // Ensure a Login row exists for this parent and update password
        await (this.prisma as any).login.upsert({
          where: { parentId: parentId },
          update: { password: newPassword },
          create: { parentId: parentId, password: newPassword },
        });
        return true;
      } catch (error) {
        return false;
      }
    });
  }
}

export const createParentRepository = (fastify: FastifyInstance) => {
  return new ParentRepository(prisma, fastify);
}; 