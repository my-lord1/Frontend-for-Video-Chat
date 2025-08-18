export const addAllTracksToConnection = (pc, localStreamRef, options) => {
  const { selectedCameraId, selectedMicId, isvideoON, isaudioON } = options;

  if (!localStreamRef.current) return;

  const existingSenders = pc.getSenders();
  const hasAudio = existingSenders.some(s => s.track && s.track.kind === 'audio');
  const hasVideo = existingSenders.some(s => s.track && s.track.kind === 'video');

  localStreamRef.current.getTracks().forEach(track => {
    // skip if already exists
    const shouldSkip = (track.kind === 'audio' && hasAudio) ||
                       (track.kind === 'video' && hasVideo);
    if (shouldSkip) return;

    // respect toggle
    if (track.kind === "video" && !isvideoON) return;
    if (track.kind === "audio" && !isaudioON) return;

    // only add selected camera/mic
    if (track.kind === "video" && selectedCameraId) {
      if (track.getSettings().deviceId !== selectedCameraId) return;
    }
    if (track.kind === "audio" && selectedMicId) {
      if (track.getSettings().deviceId !== selectedMicId) return;
    }

    pc.addTrack(track, localStreamRef.current);
    console.log(`✅ Added ${track.kind} track: ${track.id}`);
  });
};