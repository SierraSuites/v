/**
 * Pagination Utilities
 *
 * Implements cursor-based pagination for optimal performance
 * with large datasets (10,000+ records)
 *
 * Features:
 * - Cursor-based (better than offset for large datasets)
 * - Configurable page size
 * - Total count (optional, for UI)
 * - Sort by any column
 * - Filter support
 *
 * Usage:
 * const { data, nextCursor, hasMore } = await paginateQuery(supabase, 'projects', {
 *   limit: 50,
 *   cursor: lastCursor,
 *   orderBy: 'created_at',
 *   orderDirection: 'desc'
 * })
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface PaginationParams {
  limit?: number
  cursor?: string | null
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  filters?: Record<string, any>
  search?: {
    column: string
    query: string
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
  total?: number
}

/**
 * Paginate any Supabase query
 */
export async function paginateQuery<T>(
  supabase: SupabaseClient,
  tableName: string,
  params: PaginationParams = {},
  includeTotal: boolean = false
): Promise<PaginatedResponse<T>> {
  const {
    limit = 50,
    cursor,
    orderBy = 'created_at',
    orderDirection = 'desc',
    filters = {},
    search
  } = params

  // Start building query
  let query = supabase
    .from(tableName)
    .select('*', { count: includeTotal ? 'exact' : undefined })

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        query = query.in(key, value)
      } else {
        query = query.eq(key, value)
      }
    }
  })

  // Apply search
  if (search) {
    query = query.ilike(search.column, `%${search.query}%`)
  }

  // Apply cursor (for pagination)
  if (cursor) {
    if (orderDirection === 'asc') {
      query = query.gt(orderBy, cursor)
    } else {
      query = query.lt(orderBy, cursor)
    }
  }

  // Apply ordering
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Fetch one extra record to determine if there are more pages
  query = query.limit(limit + 1)

  // Execute query
  const { data, error, count } = await query

  if (error) {
    throw new Error(`Pagination query failed: ${error.message}`)
  }

  // Check if there are more records
  const hasMore = (data?.length ?? 0) > limit
  const records = hasMore ? data!.slice(0, -1) : (data ?? [])

  // Get next cursor (value of orderBy column from last record)
  const nextCursor = hasMore && records.length > 0
    ? records[records.length - 1][orderBy]
    : null

  return {
    data: records as T[],
    nextCursor,
    hasMore,
    total: count ?? undefined
  }
}

/**
 * Paginate with React Hook (client-side)
 *
 * Usage:
 * const { data, loadMore, loading, hasMore } = usePagination('projects', {
 *   limit: 50,
 *   orderBy: 'created_at'
 * })
 */
export function createPaginationHook() {
  // To be implemented with React hooks
  // This is a placeholder for the implementation pattern
}

/**
 * Offset-based pagination (for simpler use cases)
 *
 * Note: Cursor-based is better for performance, but offset
 * is easier for traditional page numbers (1, 2, 3...)
 */
