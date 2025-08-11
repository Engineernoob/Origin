"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  RotateCcw,
  RotateCw,
  Heart,
  Share,
  Flag,
  MessageCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  creator: {
    name: string;
    avatar?: string;
    subscribers: string;
    isVerified?: boolean;
  };
  views: string;
  likes: number;
  dislikes: number;
  uploadDate: string;
  description: string;
  isRebelContent?: boolean;
  tags?: string[];
}

export function VideoPlayer({
  videoUrl,
  title,
  creator,
  views,
  likes,
  dislikes,
  uploadDate,
  description,
  isRebelContent = false,
  tags = [],
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [quality, setQuality] = useState("720p");
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
    };
  }, []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (isDisliked) setIsDisliked(false);
  };

  const handleDislike = () => {
    setIsDisliked(!isDisliked);
    if (isLiked) setIsLiked(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Video Player */}
      <div className="relative aspect-video bg-black group">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onClick={togglePlayPause}
        />

        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Button
              size="lg"
              className="h-16 w-16 rounded-full bg-white/90 hover:bg-white text-black"
              onClick={togglePlayPause}
            >
              <Play className="h-8 w-8 ml-1" />
            </Button>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Progress Bar */}
          <div className="mb-4">
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="flex justify-between text-white text-sm mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <div className="w-20">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setQuality("240p")}>
                    240p
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setQuality("360p")}>
                    360p
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setQuality("480p")}>
                    480p
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setQuality("720p")}>
                    720p ✓
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setQuality("1080p")}>
                    1080p
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => videoRef.current?.requestFullscreen()}
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Info */}
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-xl font-semibold">{title}</h1>
              {isRebelContent && (
                <Badge variant="destructive" className="rebel-glow">
                  REBEL
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {views} views • {uploadDate}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant={isLiked ? "default" : "outline"}
              size="sm"
              onClick={handleLike}
              className="flex items-center gap-2"
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              {likes + (isLiked ? 1 : 0)}
            </Button>

            <Button
              variant={isDisliked ? "default" : "outline"}
              size="sm"
              onClick={handleDislike}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {dislikes + (isDisliked ? 1 : 0)}
            </Button>

            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>

            <Button variant="outline" size="sm">
              <Flag className="h-4 w-4 mr-2" />
              Report
            </Button>
          </div>
        </div>

        {/* Creator Info */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={creator.avatar} alt={creator.name} />
              <AvatarFallback>{creator.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{creator.name}</h3>
                {creator.isVerified && (
                  <Badge variant="secondary" className="text-xs">
                    ✓
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {creator.subscribers} subscribers
              </p>
            </div>
          </div>
          <Button className="origin-gradient">Subscribe</Button>
        </div>

        {/* Description */}
        <div className="mt-4">
          <Button
            variant="ghost"
            onClick={() => setShowDescription(!showDescription)}
            className="mb-2 p-0 h-auto font-normal"
          >
            {showDescription ? "Show less" : "Show more"}
          </Button>
          {showDescription && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="whitespace-pre-wrap text-sm">{description}</p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
