-- Read-only self-check for Release 1. Every row should say ok = true.
SELECT 'cases report has one row per case' AS check_name,
       (SELECT count(*) FROM v_cases_report) = (SELECT count(*) FROM deals) AS ok,
       (SELECT count(*) FROM v_cases_report)::text || ' vs ' || (SELECT count(*) FROM deals)::text AS detail
UNION ALL
SELECT 'payments view total = recorded payments',
       COALESCE((SELECT sum(amount) FROM v_payments_wide WHERE status = 'recorded'), 0) = COALESCE((SELECT sum(amount) FROM payments WHERE COALESCE(status, 'recorded') = 'recorded'), 0),
       COALESCE((SELECT sum(amount) FROM v_payments_wide WHERE status = 'recorded'), 0)::text
UNION ALL
SELECT 'payments view has one row per payment',
       (SELECT count(*) FROM v_payments_wide) = (SELECT count(*) FROM payments),
       (SELECT count(*) FROM v_payments_wide)::text
UNION ALL
SELECT 'profit view received = cases view received',
       COALESCE((SELECT sum(received) FROM v_profit_by_service), 0) = COALESCE((SELECT sum(received) FROM v_cases_wide), 0),
       COALESCE((SELECT sum(received) FROM v_profit_by_service), 0)::text
UNION ALL
SELECT 'profit math: before = received - refunds - expenses - instructor',
       NOT EXISTS (SELECT 1 FROM v_profit_by_service
                    WHERE profit_before_incentives <> received - refunded - expenses_total - instructor_commission),
       'row-level check'
UNION ALL
SELECT 'profit math: after = before - incentives',
       NOT EXISTS (SELECT 1 FROM v_profit_by_service
                    WHERE profit_after_incentives <> profit_before_incentives - incentives_pending - incentives_committed),
       'row-level check'
UNION ALL
SELECT 'services view covers every case',
       (SELECT count(*) FROM v_services_wide WHERE service_key LIKE 'case:%') = (SELECT count(*) FROM deals),
       (SELECT count(*) FROM v_services_wide)::text || ' services total'
UNION ALL
SELECT 'every case has an application date',
       NOT EXISTS (SELECT 1 FROM deals WHERE applied_at IS NULL),
       (SELECT count(*) FROM deals WHERE applied_at IS NULL)::text || ' missing'
UNION ALL
SELECT 'five starter saved views exist',
       (SELECT count(*) FROM saved_views WHERE owner_id IS NULL) >= 5,
       (SELECT count(*) FROM saved_views WHERE owner_id IS NULL)::text || ' starter views'
UNION ALL
SELECT 'new tables exist and are locked down',
       (SELECT count(*) FROM pg_class WHERE relname IN ('agents', 'agent_institutions') AND relrowsecurity) = 2,
       'agents, agent_institutions';
