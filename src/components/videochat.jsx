import { io } from "socket.io-client";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { EndCall } from "../icons/endcall.jsx";


const socket = io("https://backend-for-video-chat.vercel.app");

export default function VideoChat({ roomId }) {
  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteStreamsRef = useRef({});
  const remoteContainerRef = useRef(null);
  const screenStreamRef = useRef(null);
  const navigate = useNavigate();

  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.l.google.com:5349" },
    { urls: "stun:stun1.l.google.com:3478" },
  ];
  
  const setupOnTrack = (peerConnection, peerId) => {
    console.log(`🎯 Setting up ontrack for peer: ${peerId}`);
    
    if (!remoteStreamsRef.current[peerId]) {
      remoteStreamsRef.current[peerId] = {
        webcam: new MediaStream(),
        screen: new MediaStream(),
        trackCount: 0
      };
      console.log(`🎯 Created new remote streams for ${peerId}`);
    }
  
    peerConnection.ontrack = (event) => {
      console.log(`🎯 TRACK RECEIVED from ${peerId}: ${event.track.kind} - ${event.track.id}`);
      
      
      // CHANGE 1: Check if we already processed this exact track
      const existingTracks = [
        ...remoteStreamsRef.current[peerId].webcam.getTracks(),
        ...remoteStreamsRef.current[peerId].screen.getTracks()
      ];
      
      const alreadyProcessed = existingTracks.some(track => track.id === event.track.id);
      if (alreadyProcessed) {
        console.log(`🎯 Track ${event.track.id} already processed, ignoring duplicate`);
        return; // Skip duplicate tracks
      }
  
      if (event.track.kind === "video") {
        // CHANGE 2: Improved screen share detection
        const hasScreenKeyword = event.track.label.toLowerCase().includes('screen') || 
                                event.track.label.toLowerCase().includes('display') ||
                                event.track.label.toLowerCase().includes('window') ||
                                event.track.label.toLowerCase().includes('tab');
        
        // Check if we already have a webcam track (smart fallback)
        const hasWebcamTrack = remoteStreamsRef.current[peerId].webcam.getTracks().length > 0;
        
        const isScreenShare = hasScreenKeyword || (hasWebcamTrack && !hasScreenKeyword);
        
        console.log(`🎯 Track label: "${event.track.label}"`);
        console.log(`🎯 Has screen keyword: ${hasScreenKeyword}`);
        console.log(`🎯 Already has webcam: ${hasWebcamTrack}`);
        console.log(`🎯 Classified as: ${isScreenShare ? 'SCREEN SHARE' : 'WEBCAM'}`);
        
        if (isScreenShare) {
          remoteStreamsRef.current[peerId].screen.addTrack(event.track);
          let screenVideo = document.getElementById(`screen-${peerId}`);
          if (!screenVideo) {
            console.log(`🎯 Creating NEW screen video element for ${peerId}`);
            screenVideo = document.createElement("video");
            screenVideo.id = `screen-${peerId}`;
            screenVideo.autoplay = true;
            screenVideo.playsInline = true;
            screenVideo.className = "w-[400px] h-[300px] bg-gray-800 border-2 border-yellow-400";
            remoteContainerRef.current.appendChild(screenVideo);
          }
          screenVideo.srcObject = remoteStreamsRef.current[peerId].screen;
        } else {
          remoteStreamsRef.current[peerId].webcam.addTrack(event.track);
          let webcamVideo = document.getElementById(`video-${peerId}`);
          if (!webcamVideo) {
            console.log(`🎯 Creating NEW webcam video element for ${peerId}`);
            webcamVideo = document.createElement("video");
            webcamVideo.id = `video-${peerId}`;
            webcamVideo.autoplay = true;
            webcamVideo.playsInline = true;
            webcamVideo.className = "w-[400px] h-[300px] bg-black";
            remoteContainerRef.current.appendChild(webcamVideo);
          }
          webcamVideo.srcObject = remoteStreamsRef.current[peerId].webcam;
        }
        remoteStreamsRef.current[peerId].trackCount++;
      }
  
      if (event.track.kind === "audio") {
        // CHANGE 3: Also prevent duplicate audio elements
        const existingAudioElements = document.querySelectorAll(`audio[data-peer="${peerId}"][data-track="${event.track.id}"]`);
        if (existingAudioElements.length > 0) {
          console.log(`🎯 Audio element for track ${event.track.id} already exists, ignoring`);
          return;
        }
        
        console.log(`🎯 Creating audio element for ${peerId}`);
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioEl.srcObject = new MediaStream([event.track]);
        // Add identifiers to prevent duplicates
        audioEl.setAttribute('data-peer', peerId);
        audioEl.setAttribute('data-track', event.track.id);
        remoteContainerRef.current.appendChild(audioEl);
      }
    };
  };

  const addAllTracksToConnection = (pc) => {
    console.log(`🔥 addAllTracksToConnection called by ${socketRef.current?.id}`);
    
    const existingSenders = pc.getSenders();
    const hasAudio = existingSenders.some(s => s.track && s.track.kind === 'audio');
    const hasVideo = existingSenders.some(s => s.track && s.track.kind === 'video');
    
    console.log(`🔥 Connection already has: Audio=${hasAudio}, Video=${hasVideo}`);
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        const shouldSkip = (track.kind === 'audio' && hasAudio) || 
                          (track.kind === 'video' && hasVideo);
        
        if (!shouldSkip) {
          console.log(`✅ Adding ${track.kind} track: ${track.id}`);
          pc.addTrack(track, localStreamRef.current);
        } else {
          console.log(`⚠️ Skipping ${track.kind} - already exists`);
        }
      });
    }
    
    console.log(`🔥 Final senders: ${pc.getSenders().length}`);
  };
  
  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;

      const localScreenVideo = document.getElementById("local-screen");
      if (localScreenVideo) {
        localScreenVideo.srcObject = screenStream;
      }

      // Add screen tracks to all existing connections (keep webcam tracks)
      Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
        screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream));
        renegotiate(peerId, pc);
      });

      // Handle screen share ending
      screenStream.getVideoTracks()[0].addEventListener('ended', stopScreenShare);
    } catch (err) {
      console.error("Screen share failed:", err);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      
      const localScreenVideo = document.getElementById("local-screen");
      if (localScreenVideo) localScreenVideo.srcObject = null;

      // Remove only screen tracks from all connections
      Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
        const screenSenders = pc.getSenders().filter(sender => 
          sender.track && sender.track.kind === "video" && 
          sender.track.label.toLowerCase().includes("screen")
        );
        screenSenders.forEach(sender => pc.removeTrack(sender));
        if (screenSenders.length > 0) renegotiate(peerId, pc);
      });

      screenStreamRef.current = null;
    }
  };
  
  const renegotiate = async (peerId, pc) => {
    try {
      // Force a fresh negotiation regardless of role
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socketRef.current.emit("signal", { to: peerId, type: "offer", payload: offer });
      console.log(`Renegotiation initiated with ${peerId} from ${socketRef.current.id}`);
    } catch (err) {
      console.error(`Renegotiation failed with ${peerId}:`, err);
    }
  };

  const handleEndCall = () => {
    if(socketRef.current) {
      socketRef.current.disconnect();
      console.log("🔌 Socket disconnected");
    
    navigate("/");

    }}
  useEffect(() => {
    async function startVideoChat() {
      if (localStreamRef.current) {
        console.log("🔥 Stream already exists, skipping getUserMedia");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true },
          video: true,
        });
        console.log(`🔥 NEW LOCAL STREAM CREATED: ${stream.id}`);
          stream.getTracks().forEach(track => {
        console.log(`🔥 Stream Track: ${track.kind} - ${track.id}`);
        });

        videoRef.current.srcObject = stream;
        localStreamRef.current = stream;
        socketRef.current = socket;
        socket.emit("join-room", { roomId });

        socket.on("existing-peers", async ({ peers }) => {
          for (const peerId of peers) {
            const pc = new RTCPeerConnection({ iceServers });
            peerConnectionsRef.current[peerId] = pc;
            setupOnTrack(pc, peerId);
            addAllTracksToConnection(pc);

            pc.onicecandidate = (event) => {
              if (event.candidate) {
                socket.emit("signal", { to: peerId, type: "ice-candidate", payload: event.candidate });
              }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("signal", { to: peerId, type: "offer", payload: offer });
          }
        });

        socket.on("signal", async ({ from, type, payload }) => {
          let pc = peerConnectionsRef.current[from];
          if (!pc) {
            pc = new RTCPeerConnection({ iceServers });
            peerConnectionsRef.current[from] = pc;
            setupOnTrack(pc, from);
            addAllTracksToConnection(pc);
            
            pc.onicecandidate = (event) => {
              if (event.candidate) {
                socket.emit("signal", { to: from, type: "ice-candidate", payload: event.candidate });
              }
            };
          }
        
          try {
            if (type === "offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(payload));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit("signal", { to: from, type: "answer", payload: answer });
            } else if (type === "answer") {
              await pc.setRemoteDescription(new RTCSessionDescription(payload));
            } else if (type === "ice-candidate") {
              if (payload && payload.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(payload));
              }
            }
          } catch (err) {
            console.error(`Error handling ${type} from ${from}:`, err);
          }
        });

        // Cleanup on disconnect

        socket.on("user-disconnected", ({ socketId }) => {
          console.log(`🚪 User ${socketId} disconnected (server notification)`);
          if (peerConnectionsRef.current[socketId]) {
            peerConnectionsRef.current[socketId].close();
            delete peerConnectionsRef.current[socketId];
          }
          const videoEl = document.getElementById(`video-${socketId}`);
          const screenEl = document.getElementById(`screen-${socketId}`);
          
          if (videoEl) {
            console.log(`🚪 Removing video element for ${socketId}`);
            videoEl.remove();
          }
          
          if (screenEl) {
            console.log(`🚪 Removing screen element for ${socketId}`);
            screenEl.remove();
          }
          
          // Clean up streams reference
          if (remoteStreamsRef.current[socketId]) {
            delete remoteStreamsRef.current[socketId];
          }
        });
      } catch (err) {
        console.error("Failed to access media devices:", err);
      }
    }

    if (roomId) {
      startVideoChat();
    }

    // Cleanup on unmount
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId]);

  const isScreenSharing = screenStreamRef.current !== null;
  
  return (
    <div className="m-10 fixed inset-[0] scale-[0.9] w-screen h-screen flex flex-col items-center justify-center">
      <h1 className="border-1 p-3 text-2xl font-bold mb-3">Video Chat - Room: {roomId}</h1>
      <div className="max-w-7xl">
        <div className="border-1 p-3 mb-6">
          <h2 className="text-lg font-semibold mb-1">Remote Participants</h2>
          <div ref={remoteContainerRef} className="flex gap-4 flex-wrap justify-center"></div>
        </div>
        
        <div className="border-1 p-3">
          <h2 className="text-lg font-semibold mb-1">Your Streams</h2>
          <div className="flex gap-4 justify-center flex-wrap">
            <div>
              <h3 className="text-sm font-medium mb-1">Your Camera</h3>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-[400px] h-[300px] bg-black rounded-lg shadow-lg"/>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-1">
                Your Screen Share {isScreenSharing ? "(Active)" : ""}
              </h3>
              <video
                id="local-screen"
                autoPlay
                playsInline
                muted
                className="w-[400px] h-[300px] bg-gray-800 border-2 border-yellow-400 rounded-lg shadow-lg"/>
            </div>
          </div>
        </div>
        
        <div className="border-1 p-3 flex justify-center gap-4 mt-3">
          <button 
            className={`text-black font-medium rounded-lg px-6 py-3 border-2 border-yellow-400 ${
              isScreenSharing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={startScreenShare}
            disabled={isScreenSharing}>
            {isScreenSharing ? "Screen Sharing..." : "Start Screen Share"}
          </button>
          <button 
            className={`text-black font-medium rounded-lg px-6 py-3 border-2 border-yellow-400 ${
              !isScreenSharing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={stopScreenShare}
            disabled={!isScreenSharing}>
            Stop Screen Share
          </button>
          <button onClick={handleEndCall}>
            <EndCall />
            End Call
          </button>
        </div>
      </div>
    </div>
  );
}