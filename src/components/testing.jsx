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

  const logStreamTracks = (stream, label) => {
    console.log(`📹 Tracks in ${label}:`, stream.getTracks().map(t => `${t.kind} (${t.label})`));
  };
  
  const setupOnTrack = (peerConnection, peerId) => {
    console.log(`🛠 Setting up ontrack for peer ${peerId}`);
    
    if (!remoteStreamsRef.current[peerId]) {
      remoteStreamsRef.current[peerId] = {
        webcam: new MediaStream(),
        screen: new MediaStream(),
        videoTracks: []
      };
    }
  
    peerConnection.ontrack = (event) => {
      console.log(`[ontrack] Peer ${peerId} track received: kind=${event.track.kind}, label=${event.track.label}`);
  
      if (event.track.kind === "video") {
        const existingVideoTracks = remoteStreamsRef.current[peerId].videoTracks.length;
        
        // CORE FIX: Simple track counting instead of unreliable label detection
        const isScreenShare = existingVideoTracks > 0;
        
        if (isScreenShare) {
          console.log(`🖥 Adding screen track for ${peerId}`);
          remoteStreamsRef.current[peerId].screen.addTrack(event.track);
  
          let screenVideo = document.getElementById(`screen-${peerId}`);
          if (!screenVideo) {
            screenVideo = document.createElement("video");
            screenVideo.id = `screen-${peerId}`;
            screenVideo.autoplay = true;
            screenVideo.playsInline = true;
            screenVideo.className = "w-[400px] h-[300px] bg-gray-800 border-2 border-yellow-400";
            remoteContainerRef.current.appendChild(screenVideo);
          }
          screenVideo.srcObject = remoteStreamsRef.current[peerId].screen;
  
        } else {
          console.log(`🎥 Adding webcam track for ${peerId}`);
          remoteStreamsRef.current[peerId].webcam.addTrack(event.track);
  
          let webcamVideo = document.getElementById(`video-${peerId}`);
          if (!webcamVideo) {
            webcamVideo = document.createElement("video");
            webcamVideo.id = `video-${peerId}`;
            webcamVideo.autoplay = true;
            webcamVideo.playsInline = true;
            webcamVideo.className = "w-[400px] h-[300px] bg-black";
            remoteContainerRef.current.appendChild(webcamVideo);
          }
          webcamVideo.srcObject = remoteStreamsRef.current[peerId].webcam;
        }
        
        remoteStreamsRef.current[peerId].videoTracks.push(event.track);
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
      console.log("🖥️ Starting screen share...");
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      console.log("🖥️ Screen share stream obtained:", screenStream);

      screenStreamRef.current = screenStream;

      const localScreenVideo = document.getElementById("local-screen");
      if (localScreenVideo) {
        localScreenVideo.srcObject = screenStream;
      }

      Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
        console.log(`🛠️ Adding screen tracks to peer ${peerId}`);
        
        const senders = pc.getSenders();
        senders.forEach(sender => {
          if (
            sender.track &&
            sender.track.kind === "video" &&
            sender.track.label.toLowerCase().includes("screen")
          ) {
            pc.removeTrack(sender);
          }
        });

        screenStream.getTracks().forEach((track) => {
          console.log(`➕ Adding screen track to peer ${peerId}: ${track.kind} (${track.label})`);
          pc.addTrack(track, screenStream);
        });

        renegotiate(peerId, pc);
      });
    } catch (err) {
      console.error("❌ Error starting screen share:", err);
    }
  };
  
  const renegotiate = async (peerId, pc) => {
    try {
      console.log(`🔄 Renegotiation started with peer ${peerId}`);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("signal", {
        to: peerId,
        type: "offer",
        payload: offer,
      });
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
            console.log(`🔹 Creating new RTCPeerConnection for ${from}`);
            pc = new RTCPeerConnection({ iceServers });
            peerConnectionsRef.current[from] = pc;
        
            setupOnTrack(pc, from);
        
            localStreamRef.current.getTracks().forEach((track) => {
              pc.addTrack(track, localStreamRef.current);
            });
        
            pc.onicecandidate = (event) => {
              if (event.candidate) {
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
              await pc.setRemoteDescription(new RTCSessionDescription(payload));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit("signal", {
                to: from,
                type: "answer",
                payload: answer,
              });
        
            } else if (type === "answer") {
              await pc.setRemoteDescription(new RTCSessionDescription(payload));
        
            } else if (type === "ice-candidate") {
              if (payload && payload.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(payload));
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
            className="text-black font-medium rounded-lg px-6 py-3 border-2 border-yellow-400"
            onClick={startScreenShare}>
            Start Screen Share
          </button>
          <button 
            className="text-black font-medium rounded-lg px-6 py-3 border-2 border-yellow-400">
            Stop Screen Share
          </button>
        </div>
      </div>
    </div>
  );
}//1109