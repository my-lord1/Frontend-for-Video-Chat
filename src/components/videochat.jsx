import {io} from 'socket.io-client';
import {useEffect, useRef} from 'react';
const socket = io('http://localhost:4000');



export default function VideoChat() {
    const videoRef = useRef(null);
    const localStreamRef = useRef(null);
    const socketRef = useRef(null);
    const peerConnectionsRef = useRef({});
    const remoteContainerRef = useRef(null);

    const setupOnTrack = (peerConnection) => {
        peerConnection.ontrack = (event) => {
          const remoteStream = event.streams[0];
          if (remoteStream) {
            const remoteVideo = document.createElement("video");
            remoteVideo.autoplay = true;
            remoteVideo.playsInline = true;
            remoteVideo.srcObject = remoteStream;
            remoteVideo.className = "w-[400px] h-[300px] bg-black";
            remoteContainerRef.appendChild(remoteVideo); // OR use a div with ref if you want to control layout
          }
        };
      };
    // gathering all media devices and user joining the room
    useEffect(()=> {
        async function startVideoChat(cameraId, minWidth, MinHeight) {
            const constraints = {
                'audio' : { 'echoCancellation': true},
                'video' : { 'deviceId': cameraId,
                    'width' : { 'min': minWidth },
                    'height' : { 'min': MinHeight }
                }
            }

            try { 
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    localStreamRef.current = stream;
                }
                socketRef.current = socket;
                socket.emit("join-room", "room123");
            } catch (error) {   
                console.error("Error accessing media devices.", error);
            }
        }
        startVideoChat();
    }, []);

    // stun servers configuration
    const iceServers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.l.google.com:5349" },
        { urls: "stun:stun1.l.google.com:3478" },]
    
    //recieving the peerid, creating a peer connection,
    // storing both in hashmaps and creating a offer and setLocalDescription
    socket.on("existing-peers", (peers) => {
        peers.forEach(async peerId => {
            const peerConnection = new RTCPeerConnection({ iceServers });
            peerConnectionsRef.current[peerId] = peerConnection;
            setupOnTrack(peerConnection);

            localStreamRef.current.getTracks().forEach(track=> {
                peerConnection.addTrack(track, localStreamRef.current);
            });
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        peerConnection.onicecandidate = (event) => {
            socket.emit("signal", {
                to: peerId,
                type: "ice-candidate",
                payload: event.candidate
            })
        } 
        socket.emit("signal", {
            to: peerId,
            type: "offer",
            payload: offer,
        })
        });
        
    });
    //see for now i created a peer connection between user joined to existing peers
        //now, i have to create a peer connection between existing peers to new user right?
    socket.on("signal", async ({ from, type, payload }) => {
        if (!peerConnectionsRef.current[from]) {
            const peerConnection = new RTCPeerConnection({ iceServers });
            peerConnectionsRef.current[from] = peerConnection;
            setupOnTrack(peerConnection);

            localStreamRef.current.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStreamRef.current);
            })

            peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("signal", {
                    to: from,
                    type: "ice-candidate",
                    payload: event.candidate
                    });
                }   
            }
        }
        const peerConnection = peerConnectionsRef.current[from];
        if (type === "offer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit("signal", {
                to: from,
                type: "answer",
                payload: answer
            })
        }

        

        if (type === "ice-candidate") {
            try{await peerConnection.addIceCandidate(payload)}
            catch(error) {
                console.error("Error adding received ice candidate", error); // this should be in existing peers too
            }
        }
        if (type === "answer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
        }
        

    });









    return (
        <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Video Chat</h1>

      <div className="flex gap-4 flex-wrap">
        <div>
          <h2 className="text-md font-semibold mb-2">Your Video</h2>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-[400px] h-[300px] bg-black"
          />
        </div>

        <div>
          <h2 className="text-md font-semibold mb-2">Remote Videos</h2>
          <div
            ref={remoteContainerRef}
            className="flex gap-4 flex-wrap"
          />
        </div>
      </div>
    </div>
      )
    
    }