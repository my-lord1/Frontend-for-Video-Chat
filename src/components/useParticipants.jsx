import { useEffect, useRef, useState } from "react";
export const useParticipant = (socket1, roomId, userName, participants, isvideoON, isaudioON ) => {
    const [users, setUsers] = useState({}); // to store the users
    const [roomJoined, setRoomJoined] = useState(false); // users in the room

    // Listen for users-box updates
      useEffect(() => {
        if (!socket1) return;

        const handler = ({ devices }) => {
          console.log("Received users data:", devices); // Debug log
          setUsers(devices || {});
        };
        socket1.on("users-box", handler);
        return () => socket1.off("users-box", handler);
      }, []);
    
      // Emit seeUsers when video/audio state changes or when room is joined
      useEffect(() => {
        if (roomJoined && roomId) {
          console.log("Emitting seeUsers with:", { roomId, isvideoON, isaudioON }); 
          socket1.emit("seeUsers", { roomId, userName, isvideoON, isaudioON });
        }
      }, [roomJoined, roomId, userName, isvideoON, isaudioON]);
    
      return {
        users,
        roomJoined,
        setUsers,
        setRoomJoined
      }
}