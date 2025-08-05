// add remote track to peer connection

// new user to emist peers- create offer, set local descrpiton, create a icecandidate, accept a answer, set remote decription
// exist peers to new user- accept a offer, set remote description, create answer, set local description, create a icecandidate 

socket.on("signal", async ({ from, type, payload }) => {
    if (!peerConnectionsRef.current[from]) {
        const peerConnection = new RTCPeerConnection({ iceServers });
        peerConnectionsRef.current[from] = peerConnection;
        setupOnTrack(peerConnection);

        localStreamRef.current.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStreamRef.current);
        })

        peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("signal", {
                to: from,
                type: "ice-candidate",
                payload: event.candidate
                });
            }   
        }
    }
    const peerConnection = peerConnectionsRef.current[from];
    if (type === "offer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await peerConnection.createAnswer();
        try {
          await peerConnection.setLocalDescription(answer);
          console.log("✅ setLocalDescription for answer was successful", answer);
        } catch (err) {
          console.error("❌ Failed to set local description for answer:", err);
        }

        socket.emit("signal", {
            to: from,
            type: "answer",
            payload: answer
        })
    }

    

    if (type === "ice-candidate") {
        try{await peerConnection.addIceCandidate(payload)}
        catch(error) {
            console.error("Error adding received ice candidate", error); // this should be in existing peers too
        }
    }
    if (type === "answer") {
        if(offererRef.current[from]){
            if(peerConnection.signalingState === "have-local-offer") {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
                console.log("✅ setRemoteDescription for answer was successful", payload);}
                else {
                    console.warn("Tried to set remote answer, but signalingState is:", pc.signalingState);
                  }
    } {
        console.warn("Received answer from a peer that is not an offerer.");
        }
    }
    

});