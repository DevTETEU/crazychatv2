import { socket } from './socket';

interface RTCPeerData {
  socketId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

class WebRTCService {
  private peerConnections: Map<string, RTCPeerData> = new Map();
  private localStream: MediaStream | null = null;
  private onStreamCallback: ((stream: MediaStream, socketId: string) => void) | null = null;

  constructor() {
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    socket.on('offer', async ({ offer, from }) => {
      const answer = await this.handleOffer(offer, from);
      socket.emit('answer', { answer, to: from });
    });

    socket.on('answer', ({ answer, from }) => {
      this.handleAnswer(answer, from);
    });

    socket.on('ice-candidate', ({ candidate, from }) => {
      this.handleIceCandidate(candidate, from);
    });
  }

  async startLocalStream(videoEnabled: boolean = true, audioEnabled: boolean = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: audioEnabled
      });
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  async createPeerConnection(socketId: string) {
    const peerConnection = new RTCPeerConnection(configuration);
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: socketId
        });
      }
    };

    peerConnection.ontrack = (event) => {
      if (this.onStreamCallback) {
        this.onStreamCallback(event.streams[0], socketId);
      }
    };

    this.peerConnections.set(socketId, {
      socketId,
      connection: peerConnection,
    });

    return peerConnection;
  }

  async initiateCall(socketId: string) {
    const peerConnection = await this.createPeerConnection(socketId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    socket.emit('offer', {
      offer,
      to: socketId
    });
  }

  private async handleOffer(offer: RTCSessionDescriptionInit, from: string) {
    const peerConnection = await this.createPeerConnection(from);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit, from: string) {
    const peerData = this.peerConnections.get(from);
    if (peerData) {
      await peerData.connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit, from: string) {
    const peerData = this.peerConnections.get(from);
    if (peerData) {
      await peerData.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  onStream(callback: (stream: MediaStream, socketId: string) => void) {
    this.onStreamCallback = callback;
  }

  closeConnection(socketId: string) {
    const peerData = this.peerConnections.get(socketId);
    if (peerData) {
      peerData.connection.close();
      this.peerConnections.delete(socketId);
    }
  }

  closeAllConnections() {
    this.peerConnections.forEach(peerData => {
      peerData.connection.close();
    });
    this.peerConnections.clear();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }
}

export const webRTCService = new WebRTCService();