export const handleEndCall = (socketRef, navigate, localStreamRef, screenStreamRef, peerConnectionsRef) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
    });
    localStreamRef.current = null;
      }
      // Stop screen share tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => {
          track.stop();
      });
      screenStreamRef.current = null;
  }
    
      // Close all peer connections
      if (peerConnectionsRef.current) {
        Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
          if (pc && pc.close) {
              pc.close();
          }
      });
      peerConnectionsRef.current = {};
  }
  
  if (socketRef.current) {
    socketRef.current.disconnect();
    socketRef.current = null;
}
navigate("/");
}
//10:00AM