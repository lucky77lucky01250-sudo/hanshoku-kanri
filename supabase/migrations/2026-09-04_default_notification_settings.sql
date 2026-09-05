-- 新規サインアップ時に、既定の通知設定を自動作成する。
--
-- 背景: notification_settings に行が無いと通知が一切送られない。
-- しかし行は設定画面を開いて保存したときにしか作られなかったため、
-- 設定画面を開かなかった利用者に通知が届かない「設定漏れ」が発生していた
-- （2026-09-04、農家A(34頭)で発覚。手動で行を作成して復旧済み）。
--
-- 対策: メール/パスワード・OAuth など全サインアップ経路をカバーするため、
-- アプリ側ではなく auth.users への AFTER INSERT トリガーで既定行を作る。
-- 冪等（ON CONFLICT DO NOTHING）なので再実行しても二重作成しない。
CREATE OR REPLACE FUNCTION public.create_default_notification_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_settings (user_id, email, notify_7days, notify_3days)
  VALUES (NEW.id, COALESCE(NEW.email, ''), true, true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_notify ON auth.users;
CREATE TRIGGER on_auth_user_created_notify
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_settings();
