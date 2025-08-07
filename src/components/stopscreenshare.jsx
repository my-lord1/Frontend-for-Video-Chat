export async function stopScreenSharing({ peerConnectionsRef, screenStreamRef, socketRef, peerId }) {
    const pc = peerConnectionsRef.current[peerId];
    if (!screenStreamRef.current || !pc) return;
  
    screenStreamRef.current.getTracks().forEach((track) => track.stop());
  
    const senders = pc.getSenders();
    senders.forEach((sender) => {
      if (screenStreamRef.current.getTracks().includes(sender.track)) {
        pc.removeTrack(sender);
      }
    });
  
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
  
    socketRef.current.emit("signal", {
      to: peerId,
      type: "offer",
      payload: offer,
    });
  
    console.log("Screen sharing stopped and renegotiated");
  }
  