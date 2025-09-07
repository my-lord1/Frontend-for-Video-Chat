export const addAllTracksToConnection = (pc, localStreamRef, selectedCameraId, selectedMicId, isvideoON, isaudioON) => {
  if (!localStreamRef.current) return;

  const stream = localStreamRef.current;
  
  // Add video track
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack) {
    // Set the track's enabled state based on current video state
    videoTrack.enabled = isvideoON;
    pc.addTrack(videoTrack, stream);
    console.log(`Added video track to PC - enabled: ${videoTrack.enabled}`);
  }

  // Add audio track
  const audioTrack = stream.getAudioTracks()[0];
  if (audioTrack) {
    // Set the track's enabled state based on current audio state
    audioTrack.enabled = isaudioON;
    pc.addTrack(audioTrack, stream);
    console.log(`Added audio track to PC - enabled: ${audioTrack.enabled}`);
  }
};