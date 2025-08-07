export const handleLeaveCall = ({ localStreamRef, videoRef, peerConnectionsRef, socketRef, roomId, navigate, }) => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    peerConnectionsRef.current = {};
  
    socketRef.current?.emit('user disconnected', roomId);
    socketRef.current?.disconnect();
  
    navigate('/');
  };
  
          /* <button onClick={() => handleLeaveCall({ localStreamRef, videoRef, peerConnectionsRef, socketRef, roomId, navigate, })} className="border-2 rounded-lg px-4 py-2">
          <EndCall />
        </button>*/ 