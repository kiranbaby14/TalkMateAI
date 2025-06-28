import VoiceActivityDetector from '@/components/VoiceActivityDetector';
import TalkingHead from '@/components/TalkingHead';
import { CameraToggleButton } from '@/components/CameraStream';

export default function Home() {
  return (
    <main className="relative min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            AI Voice & Avatar System
          </h1>
          <p className="text-lg text-gray-600">
            Advanced voice activity detection with 3D avatar integration and
            live camera
          </p>
        </div>

        {/* Main Content Layout */}
        <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
          {/* TalkingHead Component - Left */}
          <div className="order-1">
            <div className="rounded-lg bg-white p-6 shadow-lg">
              <TalkingHead />
            </div>
          </div>

          {/* Voice Activity Detector - Right */}
          <div className="order-2">
            <VoiceActivityDetector />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Powered by TalkingHead, Kokoro TTS, Advanced Voice Activity
            Detection, and WebRTC
          </p>
        </div>
      </div>

      {/* Floating Camera Component - Google Meet Style */}
      <CameraToggleButton />
    </main>
  );
}
