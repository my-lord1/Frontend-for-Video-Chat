import {io} from 'socket.io-client';
import {useEffect, useRef} from 'react';
const socket = io('http://localhost:4000');



export function VideoChat() {
    const videoRef = useRef(null);
    const localStreamRef = useRef(null);
    const socketRef = useRef(null);
    const peerConnectionsRef = useRef({});

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
                const stream = await startVideoChat("default", 1280, 720);
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
        localStreamRef.current.getTracks().forEach(track=> {
            peerConnection.addTrack(track, localStreamRef.current);
        });
        peerConnectionsRef.current[peerId] = peerConnection;
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("signal", {
            to: peerId,
            type: "offer",
            payload: offer,
        })

        });        
    });






    
        

    

    







    return (
        <>
          <div>
            <video ref={videoRef} autoPlay playsInline  muted className="w-[400px] h-[300px] bg-black"/>
          </div>
        </>
      )
    
}