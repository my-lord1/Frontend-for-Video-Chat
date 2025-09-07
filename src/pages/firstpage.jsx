import { useNavigate } from "react-router-dom"
import { useState, useEffect, useContext } from "react";
import { Mic, MicOff, Video, VideoOff, Camera, Clock } from 'lucide-react';
import { MediaContext } from "../components/mediaprovider";
import { z } from "zod";


const joinSchema = z.object({
  userName: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(10, "Name must be at most 10 characters")
    .regex(/^[a-zA-Z0-9 ]+$/, "Name can only contain letters, numbers and spaces"),
  roomId: z
    .string()
    .min(3, "Room ID must be at least 3 characters")
    .max(5, "Room ID must be at most 5 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Room ID can only contain letters, numbers, and dashes"),
});



function DateTimeDisplay() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-gray-600">
      <span>{dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      <span className="font-bold">·</span>
      <span>{dateTime.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric"
          
        })}</span>
    </div>
  );
}

export function FirstPage() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState("");
    const [userName, setuserName] = useState("");
    const [ errorMessage, setErrorMessage ] = useState("")
    
    const [microphones, setMicrophones] = useState([]);
    const {
        cameras,
        setCameras,
        videoRef,
        selectedCameraId,
        setSelectedCameraId,
        selectedMicId,
        setSelectedMicId,
        isvideoON,
        setisvideoON,
        isaudioON,
        setisaudioON
    } = useContext(MediaContext);
   
    useEffect(() => {
        if (errorMessage) {
          const timer = setTimeout(() => {
            setErrorMessage('');
          }, 5000);
          
          return () => clearTimeout(timer);
        }
      }, [errorMessage]);

    const handlejoin = () => {
        try {
          joinSchema.parse({ userName, roomId }); 
          navigate(`/dashboard/${userName}/${roomId}`);
        } catch (err) {
            setErrorMessage("Name, RoomID must be at least 3 characters with no spaces"); 
        }
      };

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
        
        
    },[ selectedCameraId, selectedMicId, setSelectedCameraId, setSelectedMicId, setCameras ]);

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
        console.log("setisvideoON", videoTrack.enabled)
    }
    const toggleaudio = () => {
        const audioTrack = videoRef.current.srcObject.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled
        setisaudioON(audioTrack.enabled)
        console.log("setisaudioON", audioTrack.enabled)
    }

    return (
<div className="flex items-center justify-center min-h-screen w-full bg-gray-50 p-6 overflow-x-hidden">
    <div className="flex flex-col lg:flex-row items-center justify-center gap-16 max-w-6xl w-full">
        {/* Video Preview Section */}
        <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
                {/* Preview Video Container */}
                <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="relative lg:w-180 h-120 sm:w-80 h-60">
                        <div className="absolute top-4 left-4 z-10">
                            <span className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 text-gray-700 text-sm font-medium shadow-sm">
                                Your Preview
                            </span>
                        </div>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]"/>
                    
                        {/* Overlay Controls */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                            <button onClick={toggleVideo} className={`p-3 rounded-full transition-all duration-200 shadow-sm ${
                                    isvideoON ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>
                                {isvideoON ? <Video className="w-4 h-4"/> : <VideoOff className="w-4 h-4"/>}
                            </button>
                            <button 
                                onClick={toggleaudio} className={`p-3 rounded-full transition-all duration-200 shadow-sm ${
                                    isaudioON ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>
                                {isaudioON ? <Mic className="w-4 h-4"/> : <MicOff className="w-4 h-4"/>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Device Selection */}
            <div className="flex flex-col sm:flex-row gap-3 ">
                <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:border-gray-300 transition-colors">
                    <Camera className="text-gray-600 w-4 h-4 flex-shrink-0"/>
                    <select value={selectedCameraId} onChange={e => setSelectedCameraId(e.target.value)} className="bg-transparent text-gray-700 text-sm flex-1 outline-none cursor-pointer">
                        {cameras.map(cam => (
                            <option key={cam.deviceId} value={cam.deviceId}>
                                {cam.label || "Camera"}
                            </option>
                        ))}
                    </select>
                </div>
                
                <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:border-gray-300 transition-colors">
                    <Mic className="text-gray-600 w-4 h-4 flex-shrink-0"/>
                    <select value={selectedMicId} onChange={e => setSelectedMicId(e.target.value)} className="bg-transparent text-gray-700 text-sm flex-1 outline-none cursor-pointer">
                        {microphones.map(mic => (
                            <option key={mic.deviceId} value={mic.deviceId}>
                                {mic.label || "Microphone"}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        {/* Join Form Section */}
        <div className="flex flex-col items-center justify-center">
        
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 lg:w-80 w-90">
                <div className="flex flex-col space-y-6">
                    
                    {/* Header */}
                    <div className="text-center space-y-1">
                        <h1 className="text-2xl font-semibold text-gray-900">Join Meeting</h1>
                        <p className="text-gray-500 text-sm">Enter your details to get started</p>
                    </div>

                    {/* Room Info */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Clock className="text-blue-600 w-4 h-4"/>
                        </div>
                        <div className="flex-1">
                        <DateTimeDisplay />
                        </div>
                    </div>

                    {/* Input Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                            <input type="text" placeholder="Enter your name" onChange={(e) => setuserName(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-lg py-3 px-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Room ID</label>
                            <input type="text" placeholder="Enter room ID" onChange={(e) => setRoomId(e.target.value)} 
                                className="w-full bg-white border border-gray-300 rounded-lg py-3 px-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"/>
                        </div>
                    </div>

                    {/* Join Button */}
                    <button onClick={handlejoin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        Join Meeting
                    </button>
                    {errorMessage && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {errorMessage}
                        </div>
                        )}
                </div>
            </div>
        </div>
    </div>
</div>
        
    )
}
//2