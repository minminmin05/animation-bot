// Cache Utility for School Management App
// Provides localStorage, sessionStorage, and memory caching with TTL support

export interface CacheItem<T = any> {
  data: T
  timestamp: number
  ttl?: number // Time to live in milliseconds
  key: string
}

export interface CacheOptions {
  ttl?: number // Default TTL in milliseconds
  maxSize?: number // Maximum cache size
  storage?: "localStorage" | "sessionStorage" | "memory"
  prefix?: string // Cache key prefix
}

class CacheManager {
  private memoryCache = new Map<string, CacheItem>()
  private defaultTTL = 8 * 60 * 60 * 1000 // 8 hours (28800 seconds)
  private maxSize = 100
  private prefix = "school_cache_"

  constructor(options?: CacheOptions) {
    if (options?.ttl) this.defaultTTL = options.ttl
    if (options?.maxSize) this.maxSize = options.maxSize
    if (options?.prefix) this.prefix = options.prefix
  }

  /**
   * Set cache item with TTL
   */
  set<T>(
    key: string,
    data: T,
    options?: {
      ttl?: number
      storage?: "localStorage" | "sessionStorage" | "memory"
    }
  ): boolean {
    const storage = options?.storage || "memory"
    const ttl = options?.ttl || this.defaultTTL
    const timestamp = Date.now()

    const cacheItem: CacheItem<T> = {
      data,
      timestamp,
      ttl,
      key: this.prefix + key,
    }

    try {
      switch (storage) {
        case "localStorage":
          if (typeof window !== "undefined" && window.localStorage) {
            localStorage.setItem(cacheItem.key, JSON.stringify(cacheItem))
            return true
          }
          break

        case "sessionStorage":
          if (typeof window !== "undefined" && window.sessionStorage) {
            sessionStorage.setItem(cacheItem.key, JSON.stringify(cacheItem))
            return true
          }
          break

        case "memory":
        default:
          // Manage memory cache size
          if (this.memoryCache.size >= this.maxSize) {
            this.evictOldest()
          }
          this.memoryCache.set(cacheItem.key, cacheItem)
          return true
      }
    } catch (error) {
      console.error("Cache set error:", error)
      return false
    }

    return false
  }

  /**
   * Get cache item with TTL check
   */
  get<T>(
    key: string,
    storage?: "localStorage" | "sessionStorage" | "memory"
  ): T | null {
    const cacheKey = this.prefix + key
    const storageType = storage || "memory"

    try {
      let cacheItem: CacheItem<T> | null = null

      switch (storageType) {
        case "localStorage":
          if (typeof window !== "undefined" && window.localStorage) {
            const stored = localStorage.getItem(cacheKey)
            if (stored) {
              cacheItem = JSON.parse(stored)
            }
          }
          break

        case "sessionStorage":
          if (typeof window !== "undefined" && window.sessionStorage) {
            const stored = sessionStorage.getItem(cacheKey)
            if (stored) {
              cacheItem = JSON.parse(stored)
            }
          }
          break

        case "memory":
        default:
          cacheItem = this.memoryCache.get(cacheKey) || null
          break
      }

      if (!cacheItem) return null

      // Check TTL
      if (cacheItem.ttl && Date.now() - cacheItem.timestamp > cacheItem.ttl) {
        this.delete(key, storageType)
        return null
      }

      return cacheItem.data
    } catch (error) {
      console.error("Cache get error:", error)
      return null
    }
  }

  /**
   * Delete cache item
   */
  delete(
    key: string,
    storage?: "localStorage" | "sessionStorage" | "memory"
  ): boolean {
    const cacheKey = this.prefix + key
    const storageType = storage || "memory"

    try {
      switch (storageType) {
        case "localStorage":
          if (typeof window !== "undefined" && window.localStorage) {
            localStorage.removeItem(cacheKey)
            return true
          }
          break

        case "sessionStorage":
          if (typeof window !== "undefined" && window.sessionStorage) {
            sessionStorage.removeItem(cacheKey)
            return true
          }
          break

        case "memory":
        default:
          return this.memoryCache.delete(cacheKey)
      }
    } catch (error) {
      console.error("Cache delete error:", error)
      return false
    }

    return false
  }

