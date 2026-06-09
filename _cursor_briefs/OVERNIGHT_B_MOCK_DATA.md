# OVERNIGHT B — Mock Data + Chat Histories
## AceVisa.co | Run after OVERNIGHT_A is complete

Read PROJECT_CONTEXT.md before starting.

All data is for testing only. Load into Hashaam, Aneeqa, and Admin profiles.
Run each SQL block in Supabase using: `supabase db execute --file <filename>`
Or paste directly into Supabase SQL editor.

---

## REAL IDs (do not change these)

```
Admin:    2365c12c-8ad8-4cff-a45d-98137019f1d2
Aneeqa:   45f23418-fbb7-472c-b9e2-bddc7eac40ff
Hashaam:  55403943-35db-4c2b-94fe-02750ed04352
```

---

## STEP 1 — Create 6 test clients (2 per counselor + 2 for admin pool)

Run this SQL:

```sql
INSERT INTO clients (id, name, email, phone, city, language, ad_source, pipeline_stage, qualification_score, counselor_id, created_at)
VALUES
  -- Hashaam's clients
  ('a1000001-0000-0000-0000-000000000001', 'Zain Abbas', 'zain.test@acetest.com', '03001000001', 'Lahore', 'roman_urdu', 'meta_uk_2024', 2, 7, '55403943-35db-4c2b-94fe-02750ed04352', now() - interval '5 days'),
  ('a1000001-0000-0000-0000-000000000002', 'Fareeha Malik', 'fareeha.test@acetest.com', '03001000002', 'Karachi', 'english', 'direct', 1, 3, '55403943-35db-4c2b-94fe-02750ed04352', now() - interval '3 days'),

  -- Aneeqa's clients
  ('a1000001-0000-0000-0000-000000000003', 'Hamza Riaz', 'hamza.test@acetest.com', '03001000003', 'Islamabad', 'roman_urdu', 'meta_germany_2024', 2, 8, '45f23418-fbb7-472c-b9e2-bddc7eac40ff', now() - interval '7 days'),
  ('a1000001-0000-0000-0000-000000000004', 'Sobia Khan', 'sobia.test@acetest.com', '03001000004', 'Peshawar', 'urdu', 'direct', 1, 2, '45f23418-fbb7-472c-b9e2-bddc7eac40ff', now() - interval '2 days'),

  -- Admin pool (unassigned)
  ('a1000001-0000-0000-0000-000000000005', 'Bilal Chaudhry', 'bilal.test@acetest.com', '03001000005', 'Faisalabad', 'roman_urdu', 'meta_canada_2024', 1, 4, NULL, now() - interval '1 day'),
  ('a1000001-0000-0000-0000-000000000006', 'Nadia Hussain', 'nadia.test@acetest.com', '03001000006', 'Multan', 'roman_urdu', 'direct', 1, 1, NULL, now() - interval '12 hours')
ON CONFLICT (id) DO NOTHING;
```

---

## STEP 2 — Create 3 test meetings

```sql
INSERT INTO meetings (id, client_id, counselor_id, scheduled_time, status, meeting_type, notes, created_at)
VALUES
  -- Zain Abbas with Hashaam (upcoming)
  ('b2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', '55403943-35db-4c2b-94fe-02750ed04352', now() + interval '2 days', 'scheduled', 'video_call', 'UK study visa consultation. Student is qualified, score 7.', now() - interval '4 days'),

  -- Hamza Riaz with Aneeqa (upcoming)
  ('b2000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000003', '45f23418-fbb7-472c-b9e2-bddc7eac40ff', now() + interval '1 day', 'scheduled', 'phone_call', 'Germany study visa. Strong profile, IELTS ready.', now() - interval '6 days'),

  -- Fareeha Malik with Hashaam (completed past meeting)
  ('b2000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000002', '55403943-35db-4c2b-94fe-02750ed04352', now() - interval '1 day', 'completed', 'video_call', 'Initial consultation done. Follow up needed on documents.', now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;
```

---

## STEP 3 — Create chat histories (6 conversations)

