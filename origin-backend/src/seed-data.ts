import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VideosService } from './videos/videos.service';
import { CreateVideoDto } from './videos/dto/create-video.dto';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const videosService = app.get(VideosService);

  // Sample videos (using local file paths - you need to add actual video files)
  const sampleVideos: CreateVideoDto[] = [
    {
      title: "Introduction to Web Development",
      description: "A comprehensive guide to getting started with modern web development technologies.",
      creatorName: "Code Learning Hub",
      creatorAvatar: null,
      creatorVerified: true,
      creatorSubscribers: "15K",
      videoUrl: "/uploads/videos/web-dev-intro.mp4",
      thumbnailUrl: "/uploads/thumbnails/web-dev-intro.jpg",
      tags: ["web development", "tutorial", "programming", "beginner"],
      isRebelContent: false,
    },
    {
      title: "The Truth About Social Media",
      description: "An investigative look into how social media platforms manipulate user behavior and data privacy concerns.",
      creatorName: "Digital Privacy Advocate",
      creatorAvatar: null,
      creatorVerified: false,
      creatorSubscribers: "50K",
      videoUrl: "/uploads/videos/social-media-truth.mp4",
      thumbnailUrl: "/uploads/thumbnails/social-media-truth.jpg",
      tags: ["documentary", "privacy", "social media", "investigation"],
      isRebelContent: true,
    },
    {
      title: "Advanced Coding Techniques",
      description: "Professional programming tips and tricks for experienced developers looking to level up their skills.",
      creatorName: "Master Developer",
      creatorAvatar: null,
      creatorVerified: true,
      creatorSubscribers: "100K",
      videoUrl: "/uploads/videos/advanced-coding.mp4",
      thumbnailUrl: "/uploads/thumbnails/advanced-coding.jpg",
      tags: ["programming", "advanced", "tutorial", "professional"],
      isRebelContent: false,
    },
    {
      title: "Censored History You Were Never Taught",
      description: "Uncover the historical events and facts that have been deliberately omitted from mainstream education.",
      creatorName: "Alternative History",
      creatorAvatar: null,
      creatorVerified: false,
      creatorSubscribers: "75K",
      videoUrl: "/uploads/videos/censored-history.mp4",
      thumbnailUrl: "/uploads/thumbnails/censored-history.jpg",
      tags: ["history", "education", "censored", "documentary"],
      isRebelContent: true,
    },
    {
      title: "Building Scalable Applications",
      description: "Learn how to design and implement software architectures that can handle millions of users.",
      creatorName: "System Design Pro",
      creatorAvatar: null,
      creatorVerified: true,
      creatorSubscribers: "200K",
      videoUrl: "/uploads/videos/scalable-apps.mp4",
      thumbnailUrl: "/uploads/thumbnails/scalable-apps.jpg",
      tags: ["architecture", "scaling", "engineering", "tutorial"],
      isRebelContent: false,
    },
  ];

  console.log('🌱 Seeding database with sample videos...');
  
  for (const video of sampleVideos) {
    try {
      // Check if video already exists
      const existing = await videosService.findMany({ q: video.title });
      if (existing.length === 0) {
        await videosService.create(video);
        console.log(`✅ Created video: ${video.title}`);
      } else {
        console.log(`⏭️  Video already exists: ${video.title}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create video: ${video.title}`, error);
    }
  }

  console.log('🎉 Database seeding completed!');
  await app.close();
}

seed().catch(async (error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
