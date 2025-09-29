import { ApiProperty } from '@nestjs/swagger';

export class AiResponseDto {
  @ApiProperty({ 
    example: '🌟 Exciting news! Our summer collection is here! Check out our latest products and don\'t miss this amazing opportunity! #NewLaunch #ExcitingNews #SummerCollection' 
  })
  content: string;

  @ApiProperty({ 
    example: 'gpt-3.5-turbo' 
  })
  model: string;

  @ApiProperty({ 
    example: 45 
  })
  tokensUsed: number;

  @ApiProperty({ 
    example: 'Create an engaging social media post for the following topic. Make it catchy, include relevant emojis, and add appropriate hashtags. Keep it concise and shareable.\n\nTopic/Requirements: Create a social media post about our new summer collection launch' 
  })
  promptUsed: string;
}