Each conversation is realistic and tests a different AI behaviour pattern.

### Conversation A — Zain Abbas (Lahore, settlement seeker, high score)

```sql
INSERT INTO conversations (client_id, message_text, sender, stage_tag, timestamp) VALUES
('a1000001-0000-0000-0000-000000000001', 'Hello, I want to go UK', 'student', 'stage_1', now() - interval '5 days' + interval '1 minute'),
('a1000001-0000-0000-0000-000000000001', 'Lahore se hun, aap ki service ke baare mein sun-na chahta tha', 'ai', 'stage_1', now() - interval '5 days' + interval '2 minutes'),
('a1000001-0000-0000-0000-000000000001', 'UK visa success rate kya hai aap ki? guarantee milti hai?', 'student', 'stage_2', now() - interval '5 days' + interval '3 minutes'),
('a1000001-0000-0000-0000-000000000001', 'Success rate ka seedha jawab main baad mein dunga, pehle yeh batao ke UK mein kya karna chahte ho, padhna ya kaam karna?', 'ai', 'stage_2', now() - interval '5 days' + interval '4 minutes'),
('a1000001-0000-0000-0000-000000000001', 'padhna hai. koi bhi university theek hai. budget bhi zyada nahi', 'student', 'stage_2', now() - interval '5 days' + interval '5 minutes'),
('a1000001-0000-0000-0000-000000000001', 'Budget ki baat hai toh pehle yeh bata, aap ke dost ya family mein kisi ne UK apply kiya hua hai? unka roughly kitna laga tha?', 'ai', 'stage_2', now() - interval '5 days' + interval '6 minutes'),
('a1000001-0000-0000-0000-000000000001', 'mere cousin ka kuch 25 lakh laga tha total', 'student', 'stage_3', now() - interval '5 days' + interval '7 minutes'),
('a1000001-0000-0000-0000-000000000001', 'Theek hai. Agar 20-25 lakh ka range fit kare toh UK mein achi options hain. Ek cheez jo pehle bata deta hun, UK ke liye CAS letter ke baad 28 days ka bank statement bhi hota hai. Yeh plan mein fit karta hai?', 'ai', 'stage_3', now() - interval '5 days' + interval '8 minutes'),
('a1000001-0000-0000-0000-000000000001', 'haan manage ho jata hai. PR ke chances kya hain UK mein?', 'student', 'stage_3', now() - interval '5 days' + interval '9 minutes'),
('a1000001-0000-0000-0000-000000000001', 'UK mein post-study work visa 2 saal ka milta hai, uske baad skilled worker route se PR possible hai. Hamare counselor aap ka exact scenario dekh ke batayenge, free call hai koi commitment nahi. Kal subah ya dopahar?', 'ai', 'stage_4', now() - interval '5 days' + interval '10 minutes'),
('a1000001-0000-0000-0000-000000000001', 'kal 11 baje theek hai', 'student', 'stage_4', now() - interval '5 days' + interval '11 minutes'),
('a1000001-0000-0000-0000-000000000001', 'Theek hai, kal 11 baje ka slot book kar raha hun. Counselor confirm karenge. Koi documents pehle se tayyar rakh lain jaise degree certificate aur IELTS agar hai.', 'ai', 'auto_booking', now() - interval '5 days' + interval '12 minutes');
```

### Conversation B — Fareeha Malik (Karachi, fear-heavy, trust tester)

