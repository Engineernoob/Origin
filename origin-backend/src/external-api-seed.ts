import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VideosService } from './videos/videos.service';
import { Axios } from 'axios';
import { CreateVideoDto } from './videos/dto/create-video.dto';

// External video APIs (you can replace these with any video source)
const EXTERNAL_API_SOURCES = [
  {
    name: 'Pexels Videos API',
    url: 'https://api.pexels.com/videos/search',
    headers: {
      'Authorization': 'YOUR_PEXELS_API_KEY', // You'll need to get this
    },
    transform: (data: any) => data.videos.map((v: any) => ({
      title: v.user?.name || 'Creator',
      videoUrl: v.video_files[0]?.link,
      thumbnailUrl: v.image,
      tags: ['stock', 'video'],
      isRebelContent: false,
    }))
  },
  {
    name: 'Pixabay Videos API',
    url: 'https://pixabay.com/api/videos/',
    params: {
      key: 'YOUR_PIXABAY_API_KEY', // You'll need to get this
      category: 'film',
      pretty: true,
    },
    transform: (data: any) => data.hits.map((v: any) => ({
        title: v.tags || 'Video',
        videoUrl: v.videos?.large?.url || v.videos?.medium?.url,
        thumbnailUrl: v.thumbnail_large,
        tags: v.tags?.split(', ') || ['video'],
        isRebelContent: false,
      }))
  },
  // Public Domain Videos (no API key needed)
  {
    name: 'Public Domain',
    videos: [
      {
        title: "Space Shuttle Launch - NASA Archive",
        description: "Historic NASA shuttle launch footage from the public domain",
        creatorName: "NASA Archives",
        creatorSubscribers: "500K", 
        creatorVerified: true,
        videoUrl: "https://archive.org/download/shuttle_launch/shuttle_launch_512kb.mp4",
        thumbnailUrl: "https://archive.org/download/shuttle_launch/shuttle_launch.thumbs/shuttle_launch_000001.jpg",
        tags: ["space", "NASA", "history", "public domain"],
        isRebelContent: false,
      },
      {
        title: "Big Buck Bunny (Public Domain)",
        description: "Open source animated film from Blender Foundation",
        creatorName: "Blender Foundation",
        creatorSubscribers: "2.5M",
        creatorVerified: true,
        videoUrl: "https://archive.org/download/BigBuckBunny_328/BigBuckBunny_512kb.mp4",
        thumbnailUrl: "https://archive.org/download/BigBuckBunny_328/BigBuckBunny.thumbs/BigBuckBunny_000001.jpg",
        tags: ["animation", "open source", "blender", "public domain"],
        isRebelContent: false,
      },
      {
        title: "The Great Train Robbery (1903)",
        description: "Classic silent film from 1903 - public domain",
        creatorName: "Edison Studios", 
        creatorSubscribers: "100K",
        creatorVerified: true,
        videoUrl: "https://archive.org/download/great_train_robbery/great_train_robbery_512kb.mp4",
        thumbnailUrl: "https://archive.org/download/great_train_robbery/great_train_robbery.thumbs/great_train_robbery_000001.jpg",
        tags: ["classic", "silent film", "history", "public domain"],
        isRebelContent: false,
      },
      {
        title: "Corporate Media Exposé",
        description: "Investigative documentary on media manipulation and corporate control over information",
        creatorName: "Independent Journalist",
        creatorSubscribers: "85K",
        creatorVerified: false,
        videoUrl: "https://archive.org/download/corporate_media_expose/corporate_media_expose_512kb.mp4",
        thumbnailUrl: "https://archive.org/download/corporate_media_expose/corporate_media_expose.thumbs/corporate_media_expose_000001.jpg",
        tags: ["documentary", "media", "investigation", "corporate"],
        isRebelContent: true,
      },
      {
        title: "Censored History: Untold Truths",
        description: "Historical events and facts deliberately hidden from mainstream education",
        creatorName: "Alternative History Channel",
        creatorSubscribers: "125K", 
        creatorVerified: false,
        videoUrl: "https://archive.org/download/censored_history/censored_history_512kb.mp4",
        thumbnailUrl: "https://archive.org/download/censored_history/censored_history.thumbs/censored_history_000001.jpg",
        tags: ["history", "education", "censored", "documentary"],
        isRebelContent: true,
      },
      {
        title: "Web Development Tutorial 2024",
        description: "Complete guide to modern web development with React, Node.js, and TypeScript",
        creatorName: "Dev Mastery",
        creatorSubscribers: "200K",
        creatorVerified: true,
        videoUrl: "https://archive.org/download/web_dev_tutorial_2024/web_dev_tutorial_2024_512kb.mp4",
        thumbnailUrl: "https://archive.org/download/web_dev_tutorial_2024/web_dev_tutorial_2024.thumbs/web_dev_tutorial_2024_000001.jpg",
        tags: ["web development", "programming", "tutorial", "JavaScript"],
        isRebelContent: false,
      },
      {
        title: "The Truth About Big Tech Surveillance",
        description: "How major tech companies track and profile users without their knowledge",
        creatorName: "Privacy Advocate",
        creatorSubscribers: "150K",
        creatorVerified: false,
        videoUrl: "https://archive.org/download/tech_surveillance_truth/tech_surveillance_truth_512kb.mp4",
        thumbnailUrl: "https://archive.org/download/tech_surveillance_truth/tech_surveillance_truth.thumbs/tech_surveillance_truth_000001.jpg",
        tags: ["privacy", "technology", "surveillance", "documentary"],
        isRebelContent: true,
      },
      {
        title: "Advanced System Design Course",
        description: "Learn to build scalable systems that handle millions of users",
        creatorName: "System Architecture Pro",
        creatorSubscribers: "300K",
        creatorVerified: true,
        videoUrl: "https://archive.org/download/system_design_course/system_design_course_512kb.mp4",
        thumbnailUrl: "https://archive.org/download/system_design_course/system_design_course.thumbs/system_design_course_000001.jpg",
        tags: ["architecture", "engineering", "scalability", "tutorial"],
        isRebelContent: false,
      }
    ]
  }
];

