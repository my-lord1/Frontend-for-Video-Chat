import { io } from 'socket.io-client';
import { useEffect, useRef } from 'react';

const socket = io('http://localhost:4000');

export default function VideoChat({roomId}) {
  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteContainerRef = useRef(null);

  const setupOnTrack = (peerConnection, peerId) => {
    const remoteStream = new MediaStream();

    peerConnection.ontrack = (event) => {
      remoteStream.addTrack(event.track);
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        const remoteVideo = document.createElement("video");
        remoteVideo.autoplay = true;
        remoteVideo.playsInline = true;
        remoteVideo.srcObject = remoteStream;
        remoteVideo.className = "w-[400px] h-[300px] bg-black";
        remoteContainerRef.current.appendChild(remoteVideo);
      }
    };
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
        socket.emit("join-room", roomId);
      } catch (err) {
        console.error("Failed to access media devices:", err);
      }
    }
    if(roomId) {
      startVideoChat();
    }
    socket.on("existing-peers", async ({ peers }) => {
      peers.forEach(async (peerId) => {
        const peerConnection = new RTCPeerConnection({ iceServers });
        peerConnectionsRef.current[peerId] = peerConnection;
        setupOnTrack(peerConnection, peerId);

        localStreamRef.current.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStreamRef.current);
        });

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("signal", {
              to: peerId,
              type: "ice-candidate",
              payload: event.candidate,
            });
          }
        };
 
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit("signal", {
          to: peerId,
          type: "offer",
          payload: offer,
        });
      });
    });

    socket.on("signal", async ({ from, type, payload }) => {
      let peerConnection = peerConnectionsRef.current[from];

      if (!peerConnection) {
        peerConnection = new RTCPeerConnection({ iceServers });
        peerConnectionsRef.current[from] = peerConnection;
        setupOnTrack(peerConnection, from);

        localStreamRef.current.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStreamRef.current);
        });

        peerConnection.onicecandidate = (event) => {
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
          await peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          socket.emit("signal", {
            to: from,
            type: "answer",
            payload: answer,
          });
        } else if (type === "answer") {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
        } else if (type === "ice-candidate") {
          if (payload && payload.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(payload));
          } else {
            console.warn("⚠️ ICE candidate payload missing or invalid");
          }
        } else {
          console.warn("❓ Unknown signal type:", type);
        }
      } catch (err) {
        console.error(`❌ Error handling signal type ${type}:`, err);
      }
    });
  }, [roomId]);

  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.l.google.com:5349" },
    { urls: "stun:stun1.l.google.com:3478" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen p-4">
      <h1 className="text-xl font-bold mb-4">Video Chat</h1>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-md font-semibold mb-2 ">Remote Videos</h2>
          <div ref={remoteContainerRef} className="flex gap-4 flex-wrap" />
        </div>
        <div>
        <h2 className="text-md font-semibold mb-2 ">your video</h2>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-[400px] h-[300px] bg-black"
          />
        </div>

        
      </div>
    </div>
  );
}