```sql
INSERT INTO conversations (client_id, message_text, sender, stage_tag, timestamp) VALUES
('a1000001-0000-0000-0000-000000000002', 'Hi I want information about studying abroad', 'student', 'stage_1', now() - interval '3 days' + interval '1 minute'),
('a1000001-0000-0000-0000-000000000002', 'Sure, which country are you interested in?', 'ai', 'stage_1', now() - interval '3 days' + interval '2 minutes'),
('a1000001-0000-0000-0000-000000000002', 'I am not sure. I have heard a lot of consultancies are scams. How do I know you are real?', 'student', 'stage_2', now() - interval '3 days' + interval '3 minutes'),
('a1000001-0000-0000-0000-000000000002', 'That is a completely fair thing to ask. ACE Altius has a physical office in Lahore and all our counselors are verifiable. What specifically would make you feel confident enough to have a conversation?', 'ai', 'stage_2', now() - interval '3 days' + interval '4 minutes'),
('a1000001-0000-0000-0000-000000000002', 'My cousin got scammed last year. She paid 8 lakh and the consultancy disappeared. I am scared the same will happen.', 'student', 'stage_2', now() - interval '3 days' + interval '5 minutes'),
('a1000001-0000-0000-0000-000000000002', 'That is a real fear and your cousin is not alone. Our service fee is paid in stages, never upfront in full. What country were you considering before all this?', 'ai', 'stage_2', now() - interval '3 days' + interval '6 minutes'),
('a1000001-0000-0000-0000-000000000002', 'Canada maybe. I have a BBA and 2 years work experience', 'student', 'stage_3', now() - interval '3 days' + interval '7 minutes'),
('a1000001-0000-0000-0000-000000000002', 'BBA with 2 years experience is actually a strong profile for Canada. Do you have an IELTS score or are you still preparing?', 'ai', 'stage_3', now() - interval '3 days' + interval '8 minutes'),
('a1000001-0000-0000-0000-000000000002', 'No IELTS yet. I am worried I will fail', 'student', 'stage_3', now() - interval '3 days' + interval '9 minutes'),
('a1000001-0000-0000-0000-000000000002', 'Most people worry about that and most people pass with the right prep. We can start with IELTS training before the visa step. What is your rough budget for the whole process?', 'ai', 'stage_3', now() - interval '3 days' + interval '10 minutes'),
('a1000001-0000-0000-0000-000000000002', 'Maybe 15 lakh total but I am not sure', 'student', 'stage_3', now() - interval '3 days' + interval '11 minutes'),
('a1000001-0000-0000-0000-000000000002', 'That is a workable range for Canada with IELTS prep included. A counselor can walk you through exactly what fits in that budget with no surprises. Free call, no pressure. Would morning or afternoon work?', 'ai', 'stage_4', now() - interval '3 days' + interval '12 minutes');
```

### Conversation C — Hamza Riaz (Islamabad, qualified, Germany route)

```sql
INSERT INTO conversations (client_id, message_text, sender, stage_tag, timestamp) VALUES
('a1000001-0000-0000-0000-000000000003', 'Salam, Germany ke baare mein poochna tha', 'student', 'stage_1', now() - interval '7 days' + interval '1 minute'),
('a1000001-0000-0000-0000-000000000003', 'Walaikum salam. Germany ka kya plan hai, padhna hai ya kaam?', 'ai', 'stage_1', now() - interval '7 days' + interval '2 minutes'),
('a1000001-0000-0000-0000-000000000003', 'Masters karna chahta hun Computer Science mein. IELTS 7.5 hai mera', 'student', 'stage_2', now() - interval '7 days' + interval '3 minutes'),
('a1000001-0000-0000-0000-000000000003', 'IELTS 7.5 ke saath Germany ke top universities ke liye strong profile hai. Konsa field CS mein prefer karta hai, AI, software engineering ya aur kuch?', 'ai', 'stage_2', now() - interval '7 days' + interval '4 minutes'),
('a1000001-0000-0000-0000-000000000003', 'AI aur data science. Budget ke baare mein bata do pehle', 'student', 'stage_2', now() - interval '7 days' + interval '5 minutes'),
('a1000001-0000-0000-0000-000000000003', 'Depend karta hai university pe. Germany mein ek cheez hai jo pehle bata deta hun, blocked account 11,208 EUR ka hota hai jo visa ke liye bank mein show karna padta hai. Yeh aap ke budget mein fit karta hai?', 'ai', 'stage_2', now() - interval '7 days' + interval '6 minutes'),
('a1000001-0000-0000-0000-000000000003', 'Han mujhe pata tha. Family ne arrange kiya hua hai. Total 30-35 lakh ka budget hai', 'student', 'stage_3', now() - interval '7 days' + interval '7 minutes'),
('a1000001-0000-0000-0000-000000000003', '30-35 lakh mein Germany ka complete package comfortable hai. TU Munich aur RWTH Aachen CS mein world class hain. Next intake June 2025 ka hai. Kitni jaldi start karna chahte hain?', 'ai', 'stage_3', now() - interval '7 days' + interval '8 minutes'),
('a1000001-0000-0000-0000-000000000003', 'Jitni jaldi ho sake. Documents ready hain mere. When can I meet a counselor?', 'student', 'stage_4', now() - interval '7 days' + interval '9 minutes'),
('a1000001-0000-0000-0000-000000000003', 'Kal ka slot available hai subah 10 baje. Book kar deta hun, counselor confirm kar lenge.', 'ai', 'auto_booking', now() - interval '7 days' + interval '10 minutes');
```

