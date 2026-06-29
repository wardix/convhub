CREATE TABLE IF NOT EXISTS tags (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS conversation_tags (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id          UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, tag_id)
);
