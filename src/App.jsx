import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FirstPage } from './pages/firstpage.jsx'
import { DashBoard } from './pages/dashboard.jsx'
function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element = {<FirstPage />} />
        <Route path="dashboard/:roomId" element = {<DashBoard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