async function seedFromExternalAPIs() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const videosService = app.get(VideosService);
  const axios = new Axios();

  console.log('🌐 Seeding from external APIs...');

  for (const source of EXTERNAL_API_SOURCES) {
    console.log(`\n📥 Fetching from ${source.name}...`);

    try {
      if (source.name === 'Public Domain') {
        // Use hardcoded public domain videos
        const videos = source.videos as CreateVideoDto[];
        
        for (const videoData of videos) {
          try {
            // Check if video already exists
            const existing = await videosService.findMany({ q: videoData.title });
            if (existing.length === 0) {
              const video = await videosService.create(videoData);
              console.log(`✅ Added: ${videoData.title}`);
            } else {
              console.log(`⏭️  Already exists: ${videoData.title}`);
            }
          } catch (error) {
            console.error(`❌ Failed to add ${videoData.title}:`, error);
          }
        }
      } else {
        // For API sources (Pexels, Pixabay) - you'd need API keys
        console.log(`⚠️  Skipping ${source.name} - requires API key setup`);
        
        // Example of how you'd implement:
        /*
        const response = await axios.get(source.url, {
          headers: source.headers,
          params: source.params,
        });
        
        const transformedVideos = source.transform(response.data);
        
        for (const video of transformedVideos) {
          const createDto: CreateVideoDto = {
            title: video.title,
            description: `Video from ${source.name}`,
            creatorName: 'External Creator',
            creatorVerified: false,
            videoUrl: video.videoUrl,
            thumbnailUrl: video.thumbnailUrl,
            tags: video.tags,
            isRebelContent: video.isRebelContent,
          };
          
          try {
            await videosService.create(createDto);
            console.log(`✅ Added: ${video.title}`);
          } catch (error) {
            console.error(`❌ Failed to add ${video.title}:`, error);
          }
        }
        */
      }
    } catch (error) {
      console.error(`❌ Failed to fetch from ${source.name}:`, error);
    }
  }

  console.log('\n🎉 External API seeding completed!');
  await app.close();
}

seedFromExternalAPIs().catch(async (error) => {
  console.error('❌ External API seeding failed:', error);
  process.exit(1);
});
