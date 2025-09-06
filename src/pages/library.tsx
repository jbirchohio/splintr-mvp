import React from 'react';
import { VideoLibrary } from '@/components/video';
import { VideoRecord } from '@/types/video.types';

export default function LibraryPage() {
  const handleVideoSelect = (video: VideoRecord) => {
    // Navigate to story creation with selected video
    console.log('Selected video for story creation:', video);
    // router.push(`/create/story?videoId=${video.id}`);
  };

  const handleVideoDelete = (videoId: string) => {
    console.log('Video deleted:', videoId);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <VideoLibrary
          onVideoSelect={handleVideoSelect}
          onVideoDelete={handleVideoDelete}
        />
      </div>
    </div>
  );
}