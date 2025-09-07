import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FirstPage } from './pages/firstpage.jsx'
import { DashBoard } from './pages/dashboard.jsx'
import { MediaProvider } from './components/mediaprovider.jsx'

function App() {

  return (
    <MediaProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element = {<FirstPage />} />
          <Route path="dashboard/:userName/:roomId" element = {<DashBoard />} />
        </Routes>
      </BrowserRouter>
    </MediaProvider>
  )
}

export default App