export async function paginateWithOffset<T>(
  supabase: SupabaseClient,
  tableName: string,
  page: number = 1,
  pageSize: number = 50,
  filters: Record<string, any> = {}
): Promise<{
  data: T[]
  page: number
  pageSize: number
  totalPages: number
  totalRecords: number
}> {
  const offset = (page - 1) * pageSize

  // Build query
  let query = supabase
    .from(tableName)
    .select('*', { count: 'exact' })

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value)
    }
  })

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Offset pagination query failed: ${error.message}`)
  }

  return {
    data: (data ?? []) as T[],
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
    totalRecords: count ?? 0
  }
}

/**
 * Infinite scroll pagination
 *
 * Optimized for infinite scroll UIs
 */
export class InfiniteScrollPaginator<T> {
  private cursor: string | null = null
  private hasMore: boolean = true
  private loading: boolean = false

  constructor(
    private supabase: SupabaseClient,
    private tableName: string,
    private params: Omit<PaginationParams, 'cursor'>
  ) {}

  async loadMore(): Promise<T[]> {
    if (!this.hasMore || this.loading) {
      return []
    }

    this.loading = true

    try {
      const result = await paginateQuery<T>(
        this.supabase,
        this.tableName,
        {
          ...this.params,
          cursor: this.cursor
        }
      )

      this.cursor = result.nextCursor
      this.hasMore = result.hasMore

      return result.data
    } finally {
      this.loading = false
    }
  }

  reset() {
    this.cursor = null
    this.hasMore = true
    this.loading = false
  }

  isLoading(): boolean {
    return this.loading
  }

  canLoadMore(): boolean {
    return this.hasMore && !this.loading
  }
}

/**
 * Virtual scroll helper
 *
 * For use with react-window or react-virtualized
 */
export function createVirtualScrollLoader<T>(
  supabase: SupabaseClient,
  tableName: string,
  params: PaginationParams
) {
  const cache = new Map<number, T>()
  let totalCount = 0

  return {
    async loadItems(startIndex: number, stopIndex: number): Promise<T[]> {
      const limit = stopIndex - startIndex + 1
      const offset = startIndex

      const { data, count } = await paginateWithOffset<T>(
        supabase,
        tableName,
        Math.floor(offset / limit) + 1,
        limit,
        params.filters
      )

      totalCount = count?.totalRecords ?? 0

      // Cache the items
      data.forEach((item, index) => {
        cache.set(startIndex + index, item)
      })

      return data
    },

    getItem(index: number): T | undefined {
      return cache.get(index)
    },

    getTotalCount(): number {
      return totalCount
    },

    clearCache() {
      cache.clear()
    }
  }
}

/**
 * Search with pagination
 */
export async function searchWithPagination<T>(
  supabase: SupabaseClient,
  tableName: string,
  searchQuery: string,
  searchColumns: string[],
  params: PaginationParams = {}
): Promise<PaginatedResponse<T>> {
  const {
    limit = 50,
    cursor,
    orderBy = 'created_at',
    orderDirection = 'desc'
  } = params

  // Build search query
  let query = supabase
    .from(tableName)
    .select('*')

  // Search across multiple columns
  const searchConditions = searchColumns.map(col =>
    `${col}.ilike.%${searchQuery}%`
  ).join(',')

  query = query.or(searchConditions)

  // Apply cursor
  if (cursor) {
    if (orderDirection === 'asc') {
      query = query.gt(orderBy, cursor)
    } else {
      query = query.lt(orderBy, cursor)
    }
  }

  // Apply ordering and limit
  query = query
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .limit(limit + 1)

  const { data, error } = await query

  if (error) {
    throw new Error(`Search query failed: ${error.message}`)
  }

  const hasMore = (data?.length ?? 0) > limit
  const records = hasMore ? data!.slice(0, -1) : (data ?? [])
  const nextCursor = hasMore && records.length > 0
    ? records[records.length - 1][orderBy]
    : null

  return {
    data: records as T[],
    nextCursor,
    hasMore
  }
}

/**
 * Example usage patterns
 */

// Example 1: Basic pagination
/*
const { data: projects, nextCursor, hasMore } = await paginateQuery(
  supabase,
  'projects',
  {
    limit: 50,
    cursor: currentCursor,
    orderBy: 'created_at',
    orderDirection: 'desc',
    filters: {
      status: 'active',
      company_id: companyId
    }
  }
)
*/

// Example 2: Infinite scroll
/*
const paginator = new InfiniteScrollPaginator(supabase, 'tasks', {
  limit: 30,
  orderBy: 'due_date',
  filters: { project_id: projectId }
})

// Load more when user scrolls
const newTasks = await paginator.loadMore()
setTasks(prev => [...prev, ...newTasks])
*/

// Example 3: Search with pagination
/*
const results = await searchWithPagination(
  supabase,
  'projects',
  'kitchen remodel',
  ['name', 'description', 'client_name'],
  { limit: 20 }
)
*/
