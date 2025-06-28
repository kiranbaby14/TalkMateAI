'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Settings,
  ChevronDown,
  ChevronUp
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
import { Separator } from '@/components/ui/separator';

interface AudioSegment {
  id: string;
  timestamp: Date;
  duration: number;
  audioBlob: Blob;
  audioUrl: string;
}

interface VADConfig {
  energyThreshold: number;
  conversationBreakDuration: number;
  minSpeechDuration: number;
  maxSpeechDuration: number;
  sampleRate: number;
}

// Animated Voice Blob Component - Fixed for SSR hydration
const VoiceBlob: React.FC<{
  energy: number;
  isActive: boolean;
  threshold: number;
}> = ({ energy, isActive, threshold }) => {
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

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <svg
          width={maxSize + 20}
          height={maxSize + 20}
          className="overflow-visible"
          style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.1))' }}
        >
          <defs>
            <radialGradient id="blobGradient" cx="50%" cy="50%">
              <stop
                offset="0%"
                stopColor={isAboveThreshold ? '#10b981' : '#3b82f6'}
                stopOpacity="0.8"
              />
              <stop
                offset="70%"
                stopColor={isAboveThreshold ? '#059669' : '#1d4ed8'}
                stopOpacity="0.6"
              />
              <stop
                offset="100%"
                stopColor={isAboveThreshold ? '#047857' : '#1e40af'}
                stopOpacity="0.3"
              />
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
        </svg>
      </div>

      <div className="text-center">
        <div
          className={`font-mono text-2xl font-bold transition-colors duration-200 ${
            isAboveThreshold ? 'text-green-600' : 'text-blue-600'
          }`}
        >
          {energy.toFixed(4)}
        </div>
        <p className="text-muted-foreground text-sm">Energy Level</p>
        <Badge
          variant={isAboveThreshold ? 'default' : 'secondary'}
          className="mt-1"
        >
          {isAboveThreshold ? 'Above Threshold' : 'Below Threshold'}
        </Badge>
      </div>
    </div>
  );
};

