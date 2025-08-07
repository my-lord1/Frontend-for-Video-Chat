export async function startFullMediaSharing({ peerConnectionsRef, screenStreamRef, socketRef, peerId }) {
  try {
    const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

    screenStreamRef.current = screenStream;

    const pc = peerConnectionsRef.current[peerId];

    userMediaStream.getTracks().forEach((track) => {
      pc.addTrack(track, userMediaStream);
    });

    screenStream.getTracks().forEach((track) => {
      pc.addTrack(track, screenStream);
      track.onended = () => console.log("Screen sharing stopped");
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current.emit("signal", {
      to: peerId,
      type: 'offer',
      payload: offer,
    });
    } catch (error) {
    console.error("Failed to share media:", error);
  }
}


