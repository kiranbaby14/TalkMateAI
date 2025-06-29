'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Settings,
  ChevronDown,
  ChevronUp,
  Camera,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWebSocketContext } from '@/contexts/WebSocketContext';

interface VADConfig {
  energyThreshold: number;
  conversationBreakDuration: number;
  minSpeechDuration: number;
  maxSpeechDuration: number;
  sampleRate: number;
}

interface VoiceActivityDetectorProps {
  cameraStream?: MediaStream | null;
}

// Enhanced Voice Blob Component with transmission feedback
const VoiceBlob: React.FC<{
  energy: number;
  isActive: boolean;
  threshold: number;
  transmissionMode: 'audio' | 'audio+image' | 'none';
}> = ({ energy, isActive, threshold, transmissionMode }) => {
  const [animationTime, setAnimationTime] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const interval = setInterval(() => {
      setAnimationTime(Date.now());
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const normalizedEnergy = Math.min(1, energy / 0.1);
  const baseSize = 60;
  const maxSize = 120;
  const size = baseSize + normalizedEnergy * (maxSize - baseSize);

  const createBlobPath = (energy: number, time: number) => {
    const points = 12;
    const baseRadius = size / 2;
    const spikeVariation = energy * 15 + 5;
    let path = '';

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const randomSpike = Math.sin(angle * 3 + time * 0.005) * spikeVariation;
      const radius = baseRadius + randomSpike;
      const x = Math.cos(angle) * radius + size / 2;
      const y = Math.sin(angle) * radius + size / 2;

      if (i === 0) {
        path += `M ${x} ${y}`;
      } else {
        const prevAngle = ((i - 1) / points) * Math.PI * 2;
        const prevSpike =
          Math.sin(prevAngle * 3 + time * 0.005) * spikeVariation;
        const prevRadius = baseRadius + prevSpike;
        const prevX = Math.cos(prevAngle) * prevRadius + size / 2;
        const prevY = Math.sin(prevAngle) * prevRadius + size / 2;
        const cp1x = prevX + Math.cos(prevAngle + Math.PI / 2) * 10;
        const cp1y = prevY + Math.sin(prevAngle + Math.PI / 2) * 10;
        const cp2x = x + Math.cos(angle - Math.PI / 2) * 10;
        const cp2y = y + Math.sin(angle - Math.PI / 2) * 10;
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
      }
    }
    path += ' Z';
    return path;
  };

  const createStaticBlobPath = () => {
    const points = 12;
    const radius = baseSize / 2;
    let path = '';

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const x = Math.cos(angle) * radius + baseSize / 2;
      const y = Math.sin(angle) * radius + baseSize / 2;

      if (i === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    }
    path += ' Z';
    return path;
  };

  const blobPath = isMounted
    ? createBlobPath(normalizedEnergy, animationTime)
    : createStaticBlobPath();
  const isAboveThreshold = energy > threshold;
  const displaySize = isMounted ? size : baseSize;

  // Dynamic gradient based on transmission mode
  const getGradientColors = () => {
    if (transmissionMode === 'audio+image') {
      return {
        start: isAboveThreshold ? '#8b5cf6' : '#7c3aed', // Purple for audio+image
        middle: isAboveThreshold ? '#7c3aed' : '#6d28d9',
        end: isAboveThreshold ? '#6d28d9' : '#5b21b6'
      };
    } else if (transmissionMode === 'audio') {
      return {
        start: isAboveThreshold ? '#10b981' : '#3b82f6', // Green/Blue for audio only
        middle: isAboveThreshold ? '#059669' : '#1d4ed8',
        end: isAboveThreshold ? '#047857' : '#1e40af'
      };
    } else {
      return {
        start: '#6b7280', // Gray for no transmission
        middle: '#4b5563',
        end: '#374151'
      };
    }
  };

  const colors = getGradientColors();

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <svg
          width={maxSize + 20}
          height={maxSize + 20}
          className="overflow-visible"
        >
          <defs>
            <radialGradient id="blobGradient" cx="50%" cy="50%">
              <stop offset="0%" stopColor={colors.start} stopOpacity="0.8" />
              <stop offset="70%" stopColor={colors.middle} stopOpacity="0.6" />
              <stop offset="100%" stopColor={colors.end} stopOpacity="0.3" />
            </radialGradient>

            <filter id="glow">
              <feGaussianBlur
                stdDeviation={isMounted ? normalizedEnergy * 3 + 1 : 1}
                result="coloredBlur"
              />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={blobPath}
            fill="url(#blobGradient)"
            filter="url(#glow)"
            className="transition-all duration-75 ease-out"
            transform={`translate(${(maxSize + 20 - displaySize) / 2}, ${(maxSize + 20 - displaySize) / 2})`}
          />

          <circle
            cx={(maxSize + 20) / 2}
            cy={(maxSize + 20) / 2}
            r={3 + (isMounted ? normalizedEnergy * 2 : 0)}
            fill="white"
            opacity={0.9}
          />

          {/* Transmission indicator overlay */}
          {transmissionMode !== 'none' && (
            <g
              transform={`translate(${(maxSize + 20) / 2 - 12}, ${(maxSize + 20) / 2 + 25})`}
            >
              {transmissionMode === 'audio+image' ? (
                <>
                  <Camera size={12} fill="white" opacity={0.8} />
                  <Send size={8} x={14} fill="white" opacity={0.8} />
                </>
              ) : (
                <Send size={12} fill="white" opacity={0.8} />
              )}
            </g>
          )}
        </svg>
      </div>

      <div className="text-center">
        <div
          className={`font-mono text-2xl font-bold transition-colors duration-200 ${
            transmissionMode === 'audio+image'
              ? 'text-purple-600'
              : isAboveThreshold
                ? 'text-green-600'
                : 'text-blue-600'
          }`}
        >
          {energy.toFixed(4)}
        </div>
        <p className="text-muted-foreground text-sm">Energy Level</p>
        <div className="mt-1 flex flex-col gap-1">
          <Badge
            variant={isAboveThreshold ? 'default' : 'secondary'}
            className="text-xs"
          >
            {isAboveThreshold ? 'Above Threshold' : 'Below Threshold'}
          </Badge>
          <Badge
            variant={transmissionMode === 'audio+image' ? 'default' : 'outline'}
            className={`text-xs ${
              transmissionMode === 'audio+image'
                ? 'bg-purple-500 hover:bg-purple-600'
                : transmissionMode === 'audio'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : ''
            }`}
          >
            {transmissionMode === 'audio+image'
              ? '🎥 Audio + Image'
              : transmissionMode === 'audio'
                ? '🎤 Audio Only'
                : '🔇 No Transmission'}
          </Badge>
        </div>
      </div>
    </div>
  );
};

