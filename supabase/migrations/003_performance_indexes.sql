-- Performance indexes for high-traffic question and attempt paths.
-- Keep these aligned with the local SQLite indexes in lib/db/sqlite.ts.

create index if not exists idx_questions_status_topic
  on questions (status, topic_id, difficulty, created_at);

create index if not exists idx_questions_status_exam_free
  on questions (status, exam_id, is_free, difficulty, created_at);

create index if not exists idx_options_question
  on question_options (question_id);

create index if not exists idx_matches_question
  on question_matches (question_id);

create index if not exists idx_match_choices_question
  on question_match_choices (question_id);

create index if not exists idx_numeric_answers_question
  on numeric_answers (question_id);

create index if not exists idx_attempts_user_mode_started
  on attempts (user_id, mode, started_at);

create index if not exists idx_attempt_questions_attempt_order
  on attempt_questions (attempt_id, order_index);

create index if not exists idx_attempt_questions_attempt_question
  on attempt_questions (attempt_id, question_id);

create index if not exists idx_attempt_answers_attempt_question
  on attempt_answers (attempt_id, question_id);
