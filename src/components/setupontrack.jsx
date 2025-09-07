import { useEffect, useState, useRef } from "react";


// setupOnTrack.jsx - Updated with better remote stream handling
export const setupOnTrack = (peerConnection, peerId, remoteContainerRef, remoteStreamsRef, remoteScreenContainerRef, peername) => {
  console.log(`🎯 Setting up ontrack for peer: ${peerId}`);
  
  if (!remoteStreamsRef.current[peerId]) {
    remoteStreamsRef.current[peerId] = {
      webcam: new MediaStream(),
      screen: new MediaStream(),
      trackCount: 0
    };
    console.log(`🎯 Created new remote streams for ${peerId}`);
  } else {
    // Reset if peer reconnected
    console.log(`🎯 Resetting existing remote streams for ${peerId}`);
    remoteStreamsRef.current[peerId].webcam = new MediaStream();
    remoteStreamsRef.current[peerId].screen = new MediaStream();
    remoteStreamsRef.current[peerId].trackCount = 0;
  }

  peerConnection.ontrack = (event) => {
    console.log(`🎯 TRACK RECEIVED from ${peerId}: ${event.track.kind} - ${event.track.id}`);
    console.log(`🎯 Track label: "${event.track.label}"`);
    console.log(`🎯 Track readyState: ${event.track.readyState}`);
    
    // Check if we already processed this exact track
    const existingTracks = [
      ...remoteStreamsRef.current[peerId].webcam.getTracks(),
      ...remoteStreamsRef.current[peerId].screen.getTracks()
    ];
    
    const alreadyProcessed = existingTracks.some(track => track.id === event.track.id);
    if (alreadyProcessed) {
      console.log(`🎯 Track ${event.track.id} already processed, ignoring duplicate`);
      return;
    }

    if (event.track.kind === "video") {
      // Improved screen share detection
      const hasScreenKeyword = event.track.label.toLowerCase().includes('screen') || 
                              event.track.label.toLowerCase().includes('display') ||
                              event.track.label.toLowerCase().includes('window') ||
                              event.track.label.toLowerCase().includes('tab');
      
      // Check if we already have a webcam track (smart fallback)
      const hasWebcamTrack = remoteStreamsRef.current[peerId].webcam.getTracks().length > 0;
      
      const isScreenShare = hasScreenKeyword || (hasWebcamTrack && !hasScreenKeyword);
      
      console.log(`🎯 Has screen keyword: ${hasScreenKeyword}`);
      console.log(`🎯 Already has webcam: ${hasWebcamTrack}`);
      console.log(`🎯 Classified as: ${isScreenShare ? 'SCREEN SHARE' : 'WEBCAM'}`);
      
      // Handle track end - this covers when remote user stops screen share
      event.track.addEventListener('ended', () => {
        console.log(`🎯 Track ended: ${event.track.kind} - ${event.track.id} from ${peerId}`);
        handleTrackEnded(peerId, event.track, isScreenShare, remoteStreamsRef, remoteScreenContainerRef);
      });

      // Handle track mute - this covers when removeTrack is called
      event.track.addEventListener('mute', () => {
        console.log(`🎯 Track muted: ${event.track.kind} - ${event.track.id} from ${peerId}`);
        handleTrackEnded(peerId, event.track, isScreenShare, remoteStreamsRef, remoteScreenContainerRef);
      });
      
      if (isScreenShare) {
        remoteStreamsRef.current[peerId].screen.addTrack(event.track);
        let screenVideo = document.getElementById(`screen-${peerId}`);
        if (!screenVideo) {
          console.log(`🎯 Creating NEW screen video element for ${peerId}`);
          screenVideo = document.createElement("video");
          screenVideo.className="w-full h-full lg:object-fill object-contain border-2 border-blue-400";
          screenVideo.id = `screen-${peerId}`;
          screenVideo.autoplay = true;
          screenVideo.playsInline = true;
          if (remoteScreenContainerRef?.current) {
            remoteScreenContainerRef.current.innerHTML = ""; // only one screen share visible
            remoteScreenContainerRef.current.appendChild(screenVideo);
          }
        }
        screenVideo.srcObject = remoteStreamsRef.current[peerId].screen;

      } else {
        remoteStreamsRef.current[peerId].webcam.addTrack(event.track);
        let webcamVideo = document.getElementById(`video-${peerId}`);
        if (!webcamVideo) {
          console.log(`🎯 Creating NEW webcam video element for ${peerId}`);
          const card = document.createElement("div");
          card.id = `card-${peerId}`;
          card.className = "relative bg-white shadow-lg rounded-lg overflow-y-hidden";
          webcamVideo = document.createElement("video");
          webcamVideo.id = `video-${peerId}`;
          webcamVideo.autoplay = true;
          webcamVideo.playsInline = true;
          webcamVideo.className = "w-full h-full object-cover";
          card.appendChild(webcamVideo);
          const label = document.createElement("div");
          label.innerHTML = `${peername}`;
          label.className = " absolute bottom-0 left-0 right-0 text-white text-md text-center py-1";
          card.appendChild(label);
          remoteContainerRef.current.appendChild(card);
        }
        webcamVideo.srcObject = remoteStreamsRef.current[peerId].webcam;
      }
      remoteStreamsRef.current[peerId].trackCount++;
    }

    if (event.track.kind === "audio") {
      // Prevent duplicate audio elements
      const existingAudioElements = document.querySelectorAll(`audio[data-peer="${peerId}"][data-track="${event.track.id}"]`);
      if (existingAudioElements.length > 0) {
        console.log(`🎯 Audio element for track ${event.track.id} already exists, ignoring`);
        return;
      }
      
      // Handle audio track ended
      event.track.addEventListener('ended', () => {
        console.log(`🎯 Audio track ended: ${event.track.id} from ${peerId}`);
        const audioEl = document.querySelector(`audio[data-peer="${peerId}"][data-track="${event.track.id}"]`);
        if (audioEl) {
          audioEl.remove();
        }
      });

      event.track.addEventListener('mute', () => {
        console.log(`🎯 Audio track muted: ${event.track.id} from ${peerId}`);
        const audioEl = document.querySelector(`audio[data-peer="${peerId}"][data-track="${event.track.id}"]`);
        if (audioEl) {
          audioEl.remove();
        }
      });
      
      console.log(`🎯 Creating audio element for ${peerId}`);
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.srcObject = new MediaStream([event.track]);
      audioEl.setAttribute('data-peer', peerId);
      audioEl.setAttribute('data-track', event.track.id);
      remoteContainerRef.current.appendChild(audioEl);
    }
  };
};

// Helper function to handle track cleanup
const handleTrackEnded = (peerId, track, isScreenShare, remoteStreamsRef, remoteScreenContainerRef) => {
if (!remoteStreamsRef.current[peerId]) return;

if (isScreenShare) {
  // Remove from screen stream
  remoteStreamsRef.current[peerId].screen.removeTrack(track);
  
  // Remove screen video element if no more screen tracks
  if (remoteStreamsRef.current[peerId].screen.getTracks().length === 0) {
    const screenVideo = document.getElementById(`screen-${peerId}`);
    if (screenVideo) {
      console.log(`🎯 Removing screen video element for ${peerId}`);
      screenVideo.remove();
    }
  }
} else {
  // Remove from webcam stream
  remoteStreamsRef.current[peerId].webcam.removeTrack(track);
  
  // Update webcam video srcObject if there are still webcam tracks
  const webcamVideo = document.getElementById(`video-${peerId}`);
  if (webcamVideo) {
    if (remoteStreamsRef.current[peerId].webcam.getTracks().length > 0) {
      webcamVideo.srcObject = remoteStreamsRef.current[peerId].webcam;
    } else {
      // No more video tracks, show placeholder or hide
      webcamVideo.srcObject = null;
    }
  }
}
};
//10:00