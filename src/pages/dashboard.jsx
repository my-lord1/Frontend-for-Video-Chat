import VideoChat from '../components/videochat';
import { useParams } from 'react-router-dom';

export function DashBoard(){
    const { roomId } = useParams();
    return (
        <div className="dashboard">
            <h1>Dashboard</h1>
            <VideoChat roomId = { roomId } />
        </div>
    )
}