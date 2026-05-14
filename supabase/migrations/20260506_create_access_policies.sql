-- Migration: Create access_policies table for dynamic access control
-- This replaces hardcoded role checks with flexible policy-based access control

-- Drop existing table if it exists (for development)
DROP TABLE IF EXISTS public.access_policies CASCADE;

-- Create access_policies table
CREATE TABLE public.access_policies (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,

    -- Policy definition
    role text NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin', 'public')),
    resource text NOT NULL, -- e.g., 'grades', 'attendance', 'schedule', 'knowledge_base'
    action text NOT NULL CHECK (action IN ('read', 'write', 'delete', 'manage', 'query')),

    -- Access scope - determines what data this role can access
    scope text NOT NULL CHECK (scope IN ('SELF', 'CHILDREN', 'CLASS', 'ALL', 'NONE')),

    -- Priority (higher = checked first)
    priority integer DEFAULT 0,

    -- Metadata
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,

    -- Constraints
    CONSTRAINT access_policies_name_unique UNIQUE (name)
);

-- Indexes for efficient policy lookups
CREATE INDEX idx_access_policies_role_resource ON public.access_policies(role, resource, action);
CREATE INDEX idx_access_policies_enabled ON public.access_policies(enabled) WHERE enabled = true;
CREATE INDEX idx_access_policies_priority ON public.access_policies(priority DESC);

-- Insert default policies

-- 1. Student policies - SELF scope (own data only)
INSERT INTO public.access_policies (name, description, role, resource, action, scope, priority) VALUES
('student_read_own_grades', 'Students can read their own grades', 'student', 'grades', 'read', 'SELF', 100),
('student_read_own_attendance', 'Students can read their own attendance', 'student', 'attendance', 'read', 'SELF', 100),
('student_read_own_schedule', 'Students can read their own schedule', 'student', 'schedule', 'read', 'SELF', 100),
('student_query_knowledge_base', 'Students can query the knowledge base', 'student', 'knowledge_base', 'query', 'ALL', 50);

-- 2. Teacher policies - CLASS scope (students they teach)
INSERT INTO public.access_policies (name, description, role, resource, action, scope, priority) VALUES
('teacher_read_class_grades', 'Teachers can read grades for their classes', 'teacher', 'grades', 'read', 'CLASS', 100),
('teacher_read_class_attendance', 'Teachers can read attendance for their classes', 'teacher', 'attendance', 'read', 'CLASS', 100),
('teacher_write_grades', 'Teachers can write grades for their classes', 'teacher', 'grades', 'write', 'CLASS', 100),
('teacher_manage_classes', 'Teachers can manage their own classes', 'teacher', 'classes', 'manage', 'CLASS', 100),
('teacher_query_knowledge_base', 'Teachers can query the knowledge base', 'teacher', 'knowledge_base', 'query', 'ALL', 50);

-- 3. Parent policies - CHILDREN scope (their children's data)
INSERT INTO public.access_policies (name, description, role, resource, action, scope, priority) VALUES
('parent_read_child_grades', 'Parents can read their children grades', 'parent', 'grades', 'read', 'CHILDREN', 100),
('parent_read_child_attendance', 'Parents can read their children attendance', 'parent', 'attendance', 'read', 'CHILDREN', 100),
('parent_read_child_schedule', 'Parents can read their children schedule', 'parent', 'schedule', 'read', 'CHILDREN', 100),
('parent_query_knowledge_base', 'Parents can query the knowledge base', 'parent', 'knowledge_base', 'query', 'ALL', 50);

-- 4. Admin policies - ALL scope (everything)
INSERT INTO public.access_policies (name, description, role, resource, action, scope, priority) VALUES
('admin_manage_all', 'Admins can manage everything', 'admin', 'all', 'manage', 'ALL', 1000),
('admin_query_knowledge_base', 'Admins can query the knowledge base', 'admin', 'knowledge_base', 'query', 'ALL', 50);

-- 5. Public policies (for unauthenticated users)
INSERT INTO public.access_policies (name, description, role, resource, action, scope, priority) VALUES
('public_query_knowledge_base', 'Public can query the knowledge base', 'public', 'knowledge_base', 'query', 'ALL', 10);

-- Enable Row Level Security
ALTER TABLE public.access_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for access_policies
-- Only admins can manage policies
CREATE POLICY "admins_manage_policies" ON public.access_policies
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users
        WHERE public.users.id = auth.uid() AND public.users.role = 'admin'
    ));

-- Everyone can read enabled policies
CREATE POLICY "everyone_read_enabled_policies" ON public.access_policies
    FOR SELECT TO public
    USING (enabled = true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_policies TO authenticated;
GRANT SELECT ON public.access_policies TO public;