### Conversation D — Sobia Khan (Peshawar, family delegator, Urdu)

```sql
INSERT INTO conversations (client_id, message_text, sender, stage_tag, timestamp) VALUES
('a1000001-0000-0000-0000-000000000004', 'السلام علیکم۔ بیرون ملک پڑھنے کے بارے میں معلومات چاہیے', 'student', 'stage_1', now() - interval '2 days' + interval '1 minute'),
('a1000001-0000-0000-0000-000000000004', 'وعلیکم السلام۔ کونسے ملک میں پڑھنا چاہتی ہیں؟', 'ai', 'stage_1', now() - interval '2 days' + interval '2 minutes'),
('a1000001-0000-0000-0000-000000000004', 'ابھی پکا نہیں۔ والدین کو بھی منانا ہے۔ وہ فکرمند ہیں', 'student', 'stage_1', now() - interval '2 days' + interval '3 minutes'),
('a1000001-0000-0000-0000-000000000004', 'یہ بہت عام بات ہے۔ والدین کی فکر سمجھ میں آتی ہے۔ ابھی کون سی پڑھائی کر رہی ہیں؟', 'ai', 'stage_1', now() - interval '2 days' + interval '4 minutes'),
('a1000001-0000-0000-0000-000000000004', 'BA کر رہی ہوں انگریزی میں۔ IELTS نہیں ہے ابھی', 'student', 'stage_2', now() - interval '2 days' + interval '5 minutes'),
('a1000001-0000-0000-0000-000000000004', 'IELTS کے بغیر بھی شروع ہو سکتا ہے، پہلے تیاری کرواتے ہیں۔ اگر والدین کو سمجھانا ہو تو میں مدد کر سکتا ہوں۔ گھر میں کون فیصلہ کرتے ہیں زیادہ تر؟', 'ai', 'stage_2', now() - interval '2 days' + interval '6 minutes'),
('a1000001-0000-0000-0000-000000000004', 'ابو کرتے ہیں۔ وہ کہتے ہیں پہلے یہاں نوکری کرو', 'student', 'stage_2', now() - interval '2 days' + interval '7 minutes'),
('a1000001-0000-0000-0000-000000000004', 'ابو کی بات بالکل سمجھ آتی ہے۔ آپ ان کو یہ بتا سکتی ہیں کہ ہمارے counselor ان سے بھی بات کر سکتے ہیں، سب کچھ سمجھائیں گے۔ کیا ابو کبھی فون پر بات کریں گے؟', 'ai', 'stage_3', now() - interval '2 days' + interval '8 minutes');
```

### Conversation E — Bilal Chaudhry (Faisalabad, price objector, unassigned)

