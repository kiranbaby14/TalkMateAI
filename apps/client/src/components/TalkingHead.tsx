'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Square,
  Settings,
  ChevronDown,
  ChevronUp,
  Loader2
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface TalkingHeadProps {
  className?: string;
  onClose?: () => void;
}

const TalkingHead: React.FC<TalkingHeadProps> = ({
  className = '',
  onClose
}) => {
  const avatarRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('af_sarah');
  const [selectedAvatar, setSelectedAvatar] = useState('F');
  const [selectedMood, setSelectedMood] = useState('neutral');
  const [textInput, setTextInput] = useState(
    "Hello! I'm using Kokoro TTS with TalkingHead. This combination provides high-quality, natural-sounding speech with real-time lip synchronization."
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const headRef = useRef<any>(null);
  const kokoroEndpoint = 'http://localhost:8000';

  // Voice options
  const voiceOptions = [
    { value: 'af_sarah', label: 'Sarah (Female)' },
    { value: 'af_nicole', label: 'Nicole (Female)' },
    { value: 'af_sky', label: 'Sky (Female)' },
    { value: 'am_adam', label: 'Adam (Male)' },
    { value: 'am_michael', label: 'Michael (Male)' }
  ];

  const avatarOptions = [
    { value: 'F', label: 'Female Avatar' },
    { value: 'M', label: 'Male Avatar' }
  ];

  const moodOptions = [
    { value: 'neutral', label: 'Neutral' },
    { value: 'happy', label: 'Happy' },
    { value: 'sad', label: 'Sad' },
    { value: 'angry', label: 'Angry' },
    { value: 'love', label: 'Love' }
  ];

  // Show status message
  const showStatus = (message: string, type: 'success' | 'error' | 'info') => {
    setStatus({ message, type });
    if (type === 'success' || type === 'info') {
      setTimeout(() => setStatus(null), 3000);
    }
  };

  // Listen for TalkingHead library to load
  useEffect(() => {
    const handleTalkingHeadLoaded = () => {
      console.log('TalkingHead library loaded');
      setScriptsLoaded(true);
    };

    const handleTalkingHeadError = () => {
      console.error('Failed to load TalkingHead library');
      showStatus(
        'Failed to load TalkingHead library. Please check your internet connection.',
        'error'
      );
    };

    // Check if already loaded
    if ((window as any).TalkingHead) {
      setScriptsLoaded(true);
      return;
    }

    // Listen for load events
    window.addEventListener('talkinghead-loaded', handleTalkingHeadLoaded);
    window.addEventListener('talkinghead-error', handleTalkingHeadError);

    return () => {
      window.removeEventListener('talkinghead-loaded', handleTalkingHeadLoaded);
      window.removeEventListener('talkinghead-error', handleTalkingHeadError);
    };
  }, []);

  // Initialize TalkingHead after scripts are loaded
  useEffect(() => {
    if (!scriptsLoaded || !avatarRef.current) return;

    const initTalkingHead = async () => {
      try {
        setIsLoading(true);
        showStatus('Initializing TalkingHead...', 'info');

        const TalkingHead = (window as any).TalkingHead;

        if (!TalkingHead) {
          throw new Error('TalkingHead library not loaded');
        }

        // Initialize TalkingHead
        headRef.current = new TalkingHead(avatarRef.current, {
          ttsEndpoint: 'https://texttospeech.googleapis.com/v1/text:synthesize',
          jwtGet: () => Promise.resolve('dummy-jwt-token'),
          lipsyncModules: ['en'],
          lipsyncLang: 'en',
          modelFPS: 30,
          cameraView: 'full',
          avatarMute: false
        });

        // Load default avatar
        await loadAvatar(selectedAvatar);

        setIsLoading(false);
        showStatus('TalkingHead initialized successfully!', 'success');
      } catch (error: any) {
        setIsLoading(false);
        showStatus(`Initialization failed: ${error.message}`, 'error');
        console.error('Initialization error:', error);
      }
    };

    initTalkingHead();

    return () => {
      // Cleanup
      if (headRef.current) {
        try {
          headRef.current.stop();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
    };
  }, [scriptsLoaded]);

  const loadAvatar = async (gender: string = 'F') => {
    const avatarUrls = {
      F: './avatars/brunette.glb',
      M: './avatars/brunette.glb'
    };

    try {
      console.log(
        `Loading ${gender} avatar:`,
        avatarUrls[gender as keyof typeof avatarUrls]
      );

      await headRef.current?.showAvatar({
        url: avatarUrls[gender as keyof typeof avatarUrls],
        body: gender,
        avatarMood: selectedMood,
        lipsyncLang: 'en'
      });

      console.log(`${gender} avatar loaded successfully`);
    } catch (error: any) {
      console.error(`Failed to load ${gender} avatar:`, error);
      showStatus(`Failed to load avatar: ${error.message}`, 'error');
    }
  };

  const generateAudio = async (text: string, voice: string) => {
    return fetch(`${kokoroEndpoint}/tts/audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        voice: voice,
        lang_code: 'a'
      })
    });
  };

  const getTimingInfo = async (text: string, voice: string) => {
    return fetch(`${kokoroEndpoint}/tts/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        voice: voice,
        lang_code: 'a'
      })
    });
  };

  const speak = async () => {
    if (!headRef.current) {
      showStatus('TalkingHead not initialized yet', 'error');
      return;
    }

    const text = textInput.trim();

    if (!text) {
      showStatus('Please enter some text to speak', 'error');
      return;
    }

    try {
      setIsSpeaking(true);
      showStatus('Generating speech with Kokoro TTS...', 'info');

      // Get audio and timing info from Kokoro TTS
      const [audioResponse, infoResponse] = await Promise.all([
        generateAudio(text, selectedVoice),
        getTimingInfo(text, selectedVoice)
      ]);

      if (!audioResponse.ok) {
        throw new Error(`Audio generation failed: ${audioResponse.status}`);
      }

      if (!infoResponse.ok) {
        throw new Error(`Timing info failed: ${infoResponse.status}`);
      }

      // Convert audio to AudioBuffer
      const audioBlob = await audioResponse.blob();
      const audioArrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);

      // Get timing info
      const timingInfo = await infoResponse.json();

      // Use TalkingHead's speakAudio method
      headRef.current.speakAudio({
        audio: audioBuffer,
        words: timingInfo.words,
        wtimes: timingInfo.word_times,
        wdurations: timingInfo.word_durations
      });

      showStatus(
        `Speaking: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
        'success'
      );
    } catch (error: any) {
      showStatus(`Speech generation failed: ${error.message}`, 'error');
      console.error('Speech error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const stop = () => {
    if (headRef.current) {
      headRef.current.stop();
      showStatus('Speech stopped', 'info');
      setIsSpeaking(false);
    }
  };

  const handleAvatarChange = (gender: string) => {
    setSelectedAvatar(gender);
    if (scriptsLoaded && headRef.current) {
      loadAvatar(gender);
    }
  };

  const handleMoodChange = (mood: string) => {
    setSelectedMood(mood);
    if (headRef.current) {
      headRef.current.setMood(mood);
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">TalkingHead Avatar</CardTitle>
        <CardDescription>
          High-quality text-to-speech with 3D avatar lip-sync
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Avatar Display */}
        <div
          className="relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-200"
          style={{ height: '500px' }}
        >
          <div ref={avatarRef} className="h-full w-full" />

          {/* Loading Overlay */}
          {(isLoading || !scriptsLoaded) && (
            <div className="bg-opacity-90 absolute inset-0 flex items-center justify-center bg-white">
              <div className="text-center">
                <Loader2 className="text-primary mx-auto mb-4 h-12 w-12 animate-spin" />
                <p className="text-muted-foreground">
                  {!scriptsLoaded
                    ? 'Loading TalkingHead library...'
                    : 'Loading avatar...'}
                </p>
              </div>
            </div>
          )}

          {/* Status Badge */}
          {scriptsLoaded && !isLoading && (
            <div className="absolute top-4 left-4">
              <Badge variant={isSpeaking ? 'destructive' : 'secondary'}>
                {isSpeaking ? 'Speaking...' : 'Ready'}
              </Badge>
            </div>
          )}
        </div>

        {/* Text Input */}
        <div className="space-y-2">
          <Label htmlFor="text-input">Text to speak:</Label>
          <Textarea
            id="text-input"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter text here..."
            className="min-h-[100px]"
            rows={4}
          />
        </div>

        {/* Main Control Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={speak}
            disabled={isSpeaking || !scriptsLoaded || !textInput.trim()}
            className="flex-1"
            size="lg"
          >
            {isSpeaking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speaking...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Speak
              </>
            )}
          </Button>

          <Button
            onClick={stop}
            disabled={!isSpeaking}
            variant="destructive"
            size="lg"
          >
            <Square className="mr-2 h-4 w-4" />
            Stop
          </Button>
        </div>

        {/* Advanced Settings */}
        <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Avatar & Voice Settings
              {isSettingsOpen ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Voice Selection */}
              <div className="space-y-2">
                <Label htmlFor="voice-select">Voice</Label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger id="voice-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        {voice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Avatar Selection */}
              <div className="space-y-2">
                <Label htmlFor="avatar-select">Avatar</Label>
                <Select
                  value={selectedAvatar}
                  onValueChange={handleAvatarChange}
                  disabled={!scriptsLoaded}
                >
                  <SelectTrigger id="avatar-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {avatarOptions.map((avatar) => (
                      <SelectItem key={avatar.value} value={avatar.value}>
                        {avatar.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mood Selection */}
              <div className="space-y-2">
                <Label htmlFor="mood-select">Mood</Label>
                <Select
                  value={selectedMood}
                  onValueChange={handleMoodChange}
                  disabled={!scriptsLoaded}
                >
                  <SelectTrigger id="mood-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {moodOptions.map((mood) => (
                      <SelectItem key={mood.value} value={mood.value}>
                        {mood.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="text-muted-foreground text-sm">
              <p className="mb-1 font-medium">Current Configuration:</p>
              <ul className="space-y-1">
                <li>
                  • Voice:{' '}
                  {voiceOptions.find((v) => v.value === selectedVoice)?.label}
                </li>
                <li>
                  • Avatar:{' '}
                  {avatarOptions.find((a) => a.value === selectedAvatar)?.label}
                </li>
                <li>
                  • Mood:{' '}
                  {moodOptions.find((m) => m.value === selectedMood)?.label}
                </li>
                <li>• TTS Server: {kokoroEndpoint}</li>
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Status Display */}
        {status && (
          <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default TalkingHead;
