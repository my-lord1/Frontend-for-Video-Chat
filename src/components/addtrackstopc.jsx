// only for audio and video 
export const addAllTracksToConnection = (pc, localStreamRef, socketRef) => {
    console.log(`🔥 addAllTracksToConnection called by ${socketRef.current?.id}`);
    
    const existingSenders = pc.getSenders();
    const hasAudio = existingSenders.some(s => s.track && s.track.kind === 'audio');
    const hasVideo = existingSenders.some(s => s.track && s.track.kind === 'video');
    
    console.log(`🔥 Connection already has: Audio=${hasAudio}, Video=${hasVideo}`);
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        const shouldSkip = (track.kind === 'audio' && hasAudio) || 
                          (track.kind === 'video' && hasVideo);
        
        if (!shouldSkip) {
          console.log(`✅ Adding ${track.kind} track: ${track.id}`);
          pc.addTrack(track, localStreamRef.current);
        } else {
          console.log(`⚠️ Skipping ${track.kind} - already exists`);
        }
      });
    }
    
    console.log(`🔥 Final senders: ${pc.getSenders().length}`);
  };