```sql
INSERT INTO conversations (client_id, message_text, sender, stage_tag, timestamp) VALUES
('a1000001-0000-0000-0000-000000000005', 'bhai canada ka kharcha kitna hai', 'student', 'stage_1', now() - interval '1 day' + interval '1 minute'),
('a1000001-0000-0000-0000-000000000005', 'Depend karta hai goals pe. Tum roughly kya soch ke aaye ho?', 'ai', 'stage_1', now() - interval '1 day' + interval '2 minutes'),
('a1000001-0000-0000-0000-000000000005', 'koi bhi university theek hai. mere dost ka 12 lakh mein ho gaya tha', 'student', 'stage_1', now() - interval '1 day' + interval '3 minutes'),
('a1000001-0000-0000-0000-000000000005', 'Usne kya kya count kiya tha us mein? Aksar log pehle saal ka accommodation aur blocked account alg hota hai.', 'ai', 'stage_2', now() - interval '1 day' + interval '4 minutes'),
('a1000001-0000-0000-0000-000000000005', 'nahi pata. tum kitna charge karte ho?', 'student', 'stage_2', now() - interval '1 day' + interval '5 minutes'),
('a1000001-0000-0000-0000-000000000005', 'Service fee tab hoti hai jab seriously aage badhna ho. Pehle counselor se free mein baat karo. Pehle yeh bata ke Canada mein kya karna hai, padhna ya kaam?', 'ai', 'stage_2', now() - interval '1 day' + interval '6 minutes'),
('a1000001-0000-0000-0000-000000000005', 'padhna hai. mechanical engineering', 'student', 'stage_2', now() - interval '1 day' + interval '7 minutes'),
('a1000001-0000-0000-0000-000000000005', 'Mechanical Canada mein achi field hai post-study work ke liye. IELTS hai koi?', 'ai', 'stage_3', now() - interval '1 day' + interval '8 minutes'),
('a1000001-0000-0000-0000-000000000005', 'nahi abhi tak', 'student', 'stage_3', now() - interval '1 day' + interval '9 minutes'),
('a1000001-0000-0000-0000-000000000005', 'Theek hai IELTS pehla step hoga. Budget roughly kitna soch ke chal rahe ho, 15 lakh ke upar ya neeche?', 'ai', 'stage_3', now() - interval '1 day' + interval '10 minutes');
```

### Conversation F — Nadia Hussain (Multan, very early stage)

```sql
INSERT INTO conversations (client_id, message_text, sender, stage_tag, timestamp) VALUES
('a1000001-0000-0000-0000-000000000006', 'hello', 'student', 'stage_1', now() - interval '12 hours' + interval '1 minute'),
('a1000001-0000-0000-0000-000000000006', 'Salam, kaise madad kar sakta hun?', 'ai', 'stage_1', now() - interval '12 hours' + interval '2 minutes'),
('a1000001-0000-0000-0000-000000000006', 'sirf info chahiye thi', 'student', 'stage_1', now() - interval '12 hours' + interval '3 minutes'),
('a1000001-0000-0000-0000-000000000006', 'Bilkul. Kaunse mulk ke baare mein?', 'ai', 'stage_1', now() - interval '12 hours' + interval '4 minutes');
```

---

## STEP 4 — Create AI profiles for qualified clients

