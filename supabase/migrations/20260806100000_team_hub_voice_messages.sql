alter table team_messages add column if not exists attachment_url text;
alter table team_messages add column if not exists attachment_name text;
alter table team_messages add column if not exists attachment_type text;

alter table direct_messages add column if not exists attachment_url text;
alter table direct_messages add column if not exists attachment_name text;
alter table direct_messages add column if not exists attachment_type text;
