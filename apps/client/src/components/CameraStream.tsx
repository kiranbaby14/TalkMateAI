'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, Move, Maximize2, Minimize2, X } from 'lucide-react';

interface CameraStreamProps {
  className?: string;
  onClose?: () => void;
  onStreamChange?: (stream: MediaStream | null) => void;
}

const CameraStream: React.FC<CameraStreamProps> = ({
  className = '',
  onClose,
  onStreamChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate initial position
  const getInitialPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };

    const cameraWidth = isExpanded ? 400 : 200;
    const cameraHeight = isExpanded ? 300 : 150;
    const padding = 20;

    return {
      x: window.innerWidth - cameraWidth - padding,
      y: window.innerHeight - cameraHeight - padding
    };
  }, [isExpanded]);

  const [position, setPosition] = useState(getInitialPosition);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Adjust position when expanding/contracting
  const adjustPositionForSize = useCallback((newIsExpanded: boolean) => {
    setPosition((current) => {
      const newWidth = newIsExpanded ? 400 : 200;
      const newHeight = newIsExpanded ? 300 : 150;
      const maxX = window.innerWidth - newWidth - 20;
      const maxY = window.innerHeight - newHeight - 20;

      return {
        x: Math.max(0, Math.min(maxX, current.x)),
        y: Math.max(0, Math.min(maxY, current.y))
      };
    });
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Get available camera devices
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === 'videoinput'
      );
      setDevices(videoDevices);

      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting devices:', error);
      setError('Failed to get camera devices');
    }
  }, []); // Remove selectedDeviceId dependency

  // Start camera stream
  const startStream = useCallback(async () => {
    try {
      setError(null);

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 320 },
          height: { ideal: 240 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsStreaming(true);
    } catch (error: any) {
      console.error('Error starting camera:', error);
      setError(`Failed to start camera: ${error.message}`);
      setIsStreaming(false);
    }
  }, [selectedDeviceId]);

  // Stop camera stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (isStreaming) {
      stopStream();
    } else {
      startStream();
    }
  }, [isStreaming, startStream, stopStream]);

  // Notify parent of stream changes
  useEffect(() => {
    if (onStreamChange) {
      onStreamChange(isStreaming ? streamRef.current : null);
    }
  }, [isStreaming, onStreamChange]);

  // Mouse down handler for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    e.preventDefault();
  }, []);

  // Mouse move handler for dragging
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      requestAnimationFrame(() => {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        const maxX = window.innerWidth - (isExpanded ? 400 : 200);
        const maxY = window.innerHeight - (isExpanded ? 300 : 150);

        setPosition({
          x: Math.max(0, Math.min(maxX, newX)),
          y: Math.max(0, Math.min(maxY, newY))
        });
      });
    },
    [isDragging, dragOffset, isExpanded]
  );

  // Mouse up handler for dragging
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Update position when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (!isDragging) {
        setPosition(getInitialPosition());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDragging, getInitialPosition]);

  // Initialize devices on mount
  useEffect(() => {
    getDevices();
  }, []); // Remove getDevices dependency

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Add/remove mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 overflow-hidden rounded-lg bg-white shadow-2xl ${
        isExpanded ? 'h-72 w-96' : 'h-36 w-48'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${
        isDragging ? '' : 'transition-all duration-200'
      } ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        border: '2px solid #e5e7eb',
        transform: isDragging ? 'none' : undefined
      }}
    >
      {/* Header */}
      <div
        className="flex cursor-grab items-center justify-between bg-gray-800 p-2 text-white active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <Camera size={16} />
          <span className="text-sm font-medium">Camera</span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={toggleCamera}
            className="rounded p-1 hover:bg-gray-700"
            title={isStreaming ? 'Stop Camera' : 'Start Camera'}
          >
            {isStreaming ? <CameraOff size={14} /> : <Camera size={14} />}
          </button>

          <button
            onClick={() => {
              const newExpanded = !isExpanded;
              adjustPositionForSize(newExpanded);
              setIsExpanded(newExpanded);
            }}
            className="rounded p-1 hover:bg-gray-700"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            onClick={() => (onClose ? onClose() : setIsVisible(false))}
            className="rounded p-1 hover:bg-gray-700"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Video Display */}
      <div className="relative h-full bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Overlay when not streaming */}
        {!isStreaming && (
          <div className="bg-opacity-75 absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <CameraOff
                size={isExpanded ? 32 : 24}
                className="mx-auto mb-1 opacity-50"
              />
              <p className="text-xs">Camera Off</p>
            </div>
          </div>
        )}

        {/* Status indicator */}
        {isStreaming && (
          <div className="absolute top-1 left-1 flex items-center space-x-1 rounded-full bg-red-500 px-1 py-0.5 text-xs text-white">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white"></div>
            <span className="text-xs">LIVE</span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute right-1 bottom-1 left-1 rounded bg-red-500 p-1 text-xs text-white">
            {error}
          </div>
        )}

        {/* Camera Switch */}
        {isExpanded && devices.length > 1 && (
          <div className="absolute right-1 bottom-1">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="bg-opacity-50 rounded border-none bg-black p-1 text-xs text-white"
              disabled={isStreaming}
            >
              {devices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

// Floating Camera Toggle Button
export const CameraToggleButton: React.FC<{
  onStreamChange?: (stream: MediaStream | null) => void;
}> = ({ onStreamChange }) => {
  const [showCamera, setShowCamera] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowCamera(!showCamera)}
        className={`fixed right-6 bottom-6 z-40 rounded-full p-4 text-white shadow-lg transition-colors ${
          showCamera
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        title={showCamera ? 'Close Camera' : 'Open Camera'}
      >
        {showCamera ? <CameraOff size={24} /> : <Camera size={24} />}
      </button>

      {showCamera && (
        <CameraStream
          onClose={() => setShowCamera(false)}
          onStreamChange={onStreamChange}
        />
      )}
    </>
  );
};

export default CameraStream;
