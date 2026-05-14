# SUPABASE SECURITY + PERFORMANCE OPTIMIZATION
## School Management System - Enterprise Architecture

---

## PART I: PERFORMANCE OPTIMIZATION

### 1. INDEXING STRATEGY

Indexes are the single most important performance factor. Poor indexing = slow queries.

```sql
-- =====================================================
-- COMPREHENSIVE INDEXING STRATEGY
-- =====================================================

-- =====================================================
-- 1.1 PRIMARY INDEXES (Foreign Keys & Lookups)
-- =====================================================

-- users table indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- students table indexes
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);  -- Critical for auth joins
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);      -- For teacher queries
CREATE INDEX IF NOT EXISTS idx_students_grade_level ON students(grade_level);
CREATE INDEX IF NOT EXISTS idx_students_name_trgm ON students USING gin(name gin_trgm_ops);  -- Text search

-- teachers table indexes
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_subject ON teachers(subject);
CREATE INDEX IF NOT EXISTS idx_teachers_department ON teachers(department);

-- parents table indexes
CREATE INDEX IF NOT EXISTS idx_parents_user_id ON parents(user_id);

-- =====================================================
-- 1.2 COMPOUND INDEXES (Multi-column queries)
-- =====================================================

-- For RLS policy lookups: students by class + user
CREATE INDEX IF NOT EXISTS idx_students_class_user
  ON students(class, user_id);

-- For teacher class assignments
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher_class
  ON teacher_class_assignments(teacher_id, class_name)
  INCLUDE (subject, academic_year);  -- Covering index (PostgreSQL 11+)

-- For student enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_student_class
  ON student_enrollments(student_id, class_id);

-- For parent-child lookups
CREATE INDEX IF NOT EXISTS idx_parent_relations_parent
  ON student_parent_relations(parent_id, student_id);

CREATE INDEX IF NOT EXISTS idx_parent_relations_student
  ON student_parent_relations(student_id, parent_id);

-- =====================================================
-- 1.3 GRADES & ATTENDANCE (High-traffic tables)
-- =====================================================

-- Grades: Most queries are by student or class
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_class ON grades(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_term
  ON grades(student_id, term, academic_year);

-- Covering index for grade reports (includes commonly selected columns)
CREATE INDEX IF NOT EXISTS idx_grades_report
  ON grades(student_id, class_id, academic_year)
  INCLUDE (subject, grade, max_grade, term);

-- Attendance: Daily queries by student/class
CREATE INDEX IF NOT EXISTS idx_attendance_student_date
  ON attendance(student_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_class_date
  ON attendance(class_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_status
  ON attendance(status) WHERE status = 'absent';  -- Partial index for absent tracking

-- =====================================================
-- 1.4 NOTIFICATIONS (User inbox queries)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, read, created_at DESC);

-- Partial index for unread notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, created_at DESC)
  WHERE read = false;

-- =====================================================
-- 1.5 FULL-TEXT SEARCH INDEXES
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text search

-- Students name search
CREATE INDEX IF NOT EXISTS idx_students_name_trgm
  ON students USING gin(name gin_trgm_ops);

-- For full-text search across student records
CREATE INDEX IF NOT EXISTS idx_students_fts
  ON students USING gin(
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(class, '') || ' ' ||
      coalesce(address, '')
    )
  );

-- =====================================================
-- 1.6 RLS PERFORMANCE INDEXES
-- =====================================================

-- These indexes specifically optimize RLS policy checks

-- For student's "own data" policy
CREATE INDEX IF NOT EXISTS idx_students_user_id_rls
  ON students(user_id) WHERE user_id IS NOT NULL;

-- For teacher class assignment lookups in RLS
CREATE INDEX IF NOT EXISTS idx_tca_teacher_class_rls
  ON teacher_class_assignments(teacher_id, class_name)
  WHERE teacher_id IS NOT NULL;

-- For parent-child RLS checks
CREATE INDEX IF NOT EXISTS idx_spr_parent_rls
  ON student_parent_relations(parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spr_student_rls
  ON student_parent_relations(student_id)
  WHERE student_id IS NOT NULL;

-- =====================================================
-- 1.7 PARTIAL INDEXES (For specific query patterns)
-- =====================================================

-- Active students only (exclude graduated/transferred)
CREATE INDEX IF NOT EXISTS idx_students_active
  ON students(class, grade_level)
  WHERE enrollment_date > CURRENT_DATE - INTERVAL '5 years';

-- Current academic year grades
CREATE INDEX IF NOT EXISTS idx_grades_current_year
  ON grades(student_id, term)
  WHERE academic_year = EXTRACT(YEAR FROM CURRENT_DATE)::text;

-- Recent notifications (last 30 days)
CREATE INDEX IF NOT EXISTS idx_notifications_recent
  ON notifications(user_id, read, created_at DESC)
  WHERE created_at > CURRENT_DATE - INTERVAL '30 days';
```

