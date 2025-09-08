import { io } from "socket.io-client";
import { useEffect, useRef, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setupOnTrack } from "./setupontrack.jsx";
import { addAllTracksToConnection } from "./addtrackstopc.jsx";
import { handleEndCall } from "./handleleavecall.jsx";
import { MediaContext } from "../components/mediaprovider";
import { useChat } from "./chatBox.jsx";
import { useParticipant } from "./participants.jsx";
import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, MessageSquareText, Users, LogOut, Send, X  } from 'lucide-react';
import { useToggle } from "./stopscreenshare.jsx";


const socket1 = io("https://backend-for-video-chat.onrender.com");


export default function VideoChat({ roomId, userName }) {
  const {
    videoRef,
    selectedCameraId,
    setSelectedCameraId,
    selectedMicId,
    setSelectedMicId,
    isvideoON,
    setisvideoON,
    isaudioON,
    setisaudioON
  } = useContext(MediaContext);
  
  const iceServers = [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun2.l.google.com:19302"
      ]
    },
    {
      urls: ["turn:relay1.expressturn.com:3478?transport=udp",
      "turn:relay1.expressturn.com:3478?transport=tcp",
      "turns:relay1.expressturn.com:5349?transport=tcp"],
      username: "000000002072631472",
      credential: "Yj579oM/G9H3QMIap4gsGzc0QBE="
    }
  ];
  
  const localStreamRef = useRef(null); // local stream to add in pc
  const socket1Ref = useRef(null); // socket refs
  const peerConnectionsRef = useRef({}); //peerid -> pc's
  const remoteContainerRef = useRef(null); // ref for remote videos
  const remoteScreenContainerRef = useRef(null); // ref for screenshare
  const remoteStreamsRef = useRef({}); // socket -> mediastreams which are ready to share
  const screenStreamRef = useRef(null); //local screenshare
  const navigate = useNavigate();
  const [isScreenShareActive, setIsScreenShareActive] = useState(false); //for local
  const [isRemoteScreenActive, setIsRemoteScreenActive] = useState(false); // for remote 
  const [currentSharerId, setCurrentSharerId] = useState(null); // to know the current socketid of teh screenshare
  const [controlsVisible, setControlVisible] = useState(true) // to control the controlers
  const [participants, setParticipants] = useState(false); // participants 
  const [chatOpen, setChatOpen] = useState(false); // // Chat state
  const remoteUserNamesRef = useRef({});
  const [remoteUserNames, setRemoteUserNames] = useState({});
  const isAnyScreenShareActive = isScreenShareActive || isRemoteScreenActive;
  const [ errorMessage, setErrorMessage ] = useState("")

  const {
    messages,
    newMessage, 
    unreadCount,
    chatMessagesRef,
    sendMessage,
    handleChatKeyPress,
    formatTime,
    setNewMessage,
  } = useChat(socket1, roomId, userName, chatOpen);

  const {
    users,
    roomJoined,
    setUsers,
    setRoomJoined
  } = useParticipant(socket1, roomId, userName, participants, isvideoON, isaudioON);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(()=> {
    if (!socket1) return 
    const handler = ({ peerusernames }) => {
      console.log("😎Received peernames data:", peerusernames);
      setRemoteUserNames(peerusernames);
      remoteUserNamesRef.current = peerusernames;
    };
    socket1.on("peer-usernames", handler);
    return () => socket1.off("peer-usernames", handler);
  },[])

  useEffect(() => {
    remoteUserNamesRef.current = remoteUserNames;
    console.log("😎Latest remoteUserNames:", remoteUserNamesRef.current);
  }, [remoteUserNames]);
  
  useEffect(() => {
  const handleScreenShareStateUpdate = (data) => {
    const { isActive, sharerId, sharerSocketId } = data;
    console.log("Screen share state update:", data); 
    if (isActive) {
      if (sharerSocketId === socket1.id) {
        setIsScreenShareActive(true);
        setIsRemoteScreenActive(false);
      } else {
        setIsScreenShareActive(false);
        setIsRemoteScreenActive(true);
      }
      setCurrentSharerId(sharerId);
    } else {

      setIsScreenShareActive(false);
      setIsRemoteScreenActive(false);
      setCurrentSharerId(null);
    }
  };

  const handleScreenShareAlreadyActive = () => {
    alert("Someone else is already sharing their screen!");
    setIsScreenShareActive(false);
  };
  socket1.on("screen-share-state-update", handleScreenShareStateUpdate);
  socket1.on("screen-share-already-active", handleScreenShareAlreadyActive);
  return () => {
    socket1.off("screen-share-state-update", handleScreenShareStateUpdate);
    socket1.off("screen-share-already-active", handleScreenShareAlreadyActive);
  };
}, []);

  const startScreenShare = async () => {
    if (isScreenShareActive) return;
  
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = screenStream;
  
      const localScreenVideo = document.getElementById("local-screen");
      if (localScreenVideo) localScreenVideo.srcObject = screenStream;
  
      Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
        screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream));
        renegotiate(peerId, pc);
      });
      
      const handleNewUserJoined = ({ socketId }) => {
        const pc = peerConnectionsRef.current[socketId];
        if (pc && screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, screenStreamRef.current);
          });
          renegotiate(socketId, pc);
        }
      };
      socket1.on("user-joined", handleNewUserJoined);

  
      screenStream.getVideoTracks()[0].addEventListener("ended", () => {
        // Remove the listener when screen share ends
        socket1.off("user-joined", handleNewUserJoined);
        stopScreenShare();
      });
        
      socket1.emit("start-screen-share", { roomId });
    } catch (err) {
      console.error("Screen share failed:", err);
    }
  };
  
  const stopScreenShare = (socketId) => {
    if (!isScreenShareActive) return;
  
    const stream = screenStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
  
    const localScreenVideo = document.getElementById("local-screen");
    if (localScreenVideo) localScreenVideo.srcObject = null;
  
    Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
      const screenSenders = pc.getSenders().filter(s =>
        s.track &&
        s.track.kind === "video" &&
        s.track.label.toLowerCase().includes("screen")
      );
      screenSenders.forEach(s => pc.removeTrack(s));
      if (screenSenders.length > 0) renegotiate(peerId, pc);
    });
  
    screenStreamRef.current = null;
    socket1.emit("stop-screen-share", { roomId });
  }
  
  const renegotiate = async (peerId, pc) => {
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socket1Ref.current.emit("signal", { to: peerId, type: "offer", payload: offer });

    } catch (err) {
      console.error(`Renegotiation failed with ${peerId}:`, err);
    }
  };
  const {
    toggleAudio,
    toggleVideo
  } = useToggle(localStreamRef, peerConnectionsRef, socket1, roomId, userName, isvideoON, setisvideoON, isaudioON, setisaudioON, renegotiate)


