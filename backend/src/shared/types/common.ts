/**
 * Common types used across the application
 */

export type UUID = string;

export type Timestamp = Date;

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditFields {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserContext {
  userId: UUID;
  workspaceId?: UUID;
  role?: string;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
