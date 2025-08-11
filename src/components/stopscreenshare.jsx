import { io } from "socket.io-client";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const socket = io("http://localhost:3000");

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

  // Setup track handler
  const logStreamTracks = (stream, label) => {
    console.log(`📹 Tracks in ${label}:`, stream.getTracks().map(t => `${t.kind} (${t.label})`));
  };
  
  const setupOnTrack = (peerConnection, peerId) => {
    console.log(`🛠 Setting up ontrack for peer ${peerId}`);
    
    if (!remoteStreamsRef.current[peerId]) {
      remoteStreamsRef.current[peerId] = {
        webcam: new MediaStream(),
        screen: new MediaStream(),
        videoTracks: [],
        receivedTracks: 0
      };
    }
  
    peerConnection.ontrack = (event) => {
      remoteStreamsRef.current[peerId].receivedTracks++;
      const trackNum = remoteStreamsRef.current[peerId].receivedTracks;
      
      console.log(`🎯 [ontrack] Track #${trackNum} from peer ${peerId}:`, {
        kind: event.track.kind,
        label: event.track.label,
        id: event.track.id,
        streamIds: event.streams.map(s => s.id),
        settings: event.track.kind === 'video' ? event.track.getSettings() : null,
        readyState: event.track.readyState,
        enabled: event.track.enabled
      });
  
      if (event.track.kind === "video") {
        const trackSettings = event.track.getSettings();
        const existingVideoTracks = remoteStreamsRef.current[peerId].videoTracks.length;
        
        // SIMPLIFIED: Just treat 2nd+ video track as screen share
        const isScreenShare = existingVideoTracks > 0;
        
        console.log(`🔍 DECISION for peer ${peerId} track #${trackNum}:`, {
          label: event.track.label,
          resolution: trackSettings.width ? `${trackSettings.width}x${trackSettings.height}` : 'unknown',
          existingVideoTracks,
          isScreenShare,
          trackId: event.track.id
        });
  
        if (isScreenShare) {
          console.log(`🖥 SCREEN: Adding to screen stream for ${peerId}`);
          
          // Clear existing screen tracks first
          remoteStreamsRef.current[peerId].screen.getTracks().forEach(t => {
            remoteStreamsRef.current[peerId].screen.removeTrack(t);
          });
          
          remoteStreamsRef.current[peerId].screen.addTrack(event.track);
          
          let screenVideo = document.getElementById(`screen-${peerId}`);
          if (!screenVideo) {
            screenVideo = document.createElement("video");
            screenVideo.id = `screen-${peerId}`;
            screenVideo.autoplay = true;
            screenVideo.playsInline = true;
            screenVideo.className = "w-[400px] h-[300px] bg-gray-800 border-2 border-yellow-400";
            screenVideo.style.border = "3px solid red"; // Debug visual cue
            remoteContainerRef.current.appendChild(screenVideo);
            
            // Add debug label
            const label = document.createElement("div");
            label.textContent = `SCREEN ${peerId}`;
            label.style.color = "red";
            label.style.fontWeight = "bold";
            remoteContainerRef.current.appendChild(label);
            
            console.log(`✅ CREATED screen video element for ${peerId}`);
          }
          
          screenVideo.srcObject = remoteStreamsRef.current[peerId].screen;
          console.log(`🎬 SET screen video srcObject for ${peerId}:`, screenVideo.srcObject);
          
          // Debug video element state
          screenVideo.addEventListener('loadedmetadata', () => {
            console.log(`📺 Screen video metadata loaded for ${peerId}:`, {
              videoWidth: screenVideo.videoWidth,
              videoHeight: screenVideo.videoHeight,
              duration: screenVideo.duration,
              paused: screenVideo.paused
            });
          });
          
          screenVideo.play()
            .then(() => console.log(`▶️ Screen video playing for ${peerId}`))
            .catch(e => console.error(`❌ Screen video play failed for ${peerId}:`, e));
  
        } else {
          console.log(`🎥 WEBCAM: Adding to webcam stream for ${peerId}`);
          
          // Clear existing webcam tracks first
          remoteStreamsRef.current[peerId].webcam.getTracks().forEach(t => {
            remoteStreamsRef.current[peerId].webcam.removeTrack(t);
          });
          
          remoteStreamsRef.current[peerId].webcam.addTrack(event.track);
  
          let webcamVideo = document.getElementById(`video-${peerId}`);
          if (!webcamVideo) {
            webcamVideo = document.createElement("video");
            webcamVideo.id = `video-${peerId}`;
            webcamVideo.autoplay = true;
            webcamVideo.playsInline = true;
            webcamVideo.className = "w-[400px] h-[300px] bg-black";
            webcamVideo.style.border = "3px solid blue"; // Debug visual cue
            remoteContainerRef.current.appendChild(webcamVideo);
            
            // Add debug label
            const label = document.createElement("div");
            label.textContent = `WEBCAM ${peerId}`;
            label.style.color = "blue";
            label.style.fontWeight = "bold";
            remoteContainerRef.current.appendChild(label);
            
            console.log(`✅ CREATED webcam video element for ${peerId}`);
          }
          
          webcamVideo.srcObject = remoteStreamsRef.current[peerId].webcam;
          console.log(`🎬 SET webcam video srcObject for ${peerId}:`, webcamVideo.srcObject);
          
          webcamVideo.play()
            .then(() => console.log(`▶️ Webcam video playing for ${peerId}`))
            .catch(e => console.error(`❌ Webcam video play failed for ${peerId}:`, e));
        }
        
        // Track this video track
        remoteStreamsRef.current[peerId].videoTracks.push({
          track: event.track,
          type: isScreenShare ? 'screen' : 'webcam',
          trackNum
        });
      }
  
      if (event.track.kind === "audio") {
        console.log(`🎧 Adding audio track for ${peerId}`);
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioEl.srcObject = new MediaStream([event.track]);
        remoteContainerRef.current.appendChild(audioEl);
      }
    };
  };
  
  
  const startScreenShare = async () => {
    try {
      console.log("🖥️ Starting screen share... requesting display media");
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always"
        },
        audio: false // Start with video only to avoid issues
      });
      
      console.log("🖥️ Screen share stream obtained:", screenStream);
      console.log("🖥️ Screen share tracks:", screenStream.getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        id: t.id,
        settings: t.getSettings()
      })));
  
      screenStreamRef.current = screenStream;
  
      const localScreenVideo = document.getElementById("local-screen");
      if (localScreenVideo) {
        localScreenVideo.srcObject = screenStream;
        localScreenVideo.play().catch(e => console.log('Local screen autoplay prevented:', e));
        console.log("🖥️ Local screen video element updated");
      } else {
        console.warn("⚠️ Local screen video element not found");
      }
  
      // Add screen share tracks to all peer connections
      Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
        console.log(`🛠️ Adding screen tracks to peer ${peerId}`);
        
        // Remove existing screen tracks first
        const senders = pc.getSenders();
        senders.forEach(sender => {
          if (sender.track && sender.track.kind === "video") {
            const trackSettings = sender.track.getSettings();
            const isScreen = sender.track.label.toLowerCase().includes("screen") ||
                           sender.track.label.toLowerCase().includes("display") ||
                           (trackSettings.width > 1280 || trackSettings.height > 720);
            
            if (isScreen) {
              console.log(`🗑️ Removing old screen track from peer ${peerId}:`, sender.track.label);
              pc.removeTrack(sender);
            }
          }
        });
  
        // Add new screen tracks
        screenStream.getTracks().forEach((track) => {
          console.log(`➕ Adding screen track to peer ${peerId}:`, {
            kind: track.kind,
            label: track.label,
            id: track.id,
            settings: track.getSettings()
          });
          pc.addTrack(track, screenStream);
        });
  
        renegotiate(peerId, pc);
      });
      
      // Handle screen share ending
      screenStream.getVideoTracks()[0].onended = () => {
        console.log("🛑 Screen share ended");
        stopScreenShare();
      };
      
    } catch (err) {
      console.error("❌ Error starting screen share:", err);
      alert(`Screen share failed: ${err.message}`);
    }
  };
  
  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      console.log("🛑 Stopping screen share");
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      
      // Clear local screen video
      const localScreenVideo = document.getElementById("local-screen");
      if (localScreenVideo) {
        localScreenVideo.srcObject = null;
      }
      
      // Remove screen tracks from all peer connections
      Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
        const senders = pc.getSenders();
        senders.forEach(sender => {
          if (sender.track && sender.track.kind === "video") {
            const trackSettings = sender.track.getSettings();
            const isScreen = sender.track.label.toLowerCase().includes("screen") ||
                           sender.track.label.toLowerCase().includes("display") ||
                           (trackSettings.width > 1280 || trackSettings.height > 720);
            
            if (isScreen) {
              console.log(`🗑️ Removing screen track from peer ${peerId}`);
              pc.removeTrack(sender);
            }
          }
        });
        renegotiate(peerId, pc);
      });
    }
  };
  
  const renegotiate = async (peerId, pc) => {
    try {
      console.log(`🔄 Renegotiation started with peer ${peerId}`);
      const offer = await pc.createOffer();
      console.log(`📢 Created offer for peer ${peerId} - SDP type: ${offer.type}`);
  
      await pc.setLocalDescription(offer);
      console.log(`✅ Set local description for peer ${peerId}`);
  
      socketRef.current.emit("signal", {
        to: peerId,
        type: "offer",
        payload: offer,
      });
      console.log(`📤 Sent offer to peer ${peerId}`);
    } catch (err) {
      console.error(`❌ Renegotiation failed with peer ${peerId}:`, err);
    }
  };

  useEffect(() => {
    async function startVideoChat() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true },
          video: true,
        });

        videoRef.current.srcObject = stream;
        localStreamRef.current = stream;

        socketRef.current = socket;
        socket.emit("join-room", { roomId });

        // Handle existing peers when joining
        socket.on("existing-peers", async ({ peers }) => {
          for (const peerId of peers) {
            console.log(`🔹 Creating connection to existing peer: ${peerId}`);
            const pc = new RTCPeerConnection({ iceServers });
            peerConnectionsRef.current[peerId] = pc;

            setupOnTrack(pc, peerId);

            localStreamRef.current.getTracks().forEach((track) => {
              pc.addTrack(track, localStreamRef.current);
            });

            pc.onicecandidate = (event) => {
              if (event.candidate) {
                socket.emit("signal", {
                  to: peerId,
                  type: "ice-candidate",
                  payload: event.candidate,
                });
              }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit("signal", {
              to: peerId,
              type: "offer",
              payload: offer,
            });
          }
        });

        socket.on("signal", async ({ from, type, payload }) => {
          console.log(`📩 Signal received from ${from} - type: ${type}`);
        
          let pc = peerConnectionsRef.current[from];
          if (!pc) {
            console.log(`🔹 Creating new RTCPeerConnection for ${from} due to incoming signal`);
            pc = new RTCPeerConnection({ iceServers });
            peerConnectionsRef.current[from] = pc;
        
            setupOnTrack(pc, from);
        
            localStreamRef.current.getTracks().forEach((track) => {
              pc.addTrack(track, localStreamRef.current);
              console.log(`➕ Added local track to new pc for peer ${from}: ${track.kind} (${track.label})`);
            });
        
            pc.onicecandidate = (event) => {
              if (event.candidate) {
                console.log(`💧 Sending ICE candidate to ${from}`);
                socket.emit("signal", {
                  to: from,
                  type: "ice-candidate",
                  payload: event.candidate,
                });
              }
            };
          }
        
          try {
            if (type === "offer") {
              console.log(`📥 Setting remote offer from ${from}`);
              await pc.setRemoteDescription(new RTCSessionDescription(payload));
        
              const answer = await pc.createAnswer();
              console.log(`📤 Created answer for ${from}`);
        
              await pc.setLocalDescription(answer);
              console.log(`✅ Set local description (answer) for ${from}`);
        
              socket.emit("signal", {
                to: from,
                type: "answer",
                payload: answer,
              });
              console.log(`📤 Sent answer to ${from}`);
        
            } else if (type === "answer") {
              console.log(`📥 Setting remote answer from ${from}`);
              await pc.setRemoteDescription(new RTCSessionDescription(payload));
        
            } else if (type === "ice-candidate") {
              console.log(`💧 Adding ICE candidate from ${from}`);
              if (payload && payload.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(payload));
                console.log(`✅ ICE candidate added from ${from}`);
              }
            }
          } catch (err) {
            console.error(`❌ Error handling ${type} from ${from}:`, err);
          }
        });
        } catch (err) {
        console.error("Failed to access media devices:", err);
      }
    }

    if (roomId) {
      startVideoChat();
    }
  }, [roomId]);
  
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
              <h3 className="text-sm font-medium mb-1">Your Screen Share</h3>
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
            className="text-black font-medium rounded-lg px-6 py-3 border-2 border-yellow-400 hover:bg-yellow-50"
            onClick={startScreenShare}>
            Start Screen Share
          </button>
          <button 
            className="text-black font-medium rounded-lg px-6 py-3 border-2 border-red-400 hover:bg-red-50"
            onClick={stopScreenShare}>
            Stop Screen Share
          </button>
        </div>
      </div>
    </div>
  );
}