```sql
INSERT INTO ai_profiles (client_id, stage, qualification_score, detected_language, detected_region, detected_fears, detected_behaviour_type, service_match, last_updated, profile_json)
VALUES
  ('a1000001-0000-0000-0000-000000000001', 4, 7, 'roman_urdu', 'lahore', ARRAY['visa_refusal', 'financial_loss'], 'information_seeker', 'study_visa',
   now() - interval '5 days',
   '{"client_summary": "Zain is a Lahore-based student interested in UK study but shows strong settlement intent signals. He asked about PR pathways early and accepted the blocked account disclosure without hesitation. Budget of 25 lakh confirmed.", "qualification_score": 7, "goal_country": "UK", "study_field": "Undecided", "budget_type": "family", "primary_fear": "wrong_decision", "behaviour_type": "information_seeker", "recommended_service_pathway": "Study Visa — UK route with post-study work visa explanation", "suggested_talking_points": ["Lead with post-study work visa 2-year option", "Mention Graduate Route visa explicitly", "Address settlement goal honestly — UK has a clear pathway"], "what_to_avoid": "Do not push specific universities too early. He is outcome-focused not education-focused.", "closing_strategy": "Assumption close works here. He agreed to the meeting time immediately."}'::jsonb),

  ('a1000001-0000-0000-0000-000000000003', 4, 8, 'roman_urdu', 'islamabad', ARRAY['timing_pressure'], 'trust_tester', 'study_visa',
   now() - interval '7 days',
   '{"client_summary": "Hamza is highly qualified — IELTS 7.5, CS background, Germany-specific, family funding confirmed, documents ready. This is a fast close. He asked to meet immediately.", "qualification_score": 8, "goal_country": "Germany", "study_field": "AI/Data Science", "budget_type": "family", "ielts_score": "7.5", "primary_fear": "timing_pressure", "behaviour_type": "trust_tester", "recommended_service_pathway": "Study Visa — Germany Masters route, TU Munich or RWTH Aachen", "suggested_talking_points": ["Blocked account already known and accepted", "Focus on June 2025 intake timeline", "Mention APS certificate requirement for Pakistani students"], "what_to_avoid": "Do not slow him down. He is ready to move. Any hesitation from counselor side will lose him.", "closing_strategy": "He is already sold. Meeting is booked. Just confirm documents checklist and timeline."}'::jsonb)
ON CONFLICT (client_id) DO UPDATE SET
  stage = EXCLUDED.stage,
  qualification_score = EXCLUDED.qualification_score,
  detected_language = EXCLUDED.detected_language,
  detected_region = EXCLUDED.detected_region,
  detected_fears = EXCLUDED.detected_fears,
  detected_behaviour_type = EXCLUDED.detected_behaviour_type,
  service_match = EXCLUDED.service_match,
  last_updated = EXCLUDED.last_updated,
  profile_json = EXCLUDED.profile_json;
```

---

## STEP 5 — Create tasks for counselors

```sql
INSERT INTO tasks (id, client_id, counselor_id, title, description, priority, status, due_date, created_at)
VALUES
  ('c3000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', '55403943-35db-4c2b-94fe-02750ed04352', 'Prepare UK brief for Zain Abbas', 'Review AI profile and prepare talking points before meeting', 'high', 'pending', now() + interval '1 day', now() - interval '4 days'),
  ('c3000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002', '55403943-35db-4c2b-94fe-02750ed04352', 'Send IELTS resources to Fareeha', 'Student expressed IELTS fear. Send prep materials and book IELTS training call.', 'medium', 'pending', now() + interval '3 days', now() - interval '2 days'),
  ('c3000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000003', '45f23418-fbb7-472c-b9e2-bddc7eac40ff', 'Verify Hamza documents before Germany meeting', 'Check APS certificate status. Confirm blocked account arrangement.', 'high', 'in_progress', now() + interval '12 hours', now() - interval '6 days'),
  ('c3000001-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000004', '45f23418-fbb7-472c-b9e2-bddc7eac40ff', 'Follow up Sobia Khan family call', 'Student mentioned father is the decision maker. Offer a family consultation call.', 'medium', 'pending', now() + interval '5 days', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;
```

---

## STEP 6 — Create documents for test clients

```sql
INSERT INTO documents (client_id, document_type, file_name, status, uploaded_at)
VALUES
  ('a1000001-0000-0000-0000-000000000001', 'passport', 'zain_passport.pdf', 'verified', now() - interval '4 days'),
  ('a1000001-0000-0000-0000-000000000001', 'degree', 'zain_degree.pdf', 'uploaded', now() - interval '4 days'),
  ('a1000001-0000-0000-0000-000000000003', 'passport', 'hamza_passport.pdf', 'verified', now() - interval '6 days'),
  ('a1000001-0000-0000-0000-000000000003', 'degree', 'hamza_degree.pdf', 'verified', now() - interval '6 days'),
  ('a1000001-0000-0000-0000-000000000003', 'ielts', 'hamza_ielts_75.pdf', 'verified', now() - interval '6 days'),
  ('a1000001-0000-0000-0000-000000000003', 'bank_statement', 'hamza_bank.pdf', 'uploaded', now() - interval '5 days')
ON CONFLICT DO NOTHING;
```

