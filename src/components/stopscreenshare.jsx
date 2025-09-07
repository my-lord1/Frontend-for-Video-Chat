import { useEffect } from "react";
export const useToggle = ( localStreamRef, peerConnectionsRef, socket1, roomId, userName, isvideoON, setisvideoON, isaudioON, setisaudioON, renegotiate ) => {
    
    const toggleVideo = async () => {
    if (!localStreamRef.current) return;
    
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      const newEnabled = !videoTrack.enabled;
      videoTrack.enabled = newEnabled;
      setisvideoON(newEnabled);
      
      Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video' && !s.track.label.toLowerCase().includes('screen')
        );
        
        if (sender) {
          sender.replaceTrack(videoTrack).catch(err => {
            console.error(`Error replacing video track for ${peerId}:`, err);
          });
        } else {
          try {
            pc.addTrack(videoTrack, localStreamRef.current);
            renegotiate(peerId, pc);
          } catch (err) {
            console.error(`Error adding video track for ${peerId}:`, err);
          }
        }
      });
      
      if (roomId) {
        socket1.emit("seeUsers", { roomId, userName, isvideoON: newEnabled, isaudioON });
      }
    }
  };
  
  const toggleAudio = async () => {
    if (!localStreamRef.current) return;
    
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const newEnabled = !audioTrack.enabled;
      audioTrack.enabled = newEnabled;
      setisaudioON(newEnabled);
      
      Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'audio'
        );
        
        if (sender) {
          sender.replaceTrack(audioTrack).catch(err => {
            console.error(`Error replacing audio track for ${peerId}:`, err);
          });
        } else {
          try {
            pc.addTrack(audioTrack, localStreamRef.current);
            renegotiate(peerId, pc);
          } catch (err) {
            console.error(`Error adding audio track for ${peerId}:`, err);
          }
        }
      });
      
      if (roomId) {
        socket1.emit("seeUsers", { roomId, userName, isvideoON, isaudioON: newEnabled });
      }
    }
  };

  useEffect(() => {
    if (!localStreamRef.current) return;
    
    const stream = localStreamRef.current;
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];
    
    // Ensure local tracks match the state
    if (videoTrack) {
      videoTrack.enabled = isvideoON;
    }
    if (audioTrack) {
      audioTrack.enabled = isaudioON;
    }
    

    Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
      const videoSender = pc.getSenders().find(s => 
        s.track && s.track.kind === 'video' && !s.track.label.toLowerCase().includes('screen')
      );
      const audioSender = pc.getSenders().find(s => 
        s.track && s.track.kind === 'audio'
      );
      

      if (videoSender && videoTrack) {
        videoSender.replaceTrack(videoTrack).catch(err => {
          console.error(`Error replacing video track for ${peerId}:`, err);
        });
      } else if (videoTrack && !videoSender) {

        try {
          pc.addTrack(videoTrack, stream);
          renegotiate(peerId, pc);
        } catch (err) {
          console.error(`Error adding video track for ${peerId}:`, err);
        }
      }
      
      if (audioSender && audioTrack) {
        audioSender.replaceTrack(audioTrack).catch(err => {
          console.error(`Error replacing audio track for ${peerId}:`, err);
        });
      } else if (audioTrack && !audioSender) {
        try {
          pc.addTrack(audioTrack, stream);
          renegotiate(peerId, pc);
        } catch (err) {
          console.error(`Error adding audio track for ${peerId}:`, err);
        }
      }
    });
    
  }, [isvideoON, isaudioON]);
  return {
    toggleAudio,
    toggleVideo
  }
}