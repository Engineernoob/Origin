import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VideosService } from './videos/videos.service';
import { YoutubeService } from './youtube/youtube.service';
import { CreateVideoDto } from './videos/dto/create-video.dto';

// YouTube search queries to get a variety of content
const YOUTUBE_SEARCH_QUERIES = [
  { query: 'web development tutorial', category: 'educational', rebel: false },
  { query: 'coding tutorial', category: 'educational', rebel: false },
  { query: 'programming guide', category: 'educational', rebel: false },
  { query: 'tech documentaries', category: 'technology', rebel: false },
  { query: 'alternative news', category: 'news', rebel: true },
  { query: 'independent journalism', category: 'news', rebel: true },
  { query: 'censored documentaries', category: 'documentary', rebel: true },
  { query: 'corporate investigations', category: 'investigative', rebel: true },
  { query: 'gaming highlights', category: 'entertainment', rebel: false },
  { query: 'music videos', category: 'entertainment', rebel: false },
  { query: 'science education', category: 'educational', rebel: false },
  { query: 'history documentaries', category: 'education', rebel: false },
];

async function seedFromYouTube() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const videosService = app.get(VideosService);
  const youtubeService = app.get(YoutubeService);

  console.log('🎥 Seeding from YouTube API...\n');

  if (!process.env.YOUTUBE_API_KEY) {
    console.log('❌ YOUTUBE_API_KEY not found in environment variables');
    console.log('Please set YOUTUBE_API_KEY in your .env file');
    await app.close();
    return;
  }

  let totalVideosAdded = 0;

  for (const { query, category, rebel } of YOUTUBE_SEARCH_QUERIES) {
    console.log(`🔍 Searching: "${query}" (${rebel ? 'REBEL' : 'regular'} content)`);

    try {
      const response = await youtubeService.searchVideos(query);
      
      if (!response.items || response.items.length === 0) {
        console.log(`   ⚠️  No videos found for query: ${query}`);
        continue;
      }

      for (const item of response.items) {
        try {
          // Skip if we already have this video
          const existing = await videosService.findMany({ 
            q: item.snippet?.title || '' 
          });
          
          if (existing.length > 0) {
            console.log(`   ⏭️  Already exists: ${item.snippet?.title}`);
            continue;
          }

          // Create video DTO from YouTube data
          const createDto: CreateVideoDto = {
            title: item.snippet?.title || 'Untitled',
            description: item.snippet?.description || '',
            creatorName: item.snippet?.channelTitle || 'Unknown Channel',
            creatorAvatar: item.snippet?.thumbnails?.default?.url || null,
            creatorVerified: ['UCJFp8suSYCjAzM02MIm5B8g', 'UCBR8-60-B28hp2BmDPdntcQ', 'UCSo2pMSQw5XatIxW6nt9sVA'].includes(item.snippet?.channelId || ''), // Some verified channels
            creatorSubscribers: '0', // Would need additional API call
            videoUrl: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
            thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
            tags: extractTagsFromDescription(item.snippet?.description || '', category),
            isRebelContent: rebel,
            externalId: item.id?.videoId || null,
          };

          const video = await videosService.create(createDto);
          console.log(`   ✅ Added: ${item.snippet?.title}`);
          totalVideosAdded++;
        } catch (error) {
          console.error(`   ❌ Failed to add ${item.snippet?.title}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to search for "${query}":`, error);
    }

    // Add delay to avoid YouTube API rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n🎉 YouTube seeding completed! Added ${totalVideosAdded} videos.`);

  if (totalVideosAdded === 0) {
    console.log('\n📖 Tips:');
    console.log('- Make sure your YOUTUBE_API_KEY is valid');
    console.log('- Check if you have API quota remaining');
    console.log('- YouTube API has daily limits');
  }

  await app.close();
}

// Helper function to extract tags from description
function extractTagsFromDescription(description: string, category: string): string[] {
  const tags = [category];
  
  // Extract common keywords
  const commonTags = ['tutorial', 'guide', 'how to', 'learn', 'education', 'documentary', 'news', 'tech', 'programming'];
  
  for (const tag of commonTags) {
    if (description.toLowerCase().includes(tag.toLowerCase())) {
      tags.push(tag);
    }
  }
  
  // Extract hashtags from description
  const hashtags = description.match(/#\w+/g) || [];
  tags.push(...hashtags.map(tag => tag.substring(1).toLowerCase()));
  
  return [...new Set(tags)].slice(0, 10); // Limit to 10 tags
}

seedFromYouTube().catch(async (error) => {
  console.error('❌ YouTube seeding failed:', error);
  process.exit(1);
});
