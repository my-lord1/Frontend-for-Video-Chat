import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react";
import { useRef } from "react";

export function FirstPage() {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const [roomId, setRoomId] = useState("");
    const [cameras, setCameras] = useState([]);
    const [microphones, setMicrophones] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState("")
    const [selectedMicId, setSelectedMicId] = useState("")

    const handlejoin = () => {
        if(roomId.trim()) {
        navigate(`/dashboard/${roomId}`);
    } }

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true})
        .then(stream => {
            stream.getTracks().forEach(track=> track.stop());
            return navigator.mediaDevices.enumerateDevices();
        })
        .then(devices =>{
            const cams = (devices.filter(d => d.kind === "videoinput"));
            const mics = (devices.filter(d => d.kind === "audioinput"));
            setCameras(cams)
            setMicrophones(mics)
            if (cams.length === 1) setSelectedCameraId(cams[0].deviceId)
            if (cams.length === 1) setSelectedMicId( mics[0].deviceId)
        })
        .catch(err => {
            console.error(" Error accessign media devies:", err);
        })
        
        
    },[]);

    useEffect(() => {
        if(!selectedCameraId && !selectedMicId) return
        let stream;
        const previewStream = async () => {
            if (videoRef.current && videoRef.current.srcobject)
                videoRef.current.srcObject.getTracks().forEach(track => track.stop())
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: {deviceId: selectedCameraId ? {exact: selectedCameraId} : undefined},
                audio: {deviceId: selectedMicId ? {exact: selectedMicId} : undefined } 
            })
            if(videoRef.current) 
                videoRef.current.srcObject = stream
        }
            previewStream();
        return () => {
            if (stream) 
                stream.getTracks().forEach(track => track.stop())
        }
    }, [selectedCameraId, selectedMicId])


    return (
        <div className = "flex items-center justify-center h-screen w-screen bg-white gap-70">
            <div className = "flex flex-col items-center justify-center" >
                <div className = "flex flex-col items-center justify-center">
                    <h1 className="text-black ">Your Preview</h1>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-200 mt-1 bg-black rounded-xl shadow-lg border-3 border-yellow object-cover"/>
                </div>
                <div className = "flex flex-row gap-20">
                    <div>
                        <h3 className="text-black ">Cameras</h3>
                        <select value = { selectedCameraId } onChange = { e => setSelectedCameraId(e.target.value)} className="text-black">
                            {cameras.map(cam => (
                                <option key= { cam.deviceId} value = { cam.deviceId}>
                                    {cam.label || "Camera" }
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <h3 className="text-black ">MicroPhones</h3>
                        <select value = { selectedMicId } onChange = { e => setSelectedMicId(e.target.value)} className="text-black">
                            {microphones.map(mic => (
                                <option key = {mic.deviceId} value = { mic.deviceId}>
                                    {mic.label || "Microphone bitch"}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div>
                <div className="flex flex-col items-center justify-center gap-3 ">
                    
                        <h1 className="text-black" >Ready to join?</h1>
                        <h3 className="text-black" > Number of people in Room: </h3>

                    <div className = " flex flex-row items-center justify-center border-1  bg-black p-5 rounded-xl gap-5 mt-10 ">
                        <input placeholder="Enter Room ID" onChange={ (e) => setRoomId (e.target.value) } className="text-white border border-red-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"></input>
                        <button className="w-100px bg-red" onClick={handlejoin} >Join</button>
                    </div>
                </div>

            </div>
        </div>
    )
}