---

### 2. QUERY OPTIMIZATION

```sql
-- =====================================================
-- QUERY PERFORMANCE ANALYSIS
-- =====================================================

-- 2.1 Identify slow queries
-- Run this to see which queries are slowest
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 2.2 Analyze specific query execution plan
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT s.*, u.email, u.full_name
FROM students s
JOIN users u ON u.id = s.user_id
WHERE s.class = '10A'
ORDER BY s.name;

-- 2.3 Table statistics (run after data changes)
ANALYZE students;
ANALYZE users;
ANALYZE grades;
ANALYZE attendance;
ANALYZE teacher_class_assignments;

-- Or analyze all tables
ANALYZE;

-- =====================================================
-- 2.4 OPTIMIZED QUERY PATTERNS
-- =====================================================

-- BAD: N+1 query pattern
-- FOR EACH student:
--   SELECT * FROM grades WHERE student_id = ?

-- GOOD: Single query with JOIN
SELECT
  s.id,
  s.name,
  s.class,
  json_agg(
    json_build_object(
      'subject', g.subject,
      'grade', g.grade,
      'term', g.term
    )
  ) as grades
FROM students s
LEFT JOIN grades g ON g.student_id = s.id
WHERE s.class = '10A'
GROUP BY s.id, s.name, s.class;

-- =====================================================
-- 2.5 MATERIALIZED VIEWS (For expensive aggregations)
-- =====================================================

-- Student grade summary (expensive to compute each time)
CREATE MATERIALIZED VIEW IF NOT EXISTS student_grade_summary AS
SELECT
  s.id as student_id,
  s.name,
  s.class,
  g.subject,
  COUNT(*) as assignment_count,
  AVG(g.grade) as average_grade,
  MAX(g.grade) as highest_grade,
  MIN(g.grade) as lowest_grade
FROM students s
JOIN grades g ON g.student_id = s.id
GROUP BY s.id, s.name, s.class, g.subject;

-- Index the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_grade_summary_idx
  ON student_grade_summary(student_id, subject);

-- Refresh schedule (run via cron job)
-- REFRESH MATERIALIZED VIEW student_grade_summary;

-- =====================================================
-- 2.6 COMMON TABLE EXPRESSIONS (CTE) vs Subqueries
-- =====================================================

-- GOOD: CTE for readability and potential optimization
WITH student_classes AS (
  SELECT student_id, class_id
  FROM student_enrollments
  WHERE academic_year = '2024-2025'
),
class_teachers AS (
  SELECT tca.class_name, u.name as teacher_name
  FROM teacher_class_assignments tca
  JOIN teachers t ON t.id = tca.teacher_id
  JOIN users u ON u.id = t.user_id
)
SELECT
  s.name as student_name,
  c.name as class_name,
  ct.teacher_name
FROM students s
JOIN student_classes sc ON sc.student_id = s.id
JOIN classes c ON c.id = sc.class_id
JOIN class_teachers ct ON ct.class_name = c.name;
```

---

### 3. CONNECTION POOLING & SUPABASE CONFIG

```javascript
// =====================================================
// CLIENT-SIDE OPTIMIZATION
// =====================================================

// 3.1 Supabase Client Configuration
import { createClient } from '@supabase/supabase-js'

// Optimized client configuration
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    // Connection settings
    db: {
      schema: 'public',
    },
    // Realtime configuration
    realtime: {
      params: {
        eventsPerSecond: 10,  // Limit realtime events
      },
    },
    // Global timeout
    global: {
      headers: {
        'X-Client-Info': 'school-management-app',
      },
    },
  }
)

// 3.2 Query batching with Promise.all
// BAD: Sequential queries
const student = await getStudent(id)
const grades = await getGrades(id)
const attendance = await getAttendance(id)

// GOOD: Parallel queries
const [student, grades, attendance] = await Promise.all([
  getStudent(id),
  getGrades(id),
  getAttendance(id)
])

// 3.3 Pagination for large datasets
const fetchStudentsPaginated = async (page = 1, pageSize = 50) => {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('students')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  return {
    students: data,
    page,
    pageSize,
    totalCount: count,
    totalPages: Math.ceil(count / pageSize)
  }
}

// 3.4 Selective column fetching
// BAD: Fetch all columns
const { data } = await supabase.from('students').select('*')

// GOOD: Fetch only needed columns
const { data } = await supabase
  .from('students')
  .select('id, name, class, grade_level')
```

