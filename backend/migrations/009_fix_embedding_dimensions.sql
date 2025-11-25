-- Fix embedding dimensions for local embedding model (all-MiniLM-L6-v2 produces 384-dim vectors)

-- Drop existing index if any
DROP INDEX IF EXISTS idx_file_index_embedding;

-- Alter column to accept 384-dimensional vectors
ALTER TABLE file_index
ALTER COLUMN embedding TYPE vector(384);

-- Create index for vector similarity search
CREATE INDEX idx_file_index_embedding ON file_index USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
