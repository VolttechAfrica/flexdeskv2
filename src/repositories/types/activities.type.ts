import { 
    BaseEntity, 
    FilterParams,
  } from './common.types.js';

  export interface UserActivityEntity extends BaseEntity {
    userId: string;
    activity: string;
    ipAddress?: string | null;
    hostName?: string | null;
  }
  
  export interface CreateUserActivityInput {
    userId: string;
    activity: string;
    ipAddress?: string;
    hostName?: string;
  }
  
  export interface UpdateUserActivityInput {
    activity?: string;
    ipAddress?: string;
    hostName?: string;
  }
  
  export interface UserActivityFilters extends FilterParams {
    userId?: string;
    activity?: string;
    ipAddress?: string;
    hostName?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
  