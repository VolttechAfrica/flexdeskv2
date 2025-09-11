import { PrismaClient } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { BaseRepository } from './base/base.repository.js';
import { 
  RepositoryResult, 
  UserContext, 
  PaginationParams,
  QueryOptions
} from './types/common.types.js';
import { 
  DatabaseConnectionError
} from './errors/repository.errors.js';
import { UserActivityEntity, 
    CreateUserActivityInput, 
    UpdateUserActivityInput, 
    UserActivityFilters 
} from './types/activities.type.js';



export default class ActivitiesRepository extends BaseRepository<
  UserActivityEntity,
  CreateUserActivityInput,
  UpdateUserActivityInput,
  UserActivityFilters
> {
  constructor(prisma: PrismaClient, fastify: FastifyInstance) {
    super(prisma, fastify, 'userActivity');
  }

  // Abstract method implementations
  protected getModel() {
    return this.prisma.userActivity;
  }

  protected buildWhereClause(filters: UserActivityFilters): any {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.activity) {
      where.activity = { contains: filters.activity, mode: 'insensitive' };
    }

    if (filters.ipAddress) {
      where.ipAddress = { contains: filters.ipAddress, mode: 'insensitive' };
    }

    if (filters.hostName) {
      where.hostName = { contains: filters.hostName, mode: 'insensitive' };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    return where;
  }

  protected buildCreateData(data: CreateUserActivityInput, context?: UserContext): any {
    return {
      userId: data.userId,
      activity: data.activity,
      ipAddress: data.ipAddress || null,
      hostName: data.hostName || null
    };
  }

  protected buildUpdateData(data: UpdateUserActivityInput, context?: UserContext): any {
    const updateData: any = {};

    if (data.activity !== undefined) updateData.activity = data.activity;
    if (data.ipAddress !== undefined) updateData.ipAddress = data.ipAddress;
    if (data.hostName !== undefined) updateData.hostName = data.hostName;

    return updateData;
  }

  protected async validateCreateData(data: CreateUserActivityInput): Promise<RepositoryResult<boolean>> {
    const errors: string[] = [];

    // Required field validation
    if (!data.userId) errors.push('User ID is required');
    if (!data.activity) errors.push('Activity description is required');

    // Length validation
    if (data.activity && data.activity.length > 1000) {
      errors.push('Activity description must be 1000 characters or less');
    }

    if (data.ipAddress && data.ipAddress.length > 200) {
      errors.push('IP address must be 200 characters or less');
    }

    if (data.hostName && data.hostName.length > 200) {
      errors.push('Host name must be 200 characters or less');
    }

    // IP address format validation (basic)
    if (data.ipAddress && !this.isValidIpAddress(data.ipAddress)) {
      errors.push('Invalid IP address format');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `Validation failed: ${errors.join(', ')}`
      };
    }

    return { success: true, data: true };
  }

  protected async validateUpdateData(data: UpdateUserActivityInput, existing: UserActivityEntity): Promise<RepositoryResult<boolean>> {
    const errors: string[] = [];

    // Length validation
    if (data.activity && data.activity.length > 1000) {
      errors.push('Activity description must be 1000 characters or less');
    }

    if (data.ipAddress && data.ipAddress.length > 200) {
      errors.push('IP address must be 200 characters or less');
    }

    if (data.hostName && data.hostName.length > 200) {
      errors.push('Host name must be 200 characters or less');
    }

    // IP address format validation (basic)
    if (data.ipAddress && !this.isValidIpAddress(data.ipAddress)) {
      errors.push('Invalid IP address format');
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
    return `user_activity:${id}`;
  }

  protected getCachePattern(): string {
    return 'user_activity:*';
  }

  // Specific activity methods
  async createUserActivity(
    userId: string, 
    activity: string, 
    ipAddress?: string, 
    hostName?: string
  ): Promise<RepositoryResult<UserActivityEntity>> {
    try {
      const data: CreateUserActivityInput = {
        userId,
        activity,
        ipAddress,
        hostName
      };

      return await this.create(data);
    } catch (error) {
      return this.handleError(error, 'createUserActivity', { userId, activity, ipAddress, hostName });
    }
  }

  async getUserActivities(
    userId: string, 
    pagination?: PaginationParams,
    options?: QueryOptions
  ): Promise<RepositoryResult<UserActivityEntity[]>> {
    try {
      const filters: UserActivityFilters = { userId };
      return await this.findMany(filters, options);
    } catch (error) {
      return this.handleError(error, 'getUserActivities', { userId, pagination, options });
    }
  }

  async getUserActivitiesPaginated(
    userId: string,
    pagination?: PaginationParams,
    options?: QueryOptions
  ): Promise<RepositoryResult<{ data: UserActivityEntity[]; pagination: any }>> {
    try {
      const filters: UserActivityFilters = { userId };
      const result = await this.findManyPaginated(filters, pagination, options);
      
      if (!result.success || !result.data) {
        return result;
      }

      return {
        success: true,
        data: {
          data: result.data!.data,
          pagination: result.data!.pagination
        }
      };
    } catch (error) {
      return this.handleError(error, 'getUserActivitiesPaginated', { userId, pagination, options });
    }
  }

  async getRecentActivities(
    userId: string, 
    limit: number = 10
  ): Promise<RepositoryResult<UserActivityEntity[]>> {
    try {
      const filters: UserActivityFilters = { userId };
      const options: QueryOptions = {
        orderBy: { createdAt: 'desc' }
        // take: limit - commented out as it's not part of QueryOptions
      };

      return await this.findMany(filters, options);
    } catch (error) {
      return this.handleError(error, 'getRecentActivities', { userId, limit });
    }
  }

  async searchActivities(
    userId: string,
    searchTerm: string,
    options?: QueryOptions
  ): Promise<RepositoryResult<UserActivityEntity[]>> {
    try {
      const filters: UserActivityFilters = { 
        userId,
        activity: searchTerm
      };

      return await this.findMany(filters, options);
    } catch (error) {
      return this.handleError(error, 'searchActivities', { userId, searchTerm, options });
    }
  }

  async getActivityStats(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<RepositoryResult<{ total: number; recent: number; byDate: any[] }>> {
    try {
      const filters: UserActivityFilters = { 
        userId,
        dateFrom,
        dateTo
      };

      const [total, recent] = await Promise.all([
        this.count(filters),
        this.count({ 
          ...filters, 
          dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        })
      ]);

      if (!total.success || !recent.success) {
        throw new DatabaseConnectionError('Failed to get activity statistics');
      }

      // Get activities grouped by date (simplified)
      const activities = await this.findMany(filters, {
        orderBy: { createdAt: 'desc' }
      });

      if (!activities.success) {
        throw new DatabaseConnectionError('Failed to get activities for stats');
      }

      const byDate = this.groupActivitiesByDate(activities.data!);

      return {
        success: true,
        data: {
          total: total.data!,
          recent: recent.data!,
          byDate
        }
      };
    } catch (error) {
      return this.handleError(error, 'getActivityStats', { userId, dateFrom, dateTo });
    }
  }

  // Private helper methods
  private isValidIpAddress(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  private groupActivitiesByDate(activities: UserActivityEntity[]): any[] {
    const grouped = activities.reduce((acc, activity) => {
      const date = activity.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date]++;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  }

  protected async invalidateRelatedCaches(entity: UserActivityEntity): Promise<void> {
    const cacheKeys = [
      this.getCacheKey(entity.id),
      `user_activity:user:${entity.userId}`,
      `user_activity:recent:${entity.userId}`
    ];

    await this.invalidateCache(cacheKeys);
  }
}


export const createActivitiesRepository = (fastify: FastifyInstance) => {
  return new ActivitiesRepository(fastify.prisma as any, fastify);
};