---

## STEP 7 — Create notifications for counselors

```sql
INSERT INTO notifications (counselor_id, type, title, body, client_id, meeting_id, is_read, created_at)
VALUES
  ('55403943-35db-4c2b-94fe-02750ed04352', 'meeting_reminder', 'Meeting tomorrow — Zain Abbas', 'Your UK consultation with Zain Abbas is scheduled for tomorrow. AI brief is ready.', 'a1000001-0000-0000-0000-000000000001', 'b2000001-0000-0000-0000-000000000001', false, now() - interval '1 hour'),
  ('55403943-35db-4c2b-94fe-02750ed04352', 'chat_message', 'New message — Fareeha Malik', 'Fareeha sent a new message about IELTS preparation.', 'a1000001-0000-0000-0000-000000000002', NULL, false, now() - interval '2 hours'),
  ('45f23418-fbb7-472c-b9e2-bddc7eac40ff', 'meeting_reminder', 'Meeting tomorrow — Hamza Riaz', 'Germany consultation with Hamza Riaz is tomorrow morning. Documents checklist ready.', 'a1000001-0000-0000-0000-000000000003', 'b2000001-0000-0000-0000-000000000002', false, now() - interval '30 minutes'),
  ('2365c12c-8ad8-4cff-a45d-98137019f1d2', 'assignment', 'New unassigned leads', '2 new clients registered directly and are waiting for assignment.', NULL, NULL, false, now() - interval '1 hour')
ON CONFLICT DO NOTHING;
```

---

## STEP 8 — Create activity log entries

```sql
INSERT INTO student_activity_log (client_id, counselor_id, action_type, description, metadata, created_at)
VALUES
  ('a1000001-0000-0000-0000-000000000001', '55403943-35db-4c2b-94fe-02750ed04352', 'meeting_booked', 'Meeting booked via AI chat for UK consultation', '{"method": "auto_booking", "time": "tomorrow 11am"}', now() - interval '5 days' + interval '12 minutes'),
  ('a1000001-0000-0000-0000-000000000001', NULL, 'ai_message_sent', 'AI sent message at stage stage_4', '{"stage": "stage_4"}', now() - interval '5 days' + interval '10 minutes'),
  ('a1000001-0000-0000-0000-000000000003', '45f23418-fbb7-472c-b9e2-bddc7eac40ff', 'meeting_booked', 'Meeting booked via AI chat for Germany Masters consultation', '{"method": "auto_booking"}', now() - interval '7 days' + interval '10 minutes'),
  ('a1000001-0000-0000-0000-000000000003', '45f23418-fbb7-472c-b9e2-bddc7eac40ff', 'document_uploaded', 'IELTS certificate uploaded', '{"document_type": "ielts"}', now() - interval '6 days'),
  ('a1000001-0000-0000-0000-000000000002', '55403943-35db-4c2b-94fe-02750ed04352', 'counselor_note', 'Initial consultation completed. Student has IELTS fear. Recommended IELTS training first.', '{}', now() - interval '1 day')
ON CONFLICT DO NOTHING;
```

---

## DONE WHEN

- [x] All 6 test clients visible in Supabase `clients` table
- [x] All 3 meetings visible in `meetings` table
- [x] Conversations exist for all 6 clients (check `conversations` table)
- [x] AI profiles exist for Zain and Hamza (check `ai_profiles` table)
- [x] Hashaam's dashboard shows Zain and Fareeha as his clients
- [x] Aneeqa's dashboard shows Hamza and Sobia as her clients
- [x] Admin pool shows Bilal and Nadia as unassigned
- [x] Meeting brief for Zain (`/dashboard/brief/b2000001-0000-0000-0000-000000000001`) loads without 404
- [x] Meeting brief for Hamza (`/dashboard/brief/b2000001-0000-0000-0000-000000000002`) loads without 404

## NEXT STEP
Open `_cursor_briefs/OVERNIGHT_C_PHASE3.md` in a new Cursor agent window and begin immediately.