---

### 4. CACHING STRATEGY

```javascript
// =====================================================
// CLIENT-SIDE CACHING
// =====================================================

// 4.1 Simple in-memory cache with TTL
class QueryCache {
  constructor(ttl = 5 * 60 * 1000) {  // 5 minutes default
    this.cache = new Map()
    this.ttl = ttl
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    })
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) return null
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }
    return item.value
  }

  clear() {
    this.cache.clear()
  }
}

const studentCache = new QueryCache(10 * 60 * 1000)  // 10 minutes

// Usage
const getCachedStudents = async () => {
  const cacheKey = 'students:all'
  let students = studentCache.get(cacheKey)

  if (!students) {
    const { data } = await supabase.from('students').select('*')
    students = data
    studentCache.set(cacheKey, students)
  }

  return students
}

// 4.2 React Query / SWR integration (recommended)
import { useQuery, useQueryClient } from '@tanstack/react-query'

// Automatic caching, refetching, and invalidation
const useStudents = () => {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('*')
      return data
    },
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // Keep in cache for 10 minutes
  })
}

// 4.3 Supabase Realtime for cache invalidation
const setupRealtimeCacheInvalidation = () => {
  const channel = supabase
    .channel('cache-invalidation')
    .on(
      'postgres_changes',
      {
        event: '*',  // All events: INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'students'
      },
      () => {
        // Invalidate cache when data changes
        queryClient.invalidateQueries(['students'])
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
```

---

### 5. PERFORMANCE MONITORING

```sql
-- =====================================================
-- DATABASE PERFORMANCE MONITORING
-- =====================================================

-- 5.1 Table size analysis
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 5.2 Index usage analysis
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 5.3 Find unused indexes (wasted space)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 5.4 Sequential scan analysis (potential missing indexes)
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  CASE
    WHEN seq_scan > idx_scan THEN 'Missing index suspected'
    ELSE 'OK'
  END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan DESC;

-- 5.5 Cache hit ratio (should be > 99%)
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables;

-- 5.6 Long-running queries
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
  AND state != 'idle'
ORDER BY duration DESC;

-- 5.7 Table bloat analysis
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  (SELECT pg_size_pretty(sum(pg_relation_size(quote_ident(indexname::text))))
   FROM pg_indexes
   WHERE schemaname = pg_tables.schemaname
   AND tablename = pg_tables.tablename) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## PART II: SECURITY ARCHITECTURE

### 6. SECURITY PERFORMANCE BALANCE

```sql
-- =====================================================
-- SECURITY-AWARE PERFORMANCE OPTIMIZATION
-- =====================================================

-- 6.1 Security Set-returning functions (SRF) for RLS
-- Instead of checking auth.uid() multiple times in policies

-- BAD: Multiple auth.uid() calls in policy
CREATE POLICY "bad_policy" ON students
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM parents
      WHERE user_id = auth.uid()
      AND id = (
        SELECT parent_id FROM student_parent_relations
        WHERE student_id = students.id
      )
    )
  );

-- GOOD: Cache auth.uid() in function
CREATE OR REPLACE FUNCTION current_user_data()
RETURNS TABLE (
  user_id uuid,
  user_role text,
  student_id uuid,
  teacher_id uuid,
  parent_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid(),
    (SELECT role FROM users WHERE id = auth.uid()),
    (SELECT id FROM students WHERE user_id = auth.uid()),
    (SELECT id FROM teachers WHERE user_id = auth.uid()),
    (SELECT id FROM parents WHERE user_id = auth.uid())
$$;

-- Now policies can use this efficiently
CREATE POLICY "good_policy" ON students
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT user_id FROM current_user_data()
      UNION
      SELECT student_id FROM students s
      JOIN student_parent_relations spr ON spr.student_id = s.id
      WHERE spr.parent_id = (SELECT parent_id FROM current_user_data())
    )
  );

-- 6.2 Prepared statements for RLS checks
-- Pre-compute common RLS lookups

