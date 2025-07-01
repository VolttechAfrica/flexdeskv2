import prisma from "../model/prismaClient.js";
import { PrismaClient, TermStatus } from "@prisma/client";
import { DatabaseMonitor } from "../plugins/monitoring/database.js";
import { FastifyInstance } from "fastify";
import { BaseRepository } from "./base.repository.js";

class SchoolRepository extends BaseRepository {
  constructor(prisma: PrismaClient, fastify: FastifyInstance) {
    super(prisma, fastify);
  }

  async getCurrentTerm(schoolId: string) {
    const cacheKey = `term:current:${schoolId}`;
    return this.withCache(cacheKey, 'getCurrentTerm', () =>
      this.executeQuery('getCurrentTerm', 'term', () =>
        this.prisma.term.findFirst({
          where: {
            schoolId,
            status: TermStatus.ACTIVE,
          },
        })
      )
    );
  }

  async makeTermActive(schoolId: string, termId: string) {
    return this.executeQuery('makeTermActive', 'term', async () => {
      await this.prisma.$transaction(async (tx) => {
        await this.makeAllTermsInactive(schoolId);
        await tx.term.update({
          where: { id: termId },
          data: { status: TermStatus.ACTIVE },
        });
      });
      await this.invalidateCache(`term:current:${schoolId}`);
      return true;
    });
  }

  async getAllTerms(schoolId: string) {
    const cacheKey = `terms:all:${schoolId}`;
    return this.withCache(cacheKey, 'getAllTerms', () =>
      this.executeQuery('getAllTerms', 'term', () =>
        this.prisma.term.findMany({
          where: { schoolId },
        })
      )
    );
  }

  async createTerm(data: any) {
    return this.executeQuery('createTerm', 'term', async () => {
      const term = await this.prisma.term.create({
        data,
      });
      await this.invalidateCache(`terms:all:${data.schoolId}`);
      return term;
    });
  }

  async makeAllTermsInactive(schoolId: string) {
    return this.executeQuery('makeAllTermsInactive', 'term', async () => {
      const result = await this.prisma.term.updateMany({
        where: { schoolId },
        data: { status: TermStatus.INACTIVE },
      });
      await this.invalidateCache(`term:current:${schoolId}`);
      await this.invalidateCache(`terms:all:${schoolId}`);
      return result;
    });
  }

  async updateTerm(termId: string, name: string, startDate: string, endDate: string, year: string) {
    return this.executeQuery('updateTerm', 'term', async () => {
      const term = await this.prisma.term.update({
        where: { id: termId },
        data: { name, startDate, endDate, year },
      });
      await this.invalidateCache(`term:current:${term.schoolId}`);
      await this.invalidateCache(`terms:all:${term.schoolId}`);
      return term;
    });
  }
}

export const createSchoolRepository = (fastify: FastifyInstance) => {
  return new SchoolRepository(prisma, fastify);
};