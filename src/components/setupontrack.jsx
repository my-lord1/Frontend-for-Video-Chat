export const setupOnTrack = (peerConnection, peerId, remoteContainerRef, remoteStreamsRef, remoteScreenContainerRef, peername) => {
  //console.log(`🎯 Setting up ontrack for peer: ${peerId}`);
  
  if (!remoteStreamsRef.current[peerId]) {
    remoteStreamsRef.current[peerId] = {
      webcam: new MediaStream(),
      screen: new MediaStream(),
      trackCount: 0
    };
  } else {
    // Reset if peer reconnected
    remoteStreamsRef.current[peerId].webcam = new MediaStream();
    remoteStreamsRef.current[peerId].screen = new MediaStream();
    remoteStreamsRef.current[peerId].trackCount = 0;
  }

  peerConnection.ontrack = (event) => {
    // Check if we already processed this exact track
    const existingTracks = [
      ...remoteStreamsRef.current[peerId].webcam.getTracks(),
      ...remoteStreamsRef.current[peerId].screen.getTracks()
    ];
    
    const alreadyProcessed = existingTracks.some(track => track.id === event.track.id);
    if (alreadyProcessed) {
      return;
    }

    if (event.track.kind === "video") {
      const hasScreenKeyword = event.track.label.toLowerCase().includes('screen') || 
                              event.track.label.toLowerCase().includes('display') ||
                              event.track.label.toLowerCase().includes('window') ||
                              event.track.label.toLowerCase().includes('tab');
      
      // Check if we already have a webcam track 
      const hasWebcamTrack = remoteStreamsRef.current[peerId].webcam.getTracks().length > 0;
      
      const isScreenShare = hasScreenKeyword || (hasWebcamTrack && !hasScreenKeyword);

      event.track.addEventListener('ended', () => {
        handleTrackEnded(peerId, event.track, isScreenShare, remoteStreamsRef, remoteScreenContainerRef);
      });

      event.track.addEventListener('mute', () => {
        handleTrackEnded(peerId, event.track, isScreenShare, remoteStreamsRef, remoteScreenContainerRef);
      });
      
      if (isScreenShare) {
        remoteStreamsRef.current[peerId].screen.addTrack(event.track);
        let screenVideo = document.getElementById(`screen-${peerId}`);
        if (!screenVideo) {
        //console.log(`Creating NEW screen video element for ${peerId}`);
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
        //console.log(`🎯 creating NEW webcam video element for ${peerId}`);
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
        return;
      }

      event.track.addEventListener('ended', () => {
        const audioEl = document.querySelector(`audio[data-peer="${peerId}"][data-track="${event.track.id}"]`);
        if (audioEl) {
          audioEl.remove();
        }
      });

      event.track.addEventListener('mute', () => {
        const audioEl = document.querySelector(`audio[data-peer="${peerId}"][data-track="${event.track.id}"]`);
        if (audioEl) {
          audioEl.remove();
        }
      });
      
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.srcObject = new MediaStream([event.track]);
      audioEl.setAttribute('data-peer', peerId);
      audioEl.setAttribute('data-track', event.track.id);
      remoteContainerRef.current.appendChild(audioEl);
    }
  };
};

const handleTrackEnded = (peerId, track, isScreenShare, remoteStreamsRef, remoteScreenContainerRef) => {
if (!remoteStreamsRef.current[peerId]) return;

if (isScreenShare) {
  remoteStreamsRef.current[peerId].screen.removeTrack(track);
  if (remoteStreamsRef.current[peerId].screen.getTracks().length === 0) {
    const screenVideo = document.getElementById(`screen-${peerId}`);
    if (screenVideo) {
      screenVideo.remove();
    }
  }
} else {
  remoteStreamsRef.current[peerId].webcam.removeTrack(track);
  const webcamVideo = document.getElementById(`video-${peerId}`);
  if (webcamVideo) {
    if (remoteStreamsRef.current[peerId].webcam.getTracks().length > 0) {
      webcamVideo.srcObject = remoteStreamsRef.current[peerId].webcam;
    } else {
      webcamVideo.srcObject = null;
    }
  }
}
};
//10:00