useEffect(() => {
  async function startVideoChat() {
    if (localStreamRef.current) return;

    try {
      console.log("before getuserMedia-isvideoON, isaudioON:", isvideoON, isaudioON);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined },
        audio: { deviceId: selectedMicId ? { exact: selectedMicId } : undefined }
      });
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        videoTrack.enabled = isvideoON;  
      }

      if (audioTrack) {
        audioTrack.enabled = isaudioON;   
      }

      videoRef.current.srcObject = stream;
      localStreamRef.current = stream;
      socket1Ref.current = socket1;

      console.log(`🚀 JOINING ROOM: ${roomId}`);
      socket1.emit("join-room", { roomId, userName });
      
      setRoomJoined(true);

      socket1.on("existing-peers", async ({ peers}) => {
        console.log(`📥 EXISTING-PEERS EVENT: Found ${peers.length} peers:`, peers);
        console.log(`📥 Current connections before:`, Object.keys(peerConnectionsRef.current));
        
        for (const peerId of peers) {
          console.log(`\n🔄 PROCESSING PEER: ${peerId}`);
          
          // Check if connection already exists
          if (peerConnectionsRef.current[peerId]) {
            console.log(`❌ CONNECTION ALREADY EXISTS FOR ${peerId} - SKIPPING`);
            continue;
          }
          
          console.log(`✅ CREATING NEW CONNECTION FOR ${peerId}`);
          const pc = new RTCPeerConnection({ iceServers });
          peerConnectionsRef.current[peerId] = pc;
          
          console.log(`📥 Current connections after adding ${peerId}:`, Object.keys(peerConnectionsRef.current));
          addAllTracksToConnection(pc, localStreamRef,
            selectedCameraId,
            selectedMicId,
            isvideoON,
            isaudioON
        );
        const peerName = remoteUserNamesRef.current[peerId]
        setupOnTrack(pc, peerId, remoteContainerRef, remoteStreamsRef, remoteScreenContainerRef, peerName);
          
          

          pc.onicecandidate = event => {
            if (event.candidate) {
              console.log(`🧊 SENDING ICE CANDIDATE TO ${peerId}`);
              socket1.emit("signal", { to: peerId, type: "ice-candidate", payload: event.candidate });
            }
          };

          console.log(`📤 CREATING AND SENDING OFFER TO ${peerId}`);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket1.emit("signal", { to: peerId, type: "offer", payload: offer });
        }
      });
      
      socket1.on("signal", async ({ from, type, payload, remoteName2 }) => {
        console.log(`\n📡 SIGNAL RECEIVED: ${type} FROM ${from}`);
        console.log(`📡 Current connections:`, Object.keys(peerConnectionsRef.current));
        
        let pc = peerConnectionsRef.current[from];
        
       
        if (!pc) {
          if (type === "offer") {
            console.log(`✅ NO CONNECTION EXISTS - CREATING NEW FOR ${from}`);
            pc = new RTCPeerConnection({ iceServers });
            peerConnectionsRef.current[from] = pc;
            
            console.log(`📥 Current connections after creating for ${from}:`, Object.keys(peerConnectionsRef.current));
            addAllTracksToConnection(pc, localStreamRef,
              selectedCameraId,
              selectedMicId,
              isvideoON,
              isaudioON
          );
          
          
          const peerName2 = remoteName2
          setupOnTrack(pc, from, remoteContainerRef, remoteStreamsRef, remoteScreenContainerRef, peerName2);

            pc.onicecandidate = event => {
              if (event.candidate) {
                console.log(`🧊 SENDING ICE CANDIDATE TO ${from}`);
                socket1.emit("signal", { to: from, type: "ice-candidate", payload: event.candidate });
              }
            };
          } else {
            console.error(`❌ NO PEER CONNECTION FOR ${from} WHEN HANDLING ${type}`);
            return;
          }
        } else {
          console.log(`✅ USING EXISTING CONNECTION FOR ${from}`);
        }

        console.log(`🔄 PEER CONNECTION STATE FOR ${from}: ${pc.signalingState}`);

        try {
          if (type === "offer") {
            console.log(`📥 PROCESSING OFFER FROM ${from}`);
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log(`📤 SENDING ANSWER TO ${from}`);
            socket1.emit("signal", { to: from, type: "answer", payload: answer });
            
          } else if (type === "answer") {
            console.log(`📥 PROCESSING ANSWER FROM ${from} (Expected state: have-local-offer, Actual: ${pc.signalingState})`);
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(payload));
              console.log(`✅ ANSWER PROCESSED SUCCESSFULLY FROM ${from}`);
            } else {
              console.error(`❌ WRONG STATE FOR ANSWER FROM ${from}: ${pc.signalingState}`);
            }
            
          } else if (type === "ice-candidate") {
            if (payload && payload.candidate) {
              console.log(`🧊 ADDING ICE CANDIDATE FROM ${from}`);
              await pc.addIceCandidate(new RTCIceCandidate(payload));
            }
          }
        } catch (err) {
          console.error(`❌ ERROR HANDLING ${type} FROM ${from}:`, err);
          console.error(`❌ PEER CONNECTION STATE: ${pc.signalingState}`);
        }
      });

      socket1.on("user-disconnected", ({ socketId }) => {
        console.log(`🚪 USER DISCONNECTED: ${socketId}`);
        
        // Close peer connection
        if (peerConnectionsRef.current[socketId]) {
          peerConnectionsRef.current[socketId].close();
          delete peerConnectionsRef.current[socketId];
        }
        
        // Find and remove elements
        const videoEl = document.getElementById(`video-${socketId}`);
        const screenEl = document.getElementById(`screen-${socketId}`);
        const cardEl = document.getElementById(`card-${socketId}`);
        
        console.log(`🔍 Found elements for ${socketId}:`, {
          video: !!videoEl,
          screen: !!screenEl, 
          card: !!cardEl
        });
        
        if (videoEl) {
          console.log(`🗑️ Removing video element for ${socketId}`);
          videoEl.remove();
        }
        if (screenEl) {
          console.log(`🗑️ Removing screen element for ${socketId}`);
          screenEl.remove();
        }
        if (cardEl) {
          console.log(`🗑️ Removing card element for ${socketId}`);
          cardEl.remove();
        } else {
          console.log(`❌ Card element not found for ${socketId}`);
        }
        socket1.emit("stop-screen-share", { roomId });
  
        if (remoteStreamsRef.current[socketId]) delete remoteStreamsRef.current[socketId]; //change this
      });
    } catch (err) {
      console.error("Failed to access media devices:", err);
    }
  }


  if (roomId) startVideoChat();
}, [roomId, selectedCameraId, selectedMicId, isaudioON, isvideoON, remoteUserNamesRef]);
  
  
const isScreenSharing = isScreenShareActive;
useEffect(() => {
  if (controlsVisible){
    const timer = setTimeout(() => setControlVisible(false), 3000);
    return () => clearTimeout(timer);
  }
}, [controlsVisible]); 

