-- Removes everything created by mock_test_data_seed.sql. Review the counts first (see SELECT below).
-- audit_events is append-only and is intentionally NOT touched.
-- Preview: SELECT count(*) FROM clients WHERE notes = 'MOCK_SEED';
DO $$
DECLARE ids uuid[]; dids uuid[];
BEGIN
  SELECT array_agg(id) INTO ids FROM clients WHERE notes = 'MOCK_SEED';
  IF ids IS NULL THEN RAISE NOTICE 'No mock clients'; RETURN; END IF;
  SELECT array_agg(id) INTO dids FROM deals WHERE client_id = ANY(ids);

  DELETE FROM incentives         WHERE client_id = ANY(ids);
  DELETE FROM case_clearance     WHERE deal_id  = ANY(dids);
  DELETE FROM case_counselor_shares WHERE deal_id = ANY(dids);
  DELETE FROM milestones         WHERE client_id = ANY(ids);
  DELETE FROM refunds            WHERE client_id = ANY(ids);
  DELETE FROM vouchers           WHERE client_id = ANY(ids);
  DELETE FROM expenses           WHERE client_id = ANY(ids) OR notes = 'MOCK_SEED';
  DELETE FROM payments           WHERE client_id = ANY(ids);
  DELETE FROM invoices           WHERE client_id = ANY(ids);
  DELETE FROM deals              WHERE client_id = ANY(ids);
  DELETE FROM client_assignments WHERE client_id = ANY(ids);
  DELETE FROM activity_logs      WHERE client_id = ANY(ids);
  DELETE FROM clients            WHERE id = ANY(ids);
  RAISE NOTICE 'Removed % mock clients', array_length(ids,1);
END $$;
-- If a DELETE fails on a foreign key (a table referencing clients/invoices that mock activity touched),
-- delete from that child table where client_id = ANY(ids) and rerun.