// Transmission History Component
const TransmissionHistory: React.FC<{
  transmissions: Array<{
    timestamp: Date;
    type: 'audio' | 'audio+image';
    audioSize: number;
    imageSize?: number;
  }>;
}> = ({ transmissions }) => {
  if (transmissions.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg bg-gray-50 p-3">
      <h4 className="mb-2 text-sm font-medium">Recent Transmissions</h4>
      <div className="max-h-32 space-y-1 overflow-y-auto">
        {transmissions
          .slice(-5)
          .reverse()
          .map((transmission, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-1">
                {transmission.type === 'audio+image' ? '🎥' : '🎤'}
                {transmission.timestamp.toLocaleTimeString()}
              </span>
              <span className="text-gray-500">
                {transmission.type === 'audio+image'
                  ? `Audio: ${(transmission.audioSize / 1024).toFixed(1)}KB + Image: ${((transmission.imageSize || 0) / 1024).toFixed(1)}KB`
                  : `Audio: ${(transmission.audioSize / 1024).toFixed(1)}KB`}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

const VoiceActivityDetector: React.FC<VoiceActivityDetectorProps> = ({
  cameraStream
}) => {
  const [isListening, setIsListening] = useState(false);
  const [currentEnergy, setCurrentEnergy] = useState(0);
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [transmissionMode, setTransmissionMode] = useState<
    'audio' | 'audio+image' | 'none'
  >('none');
  const [transmissionHistory, setTransmissionHistory] = useState<
    Array<{
      timestamp: Date;
      type: 'audio' | 'audio+image';
      audioSize: number;
      imageSize?: number;
    }>
  >([]);

  const [config, setConfig] = useState<VADConfig>({
    energyThreshold: 0.02,
    conversationBreakDuration: 2.5,
    minSpeechDuration: 0.8,
    maxSpeechDuration: 15,
    sampleRate: 16000
  });

  // Audio processing refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  // Speech detection state
  const audioBufferRef = useRef<Float32Array[]>([]);
  const silenceFramesRef = useRef(0);
  const speechFramesRef = useRef(0);
  const isInSpeechRef = useRef(false);
  const speechStartTimeRef = useRef(0);

  // WebSocket integration
  const {
    isConnected,
    connect,
    sendAudioSegment,
    sendImage,
    sendAudioWithImage
  } = useWebSocketContext();

  // Auto-connect to WebSocket on mount
  useEffect(() => {
    connect();
  }, [connect]);

  // Update transmission mode based on camera stream
  useEffect(() => {
    if (!isListening) {
      setTransmissionMode('none');
    } else if (cameraStream) {
      setTransmissionMode('audio+image');
    } else {
      setTransmissionMode('audio');
    }
  }, [isListening, cameraStream]);

  // Capture image from camera stream
  const captureImageFromStream = useCallback((): {
    data: string;
    size: number;
  } | null => {
    if (!cameraStream) return null;

    try {
      // Try to find existing video element in CameraStream component
      const existingVideo = document.querySelector(
        'video[autoplay]'
      ) as HTMLVideoElement;

      if (
        existingVideo &&
        existingVideo.videoWidth > 0 &&
        existingVideo.videoHeight > 0
      ) {
        // Use existing video element that's already playing
        const canvas = document.createElement('canvas');
        const aspectRatio =
          existingVideo.videoWidth / existingVideo.videoHeight;
        canvas.width = 320;
        canvas.height = Math.round(320 / aspectRatio);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(existingVideo, 0, 0, canvas.width, canvas.height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const base64Data = dataUrl.split(',')[1];
          const size = base64Data.length * 0.75;

          console.log(
            `📸 Captured from existing video: ${canvas.width}x${canvas.height}, ${size.toFixed(0)} bytes`
          );

          return { data: base64Data, size };
        }
      }

      console.warn('No suitable video element found for capture');
      return null;
    } catch (error) {
      console.error('Error capturing from existing video:', error);
      return null;
    }
  }, [cameraStream]);

  // Enhanced audio sending with transmission tracking
  const createAndSendAudio = useCallback(
    (audioBuffers: Float32Array[]) => {
      if (!isConnected) return;

      const totalLength = audioBuffers.reduce(
        (sum, buffer) => sum + buffer.length,
        0
      );
      const combinedBuffer = new Float32Array(totalLength);

      let offset = 0;
      for (const buffer of audioBuffers) {
        combinedBuffer.set(buffer, offset);
        offset += buffer.length;
      }

      // Convert Float32 to Int16
      const int16Buffer = new Int16Array(combinedBuffer.length);
      for (let i = 0; i < combinedBuffer.length; i++) {
        int16Buffer[i] = Math.max(
          -32768,
          Math.min(32767, combinedBuffer[i] * 32767)
        );
      }

      const audioData = int16Buffer.buffer;
      const audioSize = audioData.byteLength;

      // Send with or without image based on camera state
      const imageCapture = captureImageFromStream();

      const transmission = {
        timestamp: new Date(),
        audioSize,
        type: imageCapture ? ('audio+image' as const) : ('audio' as const),
        imageSize: imageCapture?.size
      };

      if (imageCapture) {
        sendAudioWithImage(audioData, imageCapture.data);
        console.log('Sent audio + image to server', {
          audioSize: audioSize,
          imageSize: imageCapture.size
        });
      } else {
        sendAudioSegment(audioData);
        console.log('Sent audio to server', { audioSize });
      }

      // Update transmission history
      setTransmissionHistory((prev) => [...prev, transmission].slice(-20)); // Keep last 20
    },
    [isConnected, sendAudioSegment, sendAudioWithImage, captureImageFromStream]
  );

  // Initialize audio worklet
  const initializeAudioWorklet = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({
          sampleRate: config.sampleRate
        });
      }

      const audioContext = audioContextRef.current;

      const workletCode = `
        class VoiceActivityProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.bufferSize = 1024;
            this.buffer = new Float32Array(this.bufferSize);
            this.bufferIndex = 0;
          }

          process(inputs, outputs, parameters) {
            const input = inputs[0];
            
            if (input.length > 0) {
              const inputChannel = input[0];
              
              for (let i = 0; i < inputChannel.length; i++) {
                this.buffer[this.bufferIndex] = inputChannel[i];
                this.bufferIndex++;
                
                if (this.bufferIndex >= this.bufferSize) {
                  let sum = 0;
                  for (let j = 0; j < this.bufferSize; j++) {
                    sum += this.buffer[j] * this.buffer[j];
                  }
                  const energy = Math.sqrt(sum / this.bufferSize);
                  
                  this.port.postMessage({
                    type: 'audioData',
                    energy: energy,
                    audioData: new Float32Array(this.buffer)
                  });
                  
                  this.bufferIndex = 0;
                }
              }
            }
            
            return true;
          }
        }

        registerProcessor('voice-activity-processor', VoiceActivityProcessor);
      `;

      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      return audioContext;
    } catch (error) {
      console.error('Failed to initialize audio worklet:', error);
      throw error;
    }
  }, [config.sampleRate]);

  // Process audio data for speech detection
  const processAudioData = useCallback(
    (energy: number, audioData: Float32Array) => {
      setCurrentEnergy(energy);

      const {
        energyThreshold,
        conversationBreakDuration,
        minSpeechDuration,
        maxSpeechDuration,
        sampleRate
      } = config;

      const conversationBreakFrames = Math.floor(
        (conversationBreakDuration * sampleRate) / 1024
      );
      const minSpeechFrames = Math.floor(
        (minSpeechDuration * sampleRate) / 1024
      );
      const maxSpeechFrames = Math.floor(
        (maxSpeechDuration * sampleRate) / 1024
      );

      audioBufferRef.current.push(new Float32Array(audioData));

      if (energy > energyThreshold) {
        if (!isInSpeechRef.current) {
          console.log('🎤 Speech started');
          isInSpeechRef.current = true;
          speechStartTimeRef.current = Date.now();
          setIsSpeechActive(true);
        }
        speechFramesRef.current++;
        silenceFramesRef.current = 0;
      } else {
        if (isInSpeechRef.current) {
          silenceFramesRef.current++;

          if (
            silenceFramesRef.current >= conversationBreakFrames &&
            speechFramesRef.current >= minSpeechFrames
          ) {
            console.log('💾 Saving speech segment');
            createAndSendAudio(audioBufferRef.current);

            // Reset for next segment
            speechFramesRef.current = 0;
            silenceFramesRef.current = 0;
            isInSpeechRef.current = false;
            audioBufferRef.current = [];
            setIsSpeechActive(false);
          }
        }
      }

      // Handle max duration
      if (isInSpeechRef.current && speechFramesRef.current >= maxSpeechFrames) {
        console.log('⏰ Max duration reached, saving segment');
        createAndSendAudio(audioBufferRef.current);

        speechStartTimeRef.current = Date.now();
        speechFramesRef.current = 0;
        silenceFramesRef.current = 0;
        audioBufferRef.current = [new Float32Array(audioData)];
      }

      // Prevent buffer overflow during long silences
      if (
        !isInSpeechRef.current &&
        audioBufferRef.current.length > conversationBreakFrames * 2
      ) {
        audioBufferRef.current = audioBufferRef.current.slice(
          -conversationBreakFrames
        );
      }
    },
    [config, createAndSendAudio]
  );

  // Start listening
  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: config.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;
      const audioContext = await initializeAudioWorklet();
      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(
        audioContext,
        'voice-activity-processor'
      );
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        const { type, energy, audioData } = event.data;
        if (type === 'audioData') {
          processAudioData(energy, audioData);
        }
      };

      source.connect(workletNode);
      setIsListening(true);
      console.log('🚀 Started voice detection');
    } catch (error) {
      console.error('Failed to start listening:', error);
      alert('Failed to access microphone');
    }
  }, [config.sampleRate, initializeAudioWorklet, processAudioData]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Reset state
    audioBufferRef.current = [];
    silenceFramesRef.current = 0;
    speechFramesRef.current = 0;
    isInSpeechRef.current = false;

    setIsListening(false);
    setCurrentEnergy(0);
    setIsSpeechActive(false);
    console.log('🛑 Stopped listening');
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Voice Control</CardTitle>
        <CardDescription>
          Speak naturally - pauses trigger responses
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={toggleListening}
            size="lg"
            variant={isListening ? 'destructive' : 'default'}
            disabled={!isConnected}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            <span className="ml-2">
              {!isConnected
                ? 'Connecting...'
                : isListening
                  ? 'Stop Voice Control'
                  : 'Start Voice Control'}
            </span>
          </Button>
        </div>

        {/* Enhanced Status Indicators */}
        <div className="flex justify-center space-x-8">
          <div className="text-center">
            <div
              className={`inline-block h-3 w-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <p className="text-muted-foreground mt-1 text-sm">Server</p>
          </div>
          <div className="text-center">
            <div
              className={`inline-block h-3 w-3 rounded-full ${
                isListening ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
            <p className="text-muted-foreground mt-1 text-sm">Microphone</p>
          </div>
          <div className="text-center">
            <div
              className={`inline-block h-3 w-3 rounded-full ${
                isSpeechActive ? 'bg-orange-500' : 'bg-gray-300'
              }`}
            />
            <p className="text-muted-foreground mt-1 text-sm">Speech Active</p>
          </div>
          <div className="text-center">
            <div
              className={`inline-block h-3 w-3 rounded-full ${
                cameraStream ? 'bg-purple-500' : 'bg-gray-300'
              }`}
            />
            <p className="text-muted-foreground mt-1 text-sm">Camera</p>
          </div>
        </div>

        {/* Enhanced Voice Activity Blob */}
        <div className="flex justify-center">
          <VoiceBlob
            energy={currentEnergy}
            isActive={isSpeechActive}
            threshold={config.energyThreshold}
            transmissionMode={transmissionMode}
          />
        </div>

        {/* Transmission History */}
        <TransmissionHistory transmissions={transmissionHistory} />

        {/* Settings */}
        <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Detection Settings
              {isSettingsOpen ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="threshold">Energy Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  step="0.001"
                  value={config.energyThreshold}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      energyThreshold: parseFloat(e.target.value)
                    }))
                  }
                  disabled={isListening}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="break">Pause Duration (s)</Label>
                <Input
                  id="break"
                  type="number"
                  step="0.1"
                  value={config.conversationBreakDuration}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      conversationBreakDuration: parseFloat(e.target.value)
                    }))
                  }
                  disabled={isListening}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minSpeech">Min Speech (s)</Label>
                <Input
                  id="minSpeech"
                  type="number"
                  step="0.1"
                  value={config.minSpeechDuration}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      minSpeechDuration: parseFloat(e.target.value)
                    }))
                  }
                  disabled={isListening}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxSpeech">Max Speech (s)</Label>
                <Input
                  id="maxSpeech"
                  type="number"
                  step="1"
                  value={config.maxSpeechDuration}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      maxSpeechDuration: parseFloat(e.target.value)
                    }))
                  }
                  disabled={isListening}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default VoiceActivityDetector;
