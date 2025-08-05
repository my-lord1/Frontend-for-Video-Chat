import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FirstPage } from './pages/firstpage.jsx'
import { VideoChat } from './components/videochat.jsx'
function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element = {<FirstPage />} />
        <Route path='dashboard' element = {<VideoChat />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
