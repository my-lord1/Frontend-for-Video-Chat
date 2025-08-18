import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react";
import { useRef } from "react";
import { Mic, MicOff, Video, VideoOff, Camera, Users } from 'lucide-react';


export function FirstPage() {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const [roomId, setRoomId] = useState("");
    const [cameras, setCameras] = useState([]);
    const [microphones, setMicrophones] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState("")
    const [selectedMicId, setSelectedMicId] = useState("")
    const [isvideoON, setisvideoON] = useState(true)
    const [isaudioON, setisaudioON] = useState(true)

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
            if (mics.length === 1) setSelectedMicId( mics[0].deviceId)
        })
        .catch(err => {
            console.error(" Error accessign media devies:", err);
        })
        
        
    },[]);

    useEffect(() => {
        if(!selectedCameraId && !selectedMicId) return
        let stream;
        const previewStream = async () => {
            if (videoRef.current && videoRef.current.srcObject)
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
    const toggleVideo = () => {
        
        const videoTrack = videoRef.current.srcObject.getVideoTracks()[0];
        videoTrack.enabled = !videoTrack.enabled
        setisvideoON(videoTrack.enabled)
    }
    const toggleaudio = () => {
        const audioTrack = videoRef.current.srcObject.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled
        setisaudioON(audioTrack.enabled)
    }

    return (
        <div className = "flex items-center justify-center h-screen w-screen bg-white gap-50">
            <div className = "flex flex-col items-center justify-center" >
                <div className = "flex flex-col items-center justify-center relative w-250 h-140">
                    <div className="text-white text-4xl absolute z-10 left-10 top-4">Your Preview </div>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover rounded-3xl shadow-lg transform scale-x-[-1]"/>
                    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-4 p-2 rounded-xl">
                        <button onClick={ toggleVideo } className="p-2 rounded-full">
                        {isvideoON ? <Video className="w-6 h-6 "/> : <VideoOff className="w-6 h-6"/>}
                        </button>
                        <button onClick={ toggleaudio } className="p-2 rounded-full ">
                        {isaudioON ? <Mic className="w-6 h-6"/> : <MicOff className="w-6 h-6"/>}
                        </button>
                    </div>    
                </div>
                <div className = "flex flex-row gap-20 mt-3">
                    <div className="flex flex-row items-center justify-center gap-3" >
                        <Camera className="text-black"/>
                        <select value = { selectedCameraId } onChange = { e => setSelectedCameraId(e.target.value)} className="text-black p-1">
                            {cameras.map(cam => (
                                <option key= { cam.deviceId} value = { cam.deviceId}>
                                    {cam.label || "Camera" }
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-row items-center justify-center gap-3" >
                        <Mic className="text-black"/>
                        <select value = { selectedMicId } onChange = { e => setSelectedMicId(e.target.value)} className="text-black p-1">
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
                        <div className="flex flex-row items-center justify-center gap-3">
                            <Users className="text-black mt-10" />
                            <div className="text-black tex-3xl mt-10" > Number of people in Room: $number</div>
                        </div>
                    <div className = " flex flex-row items-center justify-center border-1  bg-blue-600 p-5 rounded-xl gap-5 mt-5 ">
                        <input placeholder="Enter Room ID" onChange={ (e) => setRoomId (e.target.value) } className="text-white text-lg border-1 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-white-500"></input>
                        <button className="w-100px" onClick={handlejoin} >Join</button>
                    </div>
                </div>

            
            </div>
        </div>
        
    )
}
