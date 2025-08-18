import { createContext, useState, useRef } from "react";

export const MediaContext = createContext();

export const MediaProvider = ({ children }) => {
    const videoRef = useRef(null);

    const [selectedCameraId, setSelectedCameraId] = useState("")
    const [selectedMicId, setSelectedMicId] = useState("")
    const [isvideoON, setisvideoON] = useState(true)
    const [isaudioON, setisaudioON] = useState(true)

    return (
        <MediaContext.Provider value = {{
            videoRef,
            selectedCameraId,
            setSelectedCameraId,
            selectedMicId,
            setSelectedMicId,
            isvideoON,
            setisvideoON,
            isaudioON,
            setisaudioON
        }}>
            {children}
        </MediaContext.Provider>
    )

}
