import VideoChat from '../components/videochat';
import { useParams } from 'react-router-dom';

export function DashBoard(){
    const { roomId, userName } = useParams();
    return (
        <div className="dashboard">
            <VideoChat roomId = { roomId } userName = { userName }  />
        </div>
    )
}