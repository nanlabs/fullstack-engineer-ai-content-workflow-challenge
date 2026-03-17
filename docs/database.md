# Campaigns

campaigns

id
topic
ai_provider
model
status
created_at

# Campaign_pieces

campaign_pieces

id
campaign_id
piece_type
content
status

# Localizations
localizations

id
piece_id
locale
content
status

# Relation

campaign
   |
   | 1
   |
   |------ n campaign_pieces
              |
              | 1
              |
              |------ n localizations