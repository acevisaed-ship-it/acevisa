-- Reference data: visa categories, program levels, countries, stage definitions, exam orgs, services. Idempotent.
INSERT INTO visa_categories (code,label) VALUES
 ('study','Study visa'),('visit','Visit visa'),('d7','D7 / income visa'),('other_d','Other D-type'),('work','Work visa'),('other','Other')
ON CONFLICT (code) DO NOTHING;

INSERT INTO program_levels (code,label,order_no) VALUES
 ('foundation','Foundation',1),('diploma','Diploma',2),('ug','Undergraduate (UG)',3),('pg','Postgraduate (PG)',4),('phd','PhD',5),('other','Other',6)
ON CONFLICT (code) DO NOTHING;

INSERT INTO countries (name) VALUES
 ('Germany'),('United Kingdom'),('Canada'),('Australia'),('Sweden'),('Belgium'),('Italy'),('Portugal'),('Austria'),('Cyprus'),
 ('Denmark'),('Latvia'),('Lithuania'),('Malaysia'),('South Korea'),('Switzerland'),('Turkiye'),('Maldives'),('Ireland'),('USA')
ON CONFLICT (name) DO NOTHING;

INSERT INTO stage_definitions (visa_category_id, code, label, order_no)
SELECT c.id, s.code, s.label, s.ord FROM visa_categories c
JOIN (VALUES
 ('docs_submitted','Documents submitted',1),('admission_processed','Admission processed',2),
 ('pre_admission_interview','Pre-admission interview',3),('offer_letter','Offer letter',4),
 ('pending_requirements','Pending requirements',5),('visa_application','Visa application',6),
 ('embassy_appointment','Embassy appointment',7),('embassy_interview','Embassy interview',8),
 ('biometrics','Biometrics',9),('visa_received','Visa received',10),('visa_rejected','Visa rejected',11),('withdrawn','Withdrawn',12)
) AS s(code,label,ord) ON true WHERE c.code='study'
ON CONFLICT (visa_category_id, code) DO NOTHING;

INSERT INTO stage_definitions (visa_category_id, code, label, order_no)
SELECT c.id, s.code, s.label, s.ord FROM visa_categories c
JOIN (VALUES
 ('assessment_report','Assessment report',1),('docs_received','Documents received',2),('payment','Payment',3),
 ('appointment','Appointment',4),('insurance','Insurance',5),('itinerary','Itinerary',6),
 ('checklist_complete','Checklist complete',7),('flags_raised','Flags raised',8),('travel_dates_set','Travel dates set',9)
) AS s(code,label,ord) ON true WHERE c.code='visit'
ON CONFLICT (visa_category_id, code) DO NOTHING;

INSERT INTO exam_organizations (name) VALUES ('British Council (IELTS)'),('IDP (IELTS)'),('Pearson (PTE)'),('Duolingo'),('ETS (TOEFL)')
ON CONFLICT (name) DO NOTHING;

INSERT INTO services (name, category, default_price) SELECT * FROM (VALUES
 ('File preparation','file_prep',5000::numeric),('Experience letter drafting','experience_letter',3000),
 ('Document preparation','doc_prep',4000),('Simple application','application',6000),('Other service','other',0)
) v(name,category,default_price)
WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.name = v.name);