const VoiceActivityDetector: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [audioSegments, setAudioSegments] = useState<AudioSegment[]>([]);
  const [currentEnergy, setCurrentEnergy] = useState(0);
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  // Simple speech detection state - NO COMPLEX LOGIC
  const audioBufferRef = useRef<Float32Array[]>([]);
  const silenceFramesRef = useRef(0);
  const speechFramesRef = useRef(0);
  const isInSpeechRef = useRef(false);
  const speechStartTimeRef = useRef(0);

  // Initialize audio worklet processor
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

  // Convert Float32Array to audio blob
  const createAudioBlob = useCallback(
    (audioBuffers: Float32Array[]) => {
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

      // Create WAV file
      const wavBuffer = createWAVFile(int16Buffer, config.sampleRate);
      return new Blob([wavBuffer], { type: 'audio/wav' });
    },
    [config.sampleRate]
  );

  // Create WAV file from PCM data
  const createWAVFile = (
    samples: Int16Array,
    sampleRate: number
  ): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      view.setInt16(offset, samples[i], true);
    }

    return buffer;
  };

  // SUPER SIMPLE speech detection - no complex state management
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

      // Convert durations to frame counts (1024 samples per frame at 16kHz ≈ 64ms per frame)
      const conversationBreakFrames = Math.floor(
        (conversationBreakDuration * sampleRate) / 1024
      );
      const minSpeechFrames = Math.floor(
        (minSpeechDuration * sampleRate) / 1024
      );
      const maxSpeechFrames = Math.floor(
        (maxSpeechDuration * sampleRate) / 1024
      );

      // ALWAYS add audio to buffer - this ensures continuous capture
      audioBufferRef.current.push(new Float32Array(audioData));

      if (energy > energyThreshold) {
        // Speech detected
        if (!isInSpeechRef.current) {
          // Starting new speech
          console.log('🎤 Speech started');
          isInSpeechRef.current = true;
          speechStartTimeRef.current = Date.now();
          setIsSpeechActive(true);
        }
        speechFramesRef.current++;
        silenceFramesRef.current = 0; // Reset silence counter
      } else {
        // Silence detected
        if (isInSpeechRef.current) {
          silenceFramesRef.current++;

          // Check if we should save (long enough silence)
          if (
            silenceFramesRef.current >= conversationBreakFrames &&
            speechFramesRef.current >= minSpeechFrames
          ) {
            console.log('💾 Saving speech segment');

            // Save the segment
            const duration = (Date.now() - speechStartTimeRef.current) / 1000;
            const audioBlob = createAudioBlob(audioBufferRef.current);
            const audioUrl = URL.createObjectURL(audioBlob);

            const newSegment: AudioSegment = {
              id: Date.now().toString(),
              timestamp: new Date(speechStartTimeRef.current),
              duration: duration,
              audioBlob,
              audioUrl
            };

            setAudioSegments((prev) => [newSegment, ...prev]);

            // SIMPLE reset - just clear counters and buffer, keep listening
            speechFramesRef.current = 0;
            silenceFramesRef.current = 0;
            isInSpeechRef.current = false;
            audioBufferRef.current = [];
            setIsSpeechActive(false);

            console.log('✅ Segment saved, ready for next speech');
          }
        }
      }

      // Handle max duration
      if (isInSpeechRef.current && speechFramesRef.current >= maxSpeechFrames) {
        console.log('⏰ Max duration reached, saving segment');

        const duration = (Date.now() - speechStartTimeRef.current) / 1000;
        const audioBlob = createAudioBlob(audioBufferRef.current);
        const audioUrl = URL.createObjectURL(audioBlob);

        const newSegment: AudioSegment = {
          id: Date.now().toString(),
          timestamp: new Date(speechStartTimeRef.current),
          duration: duration,
          audioBlob,
          audioUrl
        };

        setAudioSegments((prev) => [newSegment, ...prev]);

        // Reset and immediately start new segment if still speaking
        speechStartTimeRef.current = Date.now();
        speechFramesRef.current = 0;
        silenceFramesRef.current = 0;
        audioBufferRef.current = [new Float32Array(audioData)]; // Start new segment with current frame

        console.log('🔄 Max duration segment saved, continuing...');
      }

      // Prevent buffer from growing too large during long silences
      if (
        !isInSpeechRef.current &&
        audioBufferRef.current.length > conversationBreakFrames * 2
      ) {
        audioBufferRef.current = audioBufferRef.current.slice(
          -conversationBreakFrames
        );
      }
    },
    [config, createAudioBlob]
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
      console.log('🚀 Started continuous listening');
    } catch (error) {
      console.error('Failed to start listening:', error);
      alert('Failed to access microphone. Please check permissions.');
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

    // Reset all state
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

  // Clear all segments
  const clearSegments = useCallback(() => {
    audioSegments.forEach((segment) => {
      URL.revokeObjectURL(segment.audioUrl);
    });
    setAudioSegments([]);
  }, [audioSegments]);

  // Download segment
  const downloadSegment = useCallback((segment: AudioSegment) => {
    const link = document.createElement('a');
    link.href = segment.audioUrl;
    link.download = `speech_${segment.id}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      audioSegments.forEach((segment) => {
        URL.revokeObjectURL(segment.audioUrl);
      });
    };
  }, []);

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          Voice Activity Detector
        </CardTitle>
        <CardDescription>
          Continuous speech detection - speak, pause 2.5s to save, keep talking!
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={toggleListening}
            size="lg"
            variant={isListening ? 'destructive' : 'default'}
            className="flex items-center space-x-2"
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            <span>{isListening ? 'Stop Listening' : 'Start Listening'}</span>
          </Button>

          {audioSegments.length > 0 && (
            <Button onClick={clearSegments} variant="outline" size="lg">
              Clear All
            </Button>
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex justify-center space-x-8">
          <div className="text-center">
            <div
              className={`inline-block h-3 w-3 rounded-full ${
                isListening ? 'bg-green-500' : 'bg-gray-300'
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
        </div>

        {/* Voice Activity Blob */}
        <div className="flex justify-center">
          <VoiceBlob
            energy={currentEnergy}
            isActive={isSpeechActive}
            threshold={config.energyThreshold}
          />
        </div>

        {/* Advanced Settings */}
        <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Advanced Settings
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
                <Label htmlFor="break">Save After Silence (s)</Label>
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

        <Separator />

        {/* Audio Segments */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Detected Speech Segments</h3>
            <Badge variant="secondary">{audioSegments.length} segments</Badge>
          </div>

          {audioSegments.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <Volume2 className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p>No speech segments detected yet.</p>
              <p className="text-sm">
                Start listening and speak to see results.
              </p>
            </div>
          ) : (
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {audioSegments.map((segment) => (
                <div
                  key={segment.id}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Volume2 size={20} className="text-primary" />
                    <div>
                      <p className="font-medium">
                        {segment.timestamp.toLocaleTimeString()}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Duration: {segment.duration.toFixed(2)}s
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <audio controls src={segment.audioUrl} className="h-8" />
                    <Button
                      onClick={() => downloadSegment(segment)}
                      size="sm"
                      variant="outline"
                    >
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceActivityDetector;
