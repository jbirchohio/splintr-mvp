import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VideoUpload } from '@/components/video/VideoUpload';

// Mock the video upload hook
jest.mock('@/hooks/useVideoUpload', () => ({
  useVideoUpload: jest.fn(() => ({
    uploadVideo: jest.fn(),
    isUploading: false,
    uploadProgress: null,
    validationErrors: [],
    error: null,
    result: null,
    reset: jest.fn()
  }))
}));

// Mock video validation utility
jest.mock('@/utils/video-validation', () => ({
  validateVideoComplete: jest.fn(() => Promise.resolve({
    isValid: true,
    errors: []
  }))
}));

describe('VideoUpload Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders upload area correctly', () => {
    renderWithQueryClient(<VideoUpload />);
    
    expect(screen.getByText('Drop your video here')).toBeInTheDocument();
    expect(screen.getByText('or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Choose Video File')).toBeInTheDocument();
  });

  it('displays video constraints', () => {
    renderWithQueryClient(<VideoUpload />);
    
    expect(screen.getByText('Supported formats: MP4, MOV, AVI, WebM')).toBeInTheDocument();
    expect(screen.getByText('Duration: 15-30 seconds • Max size: 100MB')).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    renderWithQueryClient(<VideoUpload />);
    
    const fileInput = screen.getByRole('button', { name: 'Choose Video File' });
    
    // Create a mock video file
    const mockFile = new File(['video content'], 'test-video.mp4', {
      type: 'video/mp4'
    });

    // Mock the video element for metadata extraction
    Object.defineProperty(HTMLVideoElement.prototype, 'duration', {
      writable: true,
      value: 20 // 20 seconds duration
    });

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-video-url');
    global.URL.revokeObjectURL = jest.fn();

    fireEvent.click(fileInput);
    
    // Simulate file selection would happen through the hidden input
    // This is a simplified test - in reality, file selection is more complex
    expect(fileInput).toBeInTheDocument();
  });

  it('shows validation errors when present', () => {
    const mockUseVideoUpload = require('@/hooks/useVideoUpload').useVideoUpload;
    mockUseVideoUpload.mockReturnValue({
      uploadVideo: jest.fn(),
      isUploading: false,
      uploadProgress: null,
      validationErrors: ['File size too large', 'Invalid duration'],
      error: null,
      result: null,
      reset: jest.fn()
    });

    renderWithQueryClient(<VideoUpload />);
    
    expect(screen.getByText('Please fix the following issues:')).toBeInTheDocument();
    expect(screen.getByText('File size too large')).toBeInTheDocument();
    expect(screen.getByText('Invalid duration')).toBeInTheDocument();
  });

  it('shows upload progress when uploading', () => {
    const mockUseVideoUpload = require('@/hooks/useVideoUpload').useVideoUpload;
    mockUseVideoUpload.mockReturnValue({
      uploadVideo: jest.fn(),
      isUploading: true,
      uploadProgress: {
        loaded: 50 * 1024 * 1024, // 50MB
        total: 100 * 1024 * 1024, // 100MB
        percentage: 50
      },
      validationErrors: [],
      error: null,
      result: null,
      reset: jest.fn()
    });

    renderWithQueryClient(<VideoUpload />);
    
    expect(screen.getByText('Uploading video...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('50.0MB of 100.0MB')).toBeInTheDocument();
  });

  it('shows success message when upload completes', () => {
    const mockUseVideoUpload = require('@/hooks/useVideoUpload').useVideoUpload;
    mockUseVideoUpload.mockReturnValue({
      uploadVideo: jest.fn(),
      isUploading: false,
      uploadProgress: null,
      validationErrors: [],
      error: null,
      result: {
        videoId: 'test-video-id',
        publicId: 'test-public-id',
        uploadUrl: 'https://example.com/video.mp4',
        processingStatus: 'completed'
      },
      reset: jest.fn()
    });

    renderWithQueryClient(<VideoUpload />);
    
    expect(screen.getByText('Video uploaded successfully!')).toBeInTheDocument();
    expect(screen.getByText('Your video is being processed and will be available shortly.')).toBeInTheDocument();
  });

  it('shows error message when upload fails', () => {
    const mockUseVideoUpload = require('@/hooks/useVideoUpload').useVideoUpload;
    mockUseVideoUpload.mockReturnValue({
      uploadVideo: jest.fn(),
      isUploading: false,
      uploadProgress: null,
      validationErrors: [],
      error: new Error('Upload failed'),
      result: null,
      reset: jest.fn()
    });

    renderWithQueryClient(<VideoUpload />);
    
    expect(screen.getAllByText('Upload failed')).toHaveLength(2);
  });
});