-- Add extracted content column for full-text search of PDFs, docs, images
-- The extracted_content stores text extracted from documents or AI descriptions of images

ALTER TABLE files ADD COLUMN extracted_content TEXT;
ALTER TABLE files ADD COLUMN extraction_method TEXT;

-- Add full-text search index on extracted content
CREATE INDEX idx_files_content_search ON files USING GIN(to_tsvector('english', COALESCE(extracted_content, '')));

COMMENT ON COLUMN files.extracted_content IS 'Text extracted from PDFs/docs or AI description of images';
COMMENT ON COLUMN files.extraction_method IS 'Method used: pdf-parse, mammoth, openai-vision, plain-text, filename-only';
