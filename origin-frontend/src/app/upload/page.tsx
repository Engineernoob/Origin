"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import { Upload, Video, Image, Flame, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://localhost:3000";

export default function UploadPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isRebelContent, setIsRebelContent] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Redirect if not authenticated
  if (!user) {
    router.push('/');
    return null;
  }

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (500MB max)
      if (file.size > 500 * 1024 * 1024) {
        toast.error("Video file must be smaller than 500MB");
        return;
      }
      setVideoFile(file);
    }
  };

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (5MB max for thumbnails)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Thumbnail file must be smaller than 5MB");
        return;
      }
      setThumbnailFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!videoFile) {
      toast.error("Video file is required");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('tags', tags.trim());
      formData.append('isRebelContent', isRebelContent.toString());

      // Simulate progress (real implementation would use XMLHttpRequest for progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch(`${API_BASE}/videos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Upload failed');
      }

      const result = await response.json();
      
      toast.success("Video uploaded successfully!");
      router.push(`/watch/${result.id}`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Video</h1>
          <p className="text-gray-600">Share your content with the Origin community</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main upload form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Video Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Video file upload */}
                  <div>
                    <Label htmlFor="video-file" className="text-sm font-medium">
                      Video File *
                    </Label>
                    <div className="mt-2">
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="video-file"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-4 text-gray-500" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> video file
                            </p>
                            <p className="text-xs text-gray-500">MP4, AVI, MOV (MAX. 500MB)</p>
                          </div>
                          <input
                            id="video-file"
                            type="file"
                            className="hidden"
                            accept="video/*"
                            onChange={handleVideoFileChange}
                          />
                        </label>
                      </div>
                      {videoFile && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{videoFile.name} ({Math.round(videoFile.size / 1024 / 1024)}MB)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail upload */}
                  <div>
                    <Label htmlFor="thumbnail-file" className="text-sm font-medium">
                      Thumbnail (Optional)
                    </Label>
                    <div className="mt-2">
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="thumbnail-file"
                          className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex flex-col items-center justify-center pt-3 pb-4">
                            <Image className="w-6 h-6 mb-2 text-gray-500" />
                            <p className="text-sm text-gray-500">
                              <span className="font-semibold">Upload thumbnail</span>
                            </p>
                            <p className="text-xs text-gray-500">JPG, PNG (MAX. 5MB)</p>
                          </div>
                          <input
                            id="thumbnail-file"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleThumbnailFileChange}
                          />
                        </label>
                      </div>
                      {thumbnailFile && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{thumbnailFile.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium">
                      Title *
                    </Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder="Enter video title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-2"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your video..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-2"
                      rows={4}
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <Label htmlFor="tags" className="text-sm font-medium">
                      Tags
                    </Label>
                    <Input
                      id="tags"
                      type="text"
                      placeholder="gaming, music, comedy (comma separated)"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="mt-2"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Use commas to separate tags
                    </p>
                  </div>

                  {/* Rebel content checkbox */}
                  <div className="flex items-center space-x-2 p-4 border border-red-200 rounded-lg bg-red-50">
                    <Checkbox
                      id="rebel-content"
                      checked={isRebelContent}
                      onCheckedChange={(checked) => setIsRebelContent(checked as boolean)}
                    />
                    <Label htmlFor="rebel-content" className="flex items-center gap-2 text-sm">
                      <Flame className="h-4 w-4 text-red-500" />
                      Mark as REBEL content
                      <Badge variant="destructive" className="text-xs">
                        REBEL
                      </Badge>
                    </Label>
                  </div>

                  {/* Upload progress */}
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  )}

                  {/* Submit button */}
                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={isUploading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isUploading || !title.trim() || !videoFile}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isUploading ? "Uploading..." : "Upload Video"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar with tips */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Upload Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">File Requirements</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Video: MP4, AVI, MOV, WebM</li>
                    <li>• Max size: 500MB</li>
                    <li>• Thumbnail: JPG, PNG (5MB max)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Best Practices</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Use descriptive titles</li>
                    <li>• Add relevant tags</li>
                    <li>• Include detailed descriptions</li>
                    <li>• Upload high-quality content</li>
                  </ul>
                </div>

                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Flame className="h-4 w-4 text-red-500" />
                    Rebel Content
                  </h4>
                  <p className="text-sm text-gray-600">
                    Mark content that challenges mainstream narratives or covers
                    controversial topics
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}