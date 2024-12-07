import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Maximize2, Minimize2 } from 'lucide-react';
import { socket } from '../services/socket';
import { useStore } from '../store/useStore';
import clsx from 'clsx';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export const VideoChat: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const currentPartner = useStore((state) => state.currentPartner);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        initializePeerConnection();
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    initializeMedia();

    return () => {
      localStream.current?.getTracks().forEach(track => track.stop());
      peerConnection.current?.close();
    };
  }, []);

  const initializePeerConnection = () => {
    peerConnection.current = new RTCPeerConnection(configuration);

    // Add local stream
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, localStream.current!);
      });
    }

    // Handle incoming stream
    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && currentPartner) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: currentPartner.socketId
        });
      }
    };

    if (currentPartner) {
      createOffer();
    }
  };

  const createOffer = async () => {
    try {
      const offer = await peerConnection.current?.createOffer();
      await peerConnection.current?.setLocalDescription(offer);
      
      if (currentPartner && offer) {
        socket.emit('offer', {
          offer,
          to: currentPartner.socketId
        });
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  useEffect(() => {
    socket.on('offer', async ({ offer, from }) => {
      try {
        await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.current?.createAnswer();
        await peerConnection.current?.setLocalDescription(answer);
        
        socket.emit('answer', {
          answer,
          to: from
        });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    socket.on('answer', async ({ answer }) => {
      try {
        await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      try {
        await peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    return () => {
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      remoteVideoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      videoTrack.enabled = !isVideoEnabled;
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      audioTrack.enabled = !isAudioEnabled;
      setIsAudioEnabled(!isAudioEnabled);
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
