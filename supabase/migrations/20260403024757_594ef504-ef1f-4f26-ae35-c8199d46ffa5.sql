
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT DEFAULT 'bug' CHECK (type IN ('bug', 'sugestao', 'outro')),
  message TEXT NOT NULL,
  page TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback" ON feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own feedback" ON feedback
  FOR SELECT USING (user_id = auth.uid());

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'founder';
