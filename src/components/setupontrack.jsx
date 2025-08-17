export const setupOnTrack = (peerConnection, peerId, remoteContainerRef, remoteStreamsRef) => {
    console.log(`🎯 Setting up ontrack for peer: ${peerId}`);
    
    if (!remoteStreamsRef.current[peerId]) {
      remoteStreamsRef.current[peerId] = {
        webcam: new MediaStream(),
        screen: new MediaStream(),
        trackCount: 0
      };
      console.log(`🎯 Created new remote streams for ${peerId}`);
    }
  
    peerConnection.ontrack = (event) => {
      console.log(`🎯 TRACK RECEIVED from ${peerId}: ${event.track.kind} - ${event.track.id}`);
      
      
      // CHANGE 1: Check if we already processed this exact track
      const existingTracks = [
        ...remoteStreamsRef.current[peerId].webcam.getTracks(),
        ...remoteStreamsRef.current[peerId].screen.getTracks()
      ];
      
      const alreadyProcessed = existingTracks.some(track => track.id === event.track.id);
      if (alreadyProcessed) {
        console.log(`🎯 Track ${event.track.id} already processed, ignoring duplicate`);
        return; // Skip duplicate tracks
      }
  
      if (event.track.kind === "video") {
        // CHANGE 2: Improved screen share detection
        const hasScreenKeyword = event.track.label.toLowerCase().includes('screen') || 
                                event.track.label.toLowerCase().includes('display') ||
                                event.track.label.toLowerCase().includes('window') ||
                                event.track.label.toLowerCase().includes('tab');
        
        // Check if we already have a webcam track (smart fallback)
        const hasWebcamTrack = remoteStreamsRef.current[peerId].webcam.getTracks().length > 0;
        
        const isScreenShare = hasScreenKeyword || (hasWebcamTrack && !hasScreenKeyword);
        
        console.log(`🎯 Track label: "${event.track.label}"`);
        console.log(`🎯 Has screen keyword: ${hasScreenKeyword}`);
        console.log(`🎯 Already has webcam: ${hasWebcamTrack}`);
        console.log(`🎯 Classified as: ${isScreenShare ? 'SCREEN SHARE' : 'WEBCAM'}`);
        
        if (isScreenShare) {
          remoteStreamsRef.current[peerId].screen.addTrack(event.track);
          let screenVideo = document.getElementById(`screen-${peerId}`);
          if (!screenVideo) {
            console.log(`🎯 Creating NEW screen video element for ${peerId}`);
            screenVideo = document.createElement("video");
            screenVideo.id = `screen-${peerId}`;
            screenVideo.autoplay = true;
            screenVideo.playsInline = true;
            screenVideo.className = "w-[400px] h-[300px] bg-gray-800 border-2 border-yellow-400";
            remoteContainerRef.current.appendChild(screenVideo);
          }
          screenVideo.srcObject = remoteStreamsRef.current[peerId].screen;
        } else {
          remoteStreamsRef.current[peerId].webcam.addTrack(event.track);
          let webcamVideo = document.getElementById(`video-${peerId}`);
          if (!webcamVideo) {
            console.log(`🎯 Creating NEW webcam video element for ${peerId}`);
            webcamVideo = document.createElement("video");
            webcamVideo.id = `video-${peerId}`;
            webcamVideo.autoplay = true;
            webcamVideo.playsInline = true;
            webcamVideo.className = "w-[400px] h-[300px] bg-black";
            remoteContainerRef.current.appendChild(webcamVideo);
          }
          webcamVideo.srcObject = remoteStreamsRef.current[peerId].webcam;
        }
        remoteStreamsRef.current[peerId].trackCount++;
      }
  
      if (event.track.kind === "audio") {
        // CHANGE 3: Also prevent duplicate audio elements
        const existingAudioElements = document.querySelectorAll(`audio[data-peer="${peerId}"][data-track="${event.track.id}"]`);
        if (existingAudioElements.length > 0) {
          console.log(`🎯 Audio element for track ${event.track.id} already exists, ignoring`);
          return;
        }
        
        console.log(`🎯 Creating audio element for ${peerId}`);
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioEl.srcObject = new MediaStream([event.track]);
        // Add identifiers to prevent duplicates
        audioEl.setAttribute('data-peer', peerId);
        audioEl.setAttribute('data-track', event.track.id);
        remoteContainerRef.current.appendChild(audioEl);
      }
    };
  };