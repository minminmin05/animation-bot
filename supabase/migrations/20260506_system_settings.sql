-- System Settings Table
-- Stores global configuration for the school management system

CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'settings',
  school_name TEXT NOT NULL DEFAULT 'Lumaid School',
  school_name_thai TEXT DEFAULT 'โรงเรียนลุมายด์',
  default_language TEXT NOT NULL DEFAULT 'th',
  timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok',
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#1a2744',
  accent_color TEXT DEFAULT '#e07a5f',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Notification Settings Table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Default system settings
INSERT INTO public.system_settings (id, school_name, school_name_thai, default_language, timezone)
VALUES ('settings', 'Lumaid School', 'โรงเรียนลุมายด์', 'th', 'Asia/Bangkok')
ON CONFLICT (id) DO NOTHING;

-- Default notification settings (will be created per user)
-- Keys: new_student, grade_update, attendance_alert, schedule_change

-- Enable Row Level Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- System settings: only admins can update, everyone can read
CREATE POLICY "Anyone can read system settings"
  ON public.system_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can update system settings"
  ON public.system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Only admins can insert system settings"
  ON public.system_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'owner')
    )
  );

-- Notification settings: users can manage their own, admins can manage all
CREATE POLICY "Users can read own notification settings"
  ON public.notification_settings FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'owner')
  ));

CREATE POLICY "Users can insert own notification settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON public.notification_settings FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'owner')
  ));

CREATE POLICY "Users can delete own notification settings"
  ON public.notification_settings FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'owner')
  ));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