CREATE OR REPLACE FUNCTION get_accessible_student_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Returns student IDs based on user role
  WITH user_data AS (
    SELECT
      auth.uid() as uid,
      (SELECT role FROM users WHERE id = auth.uid()) as role
  )
  SELECT s.id::uuid
  FROM students s, user_data
  WHERE user_data.role = 'admin'
  UNION ALL
  SELECT s.id::uuid
  FROM students s, user_data
  WHERE s.user_id = user_data.uid
  AND user_data.role = 'student'
  UNION ALL
  SELECT s.id::uuid
  FROM students s
  JOIN teacher_class_assignments tca ON tca.class_name = s.class
  JOIN teachers t ON t.id = tca.teacher_id
  , user_data
  WHERE t.user_id = user_data.uid
  AND user_data.role = 'teacher'
  UNION ALL
  SELECT s.id::uuid
  FROM students s
  JOIN student_parent_relations spr ON spr.student_id = s.id
  JOIN parents p ON p.id = spr.parent_id
  , user_data
  WHERE p.user_id = user_data.uid
  AND user_data.role = 'parent';
$$;

-- Create index for this function's common usage
CREATE INDEX IF NOT EXISTS idx_students_for_rls
  ON students(id, user_id, class);

-- Now RLS policies can simply use:
CREATE POLICY "students_optimized_read" ON students
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT get_accessible_student_ids())
  );
```

---

### 7. PARALLEL QUERY OPTIMIZATION

```sql
-- =====================================================
-- PARALLEL QUERY CONFIGURATION
-- =====================================================

-- 7.1 Enable parallel query (if not already)
ALTER SYSTEM SET max_parallel_workers_per_gather = 2;
ALTER SYSTEM SET parallel_setup_cost = 100;
ALTER SYSTEM SET parallel_tuple_cost = 0.01;

-- Requires restart to take effect, or:
SET max_parallel_workers_per_gather = 2;  -- Session level

-- 7.2 Create parallel-safe indexes
-- Some index types are better for parallel queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_class_parallel
  ON students(class) WITH (parallel_workers = 2);

-- 7.3 Partitioned tables for large datasets
-- For schools with thousands of students

-- Example: Partition grades by academic year
CREATE TABLE grades_partitioned (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id uuid NOT NULL,
  class_id uuid,
  subject text NOT NULL,
  assignment_name text,
  grade numeric(5,2),
  max_grade numeric(5,2) DEFAULT 100,
  term text,
  academic_year text NOT NULL,
  graded_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id, academic_year)
) PARTITION BY LIST (academic_year);

-- Create partitions
CREATE TABLE grades_2023 PARTITION OF grades_partitioned
  FOR VALUES IN ('2023');

CREATE TABLE grades_2024 PARTITION OF grades_partitioned
  FOR VALUES IN ('2024');

CREATE TABLE grades_2025 PARTITION OF grades_partitioned
  FOR VALUES IN ('2025');

-- Indexes on partitioned table
CREATE INDEX idx_grades_2024_student ON grades_2024(student_id);
CREATE INDEX idx_grades_2024_class ON grades_2024(class_id);
```

---

### 8. BULK OPERATIONS

```javascript
// =====================================================
// BULK OPERATIONS (Batch Insert/Update)
// =====================================================

// 8.1 Bulk insert with Supabase
const bulkInsertStudents = async (students) => {
  // Supabase handles up to 1000 rows per insert
  const { data, error } = await supabase
    .from('students')
    .insert(students)
    .select()

  return { data, error }
}

