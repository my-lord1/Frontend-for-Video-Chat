export const handleEndCall = (socketRef, navigate, localStreamRef, screenStreamRef, peerConnectionsRef) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind} - ${track.label}`);
        track.stop();
    });
    localStreamRef.current = null;
      }
      // Stop screen share tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => {
          console.log(`Stopping screen track: ${track.kind} - ${track.label}`);
          track.stop();
      });
      screenStreamRef.current = null;
  }
    
      // Close all peer connections
      if (peerConnectionsRef.current) {
        Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
          console.log(`Closing connection to peer: ${peerId}`);
          if (pc && pc.close) {
              pc.close();
          }
      });
      peerConnectionsRef.current = {};
  }
  
  if (socketRef.current) {
    console.log("🔌 Disconnecting socket");
    socketRef.current.disconnect();
    socketRef.current = null;
}
navigate("/");
}
//10:00AM