-- 繁殖牛管理システム DBスキーマ
-- Supabase SQL Editorで実行してください

-- cows テーブル
CREATE TABLE cows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ear_tag TEXT NOT NULL,
  birth_date DATE,
  father_name TEXT,
  mother_name TEXT,
  current_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (current_status IN ('estrus_pending', 'inseminated', 'pregnancy_check_pending', 'calving_pending', 'idle')),
  next_action_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- breeding_cycles テーブル（1頭につき複数サイクル）
CREATE TABLE breeding_cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cow_id UUID REFERENCES cows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- insemination_records テーブル（再種付け対応）
CREATE TABLE insemination_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID REFERENCES breeding_cycles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insemination_date DATE NOT NULL,
  semen_name TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- breeding_events テーブル
CREATE TABLE breeding_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID REFERENCES breeding_cycles(id) ON DELETE CASCADE NOT NULL,
  cow_id UUID REFERENCES cows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  estrus_date DATE,
  pregnancy_check_date DATE,
  pregnancy_result BOOLEAN,
  expected_calving_date DATE,
  actual_calving_date DATE,
  calf_gender TEXT CHECK (calf_gender IN ('male', 'female')),
  calf_weight NUMERIC(5,1),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- notification_settings テーブル
CREATE TABLE notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  notify_7days BOOLEAN NOT NULL DEFAULT true,
  notify_3days BOOLEAN NOT NULL DEFAULT true
);

-- notification_logs テーブル（重複送信防止）
CREATE TABLE notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cow_id UUID REFERENCES cows(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(cow_id, notification_type, scheduled_date)
);

-- RLSポリシー（全テーブルに設定）
ALTER TABLE cows ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeding_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE insemination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- cows: 自分のレコードのみ
CREATE POLICY "own cows only" ON cows FOR ALL USING (auth.uid() = user_id);

-- breeding_cycles: 自分のuser_idかつcow_idも自分のものであること（cross-user INSERT防止）
CREATE POLICY "own cycles only" ON breeding_cycles FOR ALL USING (
  auth.uid() = user_id AND
  cow_id IN (SELECT id FROM cows WHERE user_id = auth.uid())
);

-- insemination_records: 自分のuser_idかつcycle_idも自分のものであること
CREATE POLICY "own inseminations only" ON insemination_records FOR ALL USING (
  auth.uid() = user_id AND
  cycle_id IN (SELECT id FROM breeding_cycles WHERE user_id = auth.uid())
);

-- breeding_events: 自分のuser_idかつcow_idも自分のものであること
CREATE POLICY "own events only" ON breeding_events FOR ALL USING (
  auth.uid() = user_id AND
  cow_id IN (SELECT id FROM cows WHERE user_id = auth.uid())
);

CREATE POLICY "own notification_settings only" ON notification_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own notification_logs only" ON notification_logs FOR ALL USING (auth.uid() = user_id);

-- breeding_cyclesのcycle_number重複防止
ALTER TABLE breeding_cycles ADD CONSTRAINT unique_cow_cycle UNIQUE (cow_id, cycle_number);
