Analyze the following marketing copy and extract structured metadata.

# Text
{text}

Return a JSON object with these fields:
- sentiment: one of ["positive", "neutral", "negative"]
- tone: one of ["formal", "casual", "playful", "urgent", "aspirational"]
- keywords: array of 3-7 relevant keywords (lowercase)
- estimated_reading_time_seconds: integer
