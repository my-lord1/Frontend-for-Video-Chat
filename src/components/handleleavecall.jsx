export const handleEndCall = (socketRef, navigate, localStreamRef, screenStreamRef, videoRef) => {
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      // Stop screen share tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
    
      // Close all peer connections
      if (peerConnectionsRef.current) {
        Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
        peerConnectionsRef.current = {};
      }

    if(socketRef.current) {
      socketRef.current.disconnect();
      console.log("🔌 Socket disconnected");
      navigate("/");
    }}
    