  /**
   * Clear all cache items
   */
  clear(storage?: "localStorage" | "sessionStorage" | "memory"): boolean {
    const storageType = storage || "memory"

    try {
      switch (storageType) {
        case "localStorage":
          if (typeof window !== "undefined" && window.localStorage) {
            // Clear only items with our prefix
            const keys = Object.keys(localStorage)
            keys.forEach((key) => {
              if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key)
              }
            })
            return true
          }
          break

        case "sessionStorage":
          if (typeof window !== "undefined" && window.sessionStorage) {
            // Clear only items with our prefix
            const keys = Object.keys(sessionStorage)
            keys.forEach((key) => {
              if (key.startsWith(this.prefix)) {
                sessionStorage.removeItem(key)
              }
            })
            return true
          }
          break

        case "memory":
        default:
          this.memoryCache.clear()
          return true
      }
    } catch (error) {
      console.error("Cache clear error:", error)
      return false
    }

    return false
  }

  /**
   * Get cache statistics
   */
  getStats(storage?: "localStorage" | "sessionStorage" | "memory") {
    const storageType = storage || "memory"

    try {
      switch (storageType) {
        case "localStorage":
          if (typeof window !== "undefined" && window.localStorage) {
            const keys = Object.keys(localStorage)
            const ourKeys = keys.filter((key) => key.startsWith(this.prefix))
            return {
              size: ourKeys.length,
              keys: ourKeys.map((key) => key.replace(this.prefix, "")),
            }
          }
          break

        case "sessionStorage":
          if (typeof window !== "undefined" && window.sessionStorage) {
            const keys = Object.keys(sessionStorage)
            const ourKeys = keys.filter((key) => key.startsWith(this.prefix))
            return {
              size: ourKeys.length,
              keys: ourKeys.map((key) => key.replace(this.prefix, "")),
            }
          }
          break

        case "memory":
        default:
          return {
            size: this.memoryCache.size,
            keys: Array.from(this.memoryCache.keys()).map((key) =>
              key.replace(this.prefix, "")
            ),
          }
      }
    } catch (error) {
      console.error("Cache stats error:", error)
    }

    return { size: 0, keys: [] }
  }

  /**
   * Check if cache item exists and is valid
   */
  has(
    key: string,
    storage?: "localStorage" | "sessionStorage" | "memory"
  ): boolean {
    return this.get(key, storage) !== null
  }

  /**
   * Get or set cache item (lazy loading pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      ttl?: number
      storage?: "localStorage" | "sessionStorage" | "memory"
    }
  ): Promise<T | null> {
    // Try to get from cache first
    const cached = this.get<T>(key, options?.storage)
    if (cached !== null) {
      return cached
    }

    try {
      // Fetch fresh data
      const data = await fetcher()

      // Store in cache
      this.set(key, data, options)

      return data
    } catch (error) {
      console.error("Cache getOrSet error:", error)
      return null
    }
  }

  /**
   * Invalidate cache items by pattern
   */
  invalidatePattern(
    pattern: string,
    storage?: "localStorage" | "sessionStorage" | "memory"
  ): void {
    const storageType = storage || "memory"
    const stats = this.getStats(storageType)

    stats.keys.forEach((key) => {
      if (key.includes(pattern)) {
        this.delete(key, storageType)
      }
    })
  }

  /**
   * Evict oldest items from memory cache
   */
  private evictOldest(): void {
    const entries = Array.from(this.memoryCache.entries())
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp)

    // Remove oldest 10% of entries
    const toRemove = Math.ceil(entries.length * 0.1)
    for (let i = 0; i < toRemove && entries[i]; i++) {
      this.memoryCache.delete(entries[i][0])
    }
  }

  /**
   * Cleanup expired items
   */
  cleanup(storage?: "localStorage" | "sessionStorage" | "memory"): number {
    const storageType = storage || "memory"
    const stats = this.getStats(storageType)
    let cleaned = 0

    stats.keys.forEach((key) => {
      const item = this.get(key, storageType)
      if (item === null) {
        // This will auto-remove expired items
        cleaned++
      }
    })

    return cleaned
  }
}

// Default cache instances for different use cases
export const appCache = new CacheManager({
  ttl: 4 * 60 * 60 * 1000, // 4 hours
  maxSize: 50,
  prefix: "school_app_",
})

export const userCache = new CacheManager({
  ttl: 8 * 60 * 60 * 1000, // 8 hours (full session)
  maxSize: 20,
  prefix: "school_user_",
})

export const sessionCache = new CacheManager({
  ttl: 8 * 60 * 60 * 1000, // 8 hours (match session timeout)
  maxSize: 30,
  prefix: "school_session_",
})

// Utility functions for common caching patterns
export const cacheUtils = {
  // Cache API responses
  cacheApiResponse: <T>(
    endpoint: string,
    data: T,
    ttl = 2 * 60 * 60 * 1000 // 2 hours
  ) => {
    appCache.set(`api_${endpoint}`, data, { ttl, storage: "memory" })
  },

  // Get cached API response
  getCachedApiResponse: <T>(endpoint: string): T | null => {
    return appCache.get<T>(`api_${endpoint}`, "memory")
  },

  // Cache user session data
  cacheUserSession: (userId: string, sessionData: any) => {
    userCache.set(`session_${userId}`, sessionData, {
      ttl: 8 * 60 * 60 * 1000, // 8 hours (full session)
      storage: "sessionStorage",
    })
  },

  // Get cached user session
  getCachedUserSession: (userId: string) => {
    return userCache.get(`session_${userId}`, "sessionStorage")
  },

  // Cache form data temporarily
  cacheFormData: (formId: string, formData: any) => {
    sessionCache.set(`form_${formId}`, formData, {
      ttl: 2 * 60 * 60 * 1000, // 2 hours
      storage: "sessionStorage",
    })
  },

  // Get cached form data
  getCachedFormData: (formId: string) => {
    return sessionCache.get(`form_${formId}`, "sessionStorage")
  },

  // Clear user-specific caches on logout
  clearUserCaches: (userId?: string) => {
    userCache.clear("sessionStorage")
    sessionCache.clear("sessionStorage")

    if (userId) {
      appCache.invalidatePattern(`user_${userId}`)
    }
  },

  // Cleanup all expired caches
  cleanupAll: () => {
    const results = {
      app: appCache.cleanup("memory"),
      user: userCache.cleanup("sessionStorage"),
      session: sessionCache.cleanup("sessionStorage"),
    }

    console.log("Cache cleanup results:", results)
    return results
  },
}

// Auto cleanup every 10 minutes
if (typeof window !== "undefined") {
  setInterval(
    () => {
      cacheUtils.cleanupAll()
    },
    10 * 60 * 1000
  )
}

export default CacheManager
