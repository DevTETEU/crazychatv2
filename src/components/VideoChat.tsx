import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Maximize2, Minimize2 } from 'lucide-react';
import { webRTCService } from '../services/webrtc';
import { useStore } from '../store/useStore';
import clsx from 'clsx';

export const VideoChat: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const currentPartner = useStore((state) => state.currentPartner);

  useEffect(() => {
    const initializeVideo = async () => {
      try {
        const stream = await webRTCService.startLocalStream();
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error starting video:', error);
      }
    };

    initializeVideo();

    webRTCService.onStream((stream, socketId) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    });

    return () => {
      webRTCService.closeAllConnections();
    };
  }, []);

  useEffect(() => {
    if (currentPartner?.socketId) {
      webRTCService.initiateCall(currentPartner.socketId);
    }
  }, [currentPartner]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      remoteVideoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleVideo = async () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    const stream = await webRTCService.startLocalStream(newState, isAudioEnabled);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };

  const toggleAudio = async () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    const stream = await webRTCService.startLocalStream(isVideoEnabled, newState);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-4 right-4 w-1/4 aspect-video object-cover rounded-lg border-2 border-yellow-400"
      />
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4 bg-black/50 p-2 rounded-lg">
        <button
          onClick={toggleVideo}
          className={clsx(
            'p-2 rounded-full',
            isVideoEnabled ? 'bg-yellow-400' : 'bg-red-500'
          )}
        >
          {isVideoEnabled ? (
            <Video className="w-6 h-6 text-black" />
          ) : (
            <VideoOff className="w-6 h-6 text-white" />
          )}
        </button>
        <button
          onClick={toggleAudio}
          className={clsx(
            'p-2 rounded-full',
            isAudioEnabled ? 'bg-yellow-400' : 'bg-red-500'
          )}
        >
          {isAudioEnabled ? (
            <Mic className="w-6 h-6 text-black" />
          ) : (
            <MicOff className="w-6 h-6 text-white" />
          )}
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-full bg-yellow-400"
        >
          {isFullscreen ? (
            <Minimize2 className="w-6 h-6 text-black" />
          ) : (
            <Maximize2 className="w-6 h-6 text-black" />
          )}
        </button>
      </div>
    </div>
  );
};