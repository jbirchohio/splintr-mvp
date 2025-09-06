import React, { useState } from 'react';
import { VideoUpload } from '@/components/video';
import { ThumbnailGenerator } from '@/components/video/ThumbnailGenerator';
import { VideoUploadResult } from '@/types/video.types';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export default function UploadPage() {
  const [uploadResult, setUploadResult] = useState<VideoUploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<{ blob: Blob; timestamp: number } | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleUploadSuccess = (result: VideoUploadResult) => {
    setUploadResult(result);
    console.log('Video uploaded successfully:', result);
  };

  const handleUploadError = (error: Error) => {
    console.error('Video upload failed:', error);
  };

  const handleThumbnailGenerated = (thumbnail: Blob, timestamp: number) => {
    setSelectedThumbnail({ blob: thumbnail, timestamp });
  };

  const handleComplete = () => {
    setIsComplete(true);
    // Here you could redirect to the story editor or video library
    // router.push('/create/story');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Upload Your Video
          </h1>
          <p className="text-lg text-gray-600">
            Create engaging interactive stories with your video content
          </p>
        </div>

        {/* Upload Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${!uploadResult ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                !uploadResult ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
              }`}>
                {!uploadResult ? '1' : '✓'}
              </div>
              <span className="ml-2 font-medium">Upload Video</span>
            </div>
            
            <div className="w-16 h-0.5 bg-gray-300"></div>
            
            <div className={`flex items-center ${
              !uploadResult ? 'text-gray-400' : 
              !selectedThumbnail ? 'text-blue-600' : 'text-green-600'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                !uploadResult ? 'bg-gray-100 text-gray-400' :
                !selectedThumbnail ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
              }`}>
                {!uploadResult ? '2' : !selectedThumbnail ? '2' : '✓'}
              </div>
              <span className="ml-2 font-medium">Choose Thumbnail</span>
            </div>
            
            <div className="w-16 h-0.5 bg-gray-300"></div>
            
            <div className={`flex items-center ${
              !selectedThumbnail ? 'text-gray-400' : 
              !isComplete ? 'text-blue-600' : 'text-green-600'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                !selectedThumbnail ? 'bg-gray-100 text-gray-400' :
                !isComplete ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
              }`}>
                {!selectedThumbnail ? '3' : !isComplete ? '3' : '✓'}
              </div>
              <span className="ml-2 font-medium">Complete</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Step 1: Video Upload */}
          {!uploadResult && (
            <VideoUpload
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          )}

          {/* Step 2: Thumbnail Selection */}
          {uploadResult && !isComplete && (
            <div className="space-y-6">
              <Alert variant="success">
                <p className="font-medium">Video uploaded successfully!</p>
                <p className="text-sm">Now choose a thumbnail for your video.</p>
              </Alert>

              {/* Video Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Video Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Video ID:</span>
                    <span className="ml-2 font-mono">{uploadResult.videoId}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 capitalize">{uploadResult.processingStatus}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <span className="ml-2">{uploadResult.duration?.toFixed(1)}s</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Format:</span>
                    <span className="ml-2 uppercase">{uploadResult.format}</span>
                  </div>
                </div>
              </div>

              {/* Thumbnail Generator */}
              {selectedFile && (
                <ThumbnailGenerator
                  videoFile={selectedFile}
                  onThumbnailGenerated={handleThumbnailGenerated}
                />
              )}

              {/* Complete Button */}
              {selectedThumbnail && (
                <div className="flex justify-center pt-4">
                  <Button onClick={handleComplete} size="lg">
                    Complete Upload
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Completion */}
          {isComplete && (
            <div className="text-center space-y-6">
              <Alert variant="success">
                <div className="space-y-2">
                  <p className="font-medium text-lg">Upload Complete!</p>
                  <p>Your video has been uploaded and is ready to use in your interactive stories.</p>
                </div>
              </Alert>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">What&apos;s Next?</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Create a Story</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Use this video to create an interactive branching story
                    </p>
                    <Button variant="primary" size="sm" className="w-full">
                      Start Creating Story
                    </Button>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Video Library</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      View and manage all your uploaded videos
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Go to Library
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => {
                    setUploadResult(null);
                    setSelectedFile(null);
                    setSelectedThumbnail(null);
                    setIsComplete(false);
                  }}
                  variant="ghost"
                >
                  Upload Another Video
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-medium text-blue-900 mb-3">Upload Tips</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-1">Video Requirements</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• Duration: 15-30 seconds</li>
                <li>• Max file size: 100MB</li>
                <li>• Formats: MP4, MOV, AVI, WebM</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">Best Practices</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• Keep content engaging and concise</li>
                <li>• End with a clear choice point</li>
                <li>• Ensure good video quality</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}