const handleMouse = () => {
  setControlVisible(true)
}

const handleLeaveCall = () =>
  handleEndCall(socket1Ref, navigate, localStreamRef, screenStreamRef, peerConnectionsRef);

const goFullScreen = (element) => {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.mozRequestFullScreen) { // Firefox
    element.mozRequestFullScreen();
  } else if (element.webkitRequestFullscreen) { // Chrome, Safari, Opera
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) { // IE/Edge
    element.msRequestFullscreen();
  }
};
  
  return (
    <div onMouseMove={handleMouse} className="realtive h-screen w-screen bg-gray-300 relative lg:overflow-hidden overflow-y-auto">
      {errorMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errorMessage}
        </div>
      )}
      <div className="lg:flex  grid gap-4 h-full w-full p-5">
          <div className={`${isAnyScreenShareActive? "flex-[1]": "flex lg:flex-row flex-col gap-2"}`}> {/* both ur video and remote videos*/}
            <div className={`relative rounded-lg flex-[1] shadow-lg`}>
              <video ref={videoRef} autoPlay playsInline muted
                className="w-full h-full object-cover rounded-lg"/>
              <div className="absolute bottom-0 left-0 right-0 text-white text-md text-center py-1">
                You idiot {/* your video*/}
              </div>
            </div>
            <div 
              ref={remoteContainerRef} className={`${isAnyScreenShareActive? "h-[500px]" : "flex-[3]"} mt-1 lg:flex grid gap-1`}> {/* remote videos*/}
            </div>
          </div>

          {/* Local screen share */}

          {isScreenShareActive ? (
            <div className= {`relative lg: flex-[3]`}>
                  <video id="local-screen" autoPlay playsInline ref={(el) => {if (el && screenStreamRef.current) {el.srcObject = screenStreamRef.current;}}} 
                  className= {` lg:h-[770px] h-[400px] lg:object-fill object-contain border-2 border-blue-400 `}/>
                    {isAnyScreenShareActive&& (
                      <button onClick={() => goFullScreen(document.getElementById("local-screen"))} className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-md">
                        ⛶
                      </button>
                    )}
                  </div>) 
              : ( <div className= {` relative lg:flex-[3]`}>
              <div ref={remoteScreenContainerRef} id="remote-screen" className={`lg:h-[770px] h-[400px] `}></div> 
              {isAnyScreenShareActive && (
                <button onClick={() => goFullScreen(document.getElementById("remote-screen"))} className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-md">
                  ⛶
                </button>
              )}
              </div> )}{/* remote screen share currentSharerId && currentSharerId !== socket1.id && !isScreenSharing flex-[7] */}
      </div>
      
        
        {/* Header Bar */}
        <div className={`lg:absolute fixed top-6 lg:left-6 left-10 bg-white/95 backdrop-blur-sm rounded-3xl px-6 py-4 shadow-xl transition-all duration-300 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Meeting Room</h1>
              <p className="text-sm text-gray-500"> ID: {roomId} </p>
              <p className="text-sm text-gray-500"> ScreenShare: {isAnyScreenShareActive ? "ON" : "OFF"} </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setParticipants(prev => !prev)} className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all transform hover:scale-110 bg-gray-100 hover:bg-blue-500 text-grey-700">
                <Users/>
              </button>
              <button onClick={() => setChatOpen(prev => !prev)} className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all transform hover:scale-110 bg-gray-100 hover:bg-blue-500 text-grey-700 relative">
                <MessageSquareText/>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/*control bar */}
        <div className={`lg:absolute fixed bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className= "flex items-center gap-3 bg-white/95 backdroup-blur-sm rounded-3xl px-6 py-4 shadow-xl">
            <button onClick={toggleVideo} className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all transform hover:scale-105 bg-gray-100 hover:bg-green-500 text-grey-700">
              {isvideoON ? <VideoOff/> : <Video/>}
            </button>
            <button onClick={toggleAudio} className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all transform hover:scale-105 bg-gray-100 hover:bg-green-500 text-grey-700">
              {isaudioON ? <MicOff/> : <Mic/>}
            </button>
            <button onClick={() => {
              
              if (isScreenSharing) {
                stopScreenShare();
              } 

              else if(isRemoteScreenActive) {
                setErrorMessage("Someone else is already sharing their screen!")
              }
              else {
                startScreenShare();
              }
              }} className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all transform
              ${isRemoteScreenActive ? "opacity-50 cursor-not-allowed" : "hover:scale-110 bg-gray-100 hover:bg-blue-500"}
            `}>
              {isScreenSharing ? <ScreenShareOff/> : <ScreenShare/>}
            </button>
            <div className = "w-px h-8 bg-gray-300" ></div>
            <button onClick={handleLeaveCall} className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all transform hover:scale-110 bg-gray-100 hover:bg-red-500 text-grey-700">
              <LogOut/>
            </button>
          </div>
        </div>

        {/* Participants Panel - Better positioned */}
        { participants &&
        <div className="absolute lg:top-6 top-50 right-6 bg-white/95 backdrop-blur-sm rounded-3xl p-4 shadow-xl w-xs max-h-96 overflow-y-auto">
        <div className="flex justify-between">
          <div className="text-lg font-bold text-gray-900 mb-3">Users ({Object.keys(users).length})</div>
          <button onClick={() => setParticipants(false)} className="mb-2 text-gray-500 hover:text-red-500 transition-colors">
                <X size={20}/>
          </button>
        </div>
          <div className="space-y-2">
            {Object.entries(users).map(([id, user]) => {
              // Add safety check for user object
              if (!user || typeof user !== 'object') {
                return null;
              }
              
              return (
                <div key={id} className="flex justify-between p-3 border rounded-lg shadow-sm bg-white/80">
                  <div className="text-lg text-gray-800">{user.userName || 'Unknown User'}</div>
                  <div className="flex gap-5 text-sm">
                    <span className={`flex items-center gap-1 ${user.isvideoON ? "text-green-600" : "text-red-600"}`}>
                      {user.isvideoON ? <Video/> : <VideoOff/>}
                    </span>
                    <span className={`flex items-center gap-1 ${user.isaudioON ? "text-green-600" : "text-red-600"}`}>
                      {user.isaudioON ? <Mic/> : <MicOff/>}
                    </span>
                  </div>
                </div>
              );
            })}
            {Object.keys(users).length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No participants yet
              </div>
            )}
          </div>
        </div>
        }

        {/* Chat Panel */}
        {chatOpen && (
          <div className="absolute lg:top-6 top-50 right-6 bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl w-80 h-96 flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Chat</h3>
              <button 
                onClick={() => setChatOpen(false)}
                className="text-gray-500 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Container */}
            <div ref={chatMessagesRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwnMessage = msg.socket1Id === socket1.id;
                  return (
                    <div key={index} 
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-lg ${isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                        {!isOwnMessage && (
                          <div className="text-xs text-blue-500 font-semibold mb-1 opacity-">
                            {msg.userName}
                          </div>
                        )}
                        <div className="text-sm">{msg.message}</div>
                        <div className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                          {formatTime(msg.ts)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={handleChatKeyPress} placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                <button onClick={sendMessage} disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
//2