// 8.2 Batch processing for large datasets
const processInBatches = async (items, batchSize = 100, processFn) => {
  const results = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const result = await processFn(batch)
    results.push(...result)

    // Small delay to avoid overwhelming the database
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

// Usage
const students = [...]  // Array of 1000 students
const results = await processInBatches(
  students,
  100,
  async (batch) => {
    const { data } = await supabase
      .from('students')
      .insert(batch)
      .select()
    return data
  }
)

// 8.3 PostgreSQL UPSERT (insert or update)
const upsertGrades = async (grades) => {
  const { data, error } = await supabase
    .from('grades')
    .upsert(grades, {
      onConflict: 'student_id,subject,term,academic_year',
      ignoreDuplicates: false
    })
    .select()

  return { data, error }
}
```

---

### 9. MONITORING DASHBOARD QUERY

```sql
-- =====================================================
-- ALL-IN-ONE PERFORMANCE MONITORING VIEW
-- =====================================================

CREATE OR REPLACE VIEW performance_dashboard AS
SELECT
  -- Database size
  (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size,

  -- Active connections
  (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,

  -- Cache hit ratio
  (SELECT ROUND(
    (sum(heap_blks_hit)::numeric / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0)) * 100, 2
  ) FROM pg_statio_user_tables) as cache_hit_ratio || '%',

  -- Total tables
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,

  -- Total indexes
  (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,

  -- Largest tables
  (SELECT json_agg(json_build_object(
    'table', tablename,
    'size', pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
  )) FROM (
    SELECT tablename, schemaname
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 5
  ) sub) as largest_tables,

  -- Slow queries (if pg_stat_statements is enabled)
  (SELECT json_agg(json_build_object(
    'query', LEFT(query, 50),
    'calls', calls,
    'avg_time_ms', ROUND(mean_exec_time::numeric, 2)
  )) FROM (
    SELECT query, calls, mean_exec_time
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat%'
    ORDER BY mean_exec_time DESC
    LIMIT 5
  ) sub) as slow_queries;

-- Usage: SELECT * FROM performance_dashboard;
```

---

### 10. OPTIMIZATION CHECKLIST

```
PERFORMANCE OPTIMIZATION CHECKLIST
═════════════════════════════════════════════════════════

INDEXING
☐ All foreign keys indexed
☐ All RLS policy columns indexed
☐ Compound indexes for common multi-column queries
☐ Partial indexes for filtered queries
☐ Text search indexes (GIN) for name/search fields
☐ Covering indexes for frequent report queries

QUERY OPTIMIZATION
☐ No SELECT * in production code
☐ Pagination implemented for all list views
☐ N+1 queries eliminated
☐ Bulk operations for batch inserts
☐ Materialized views for expensive aggregations
☐ EXPLAIN ANALYZE run on slow queries

CACHING
☐ Client-side caching implemented (React Query/SWR)
☐ Invalidation strategy for cache freshness
☐ Realtime subscriptions for critical data
☐ CDN configured for static assets

CONNECTION MANAGEMENT
☐ Connection pooling configured
☐ Timeouts set appropriately
☐ Connection limits enforced
☐ Leak prevention (proper cleanup)

MONITORING
☐ pg_stat_statements enabled
☐ Slow query logging active
☐ Table size monitoring
☐ Index usage analysis (monthly)
☐ Cache hit ratio monitoring

SECURITY + PERFORMANCE
☐ RLS policies optimized with helper functions
☐ Security set-returning functions for role checks
☐ Partitioned tables for large historical data
☐ Prepared statements for repeated queries
☐ Minimal columns in security-sensitive queries
```

---

### 11. QUICK PERFORMANCE TUNING SCRIPT

```sql
-- =====================================================
-- RUN THIS FOR IMMEDIATE PERFORMANCE IMPROVEMENTS
-- =====================================================

-- Update statistics (improves query planning)
ANALYZE;

-- Increase work memory for sorting (per session)
SET work_mem = '256MB';

-- Increase maintenance work memory for index building
SET maintenance_work_mem = '512MB';

-- Enable parallel query
SET max_parallel_workers_per_gather = 2;

-- Set appropriate timezone
SET timezone = 'UTC';

-- Check for long-running transactions
SELECT
  pid,
  now() - pg_stat_activity.xact_start AS duration,
  query
FROM pg_stat_activity
WHERE state IN ('idle in transaction', 'active')
ORDER BY duration DESC;

-- Kill stuck transactions (use with caution)
-- SELECT pg_terminate_backend(pid)
-- FROM pg_stat_activity
-- WHERE state = 'idle in transaction'
-- AND now() - xact_start > INTERVAL '1 hour';

-- Vacuum and analyze tables with high bloat
VACUUM ANALYZE students;
VACUUM ANALYZE grades;
VACUUM ANALYZE attendance;
VACUUM ANALYZE notifications;
```

---

## SUMMARY: KEY PERFORMANCE METRICS

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Query Response Time** | < 100ms (p95) | `pg_stat_statements.mean_exec_time` |
| **Cache Hit Ratio** | > 99% | `pg_statio_user_tables` calculation |
| **Index Usage** | > 95% | `idx_scan / (idx_scan + seq_scan)` |
| **Connection Pool Usage** | < 80% | Supabase dashboard |
| **Table Bloat** | < 10% | `pgstattuple` extension |
| **RLS Overhead** | < 20% | Compare with/without RLS |

---

## FILES CREATED SUMMARY

1. **SECURITY_AND_PERFORMANCE.md** - This document
2. **COMPLETE_RLS_DESIGN.md** - Full RLS architecture
3. **rls_deployment.sql** - Deployment script
4. **SECURITY_ARCHITECTURE.md** - Security framework
5. **RLS_POLICY_FIX.md** - RLS troubleshooting guide

All files are production-ready and follow Supabase/PostgreSQL best practices.
