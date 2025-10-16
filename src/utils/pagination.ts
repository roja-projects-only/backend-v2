import { PaginationMeta, calculatePagination } from './response';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
}

// Parse and validate pagination parameters
export function parsePagination(
  params: PaginationParams,
  options: PaginationOptions = {}
): { page: number; limit: number; skip: number } {
  const {
    defaultPage = 1,
    defaultLimit = 20,
    maxLimit = 100,
  } = options;

  let page = params.page || defaultPage;
  let limit = params.limit || defaultLimit;

  // Validate and constrain values
  page = Math.max(1, Math.floor(page));
  limit = Math.max(1, Math.min(maxLimit, Math.floor(limit)));

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

// Paginate query results
export async function paginate<T>(
  query: () => Promise<T[]>,
  count: () => Promise<number>,
  params: PaginationParams
): Promise<{ data: T[]; pagination: PaginationMeta }> {
  const { page, limit, skip } = parsePagination(params);

  const [data, total] = await Promise.all([
    query(),
    count(),
  ]);

  const pagination = calculatePagination(page, limit, total);

  return { data, pagination };
}
