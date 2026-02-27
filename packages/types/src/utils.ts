/**
 * Shared utility types used across the CRM monorepo.
 */

/** Standard paginated response envelope */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Standard API response envelope */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/** Pagination query params */
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Soft-deletable record base */
export interface SoftDeletable {
  deletedAt: Date | null;
}

/** Timestamps base */
export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}
