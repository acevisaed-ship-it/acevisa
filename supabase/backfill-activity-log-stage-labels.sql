-- Backfill raw stage tags in activity log descriptions to human-readable labels
UPDATE student_activity_log
SET description = CASE
  WHEN description LIKE '%stage_1%' THEN 'AI responded — New Lead'
  WHEN description LIKE '%stage_2%' THEN 'AI responded — Qualified'
  WHEN description LIKE '%stage_3%' THEN 'AI responded — Registered Client'
  WHEN description LIKE '%stage_4%' THEN 'AI responded — Documents in Progress'
  WHEN description LIKE '%stage_5%' THEN 'AI responded — Application Submitted'
  WHEN description LIKE '%auto_booking%' THEN 'AI booked a meeting automatically'
  WHEN description LIKE '%auto_reply%' THEN 'AI sent auto-reply (counselor away)'
  WHEN description LIKE '%active%' THEN 'AI assistant responded to client'
  ELSE description
END
WHERE action_type = 'ai_message_sent'
  AND description LIKE 'AI sent message at stage%';
