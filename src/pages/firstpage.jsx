import { useNavigate } from "react-router-dom"
import { useState } from "react";

export function FirstPage() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState("");
    const handlejoin = () => {
        if(roomId.trim()) {
        navigate(`/dashboard/${roomId}`);
    } }

    return (
        <div className = "flex items-center justify-center h-screen w-screen bg-black">
            <div className = " flex flex-row items-center justify-center border-1  bg-white p-5 rounded-xl gap-5">
                
                    <input placeholder="Enter Room ID" onChange={ (e) => setRoomId (e.target.value) } className="text-black border border-red-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"></input>

                    <button className="w-[100px]" onClick={handlejoin} >Join</button>

            </div>
        </div>
    )
}