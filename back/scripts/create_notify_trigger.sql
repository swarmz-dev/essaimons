-- Create or replace the notify function
CREATE OR REPLACE FUNCTION notify_user_notification() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('user_notification', json_build_object(
    'id', NEW.id,
    'user_id', NEW.user_id,
    'notification_id', NEW.notification_id,
    'created_at', NEW.created_at
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS user_notification_trigger ON user_notifications;

-- Create the trigger
CREATE TRIGGER user_notification_trigger
AFTER INSERT ON user_notifications
FOR EACH ROW
EXECUTE FUNCTION notify_user_notification();

-- Verify the trigger was created
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'user_notification_trigger';
