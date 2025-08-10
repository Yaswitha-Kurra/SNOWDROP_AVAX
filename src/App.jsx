import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import CreateLinkPage from './pages/CreateLinkPage'
import ClaimPage from './pages/ClaimPage'
import MyDrops from './pages/MyDrops'
import Analytics from './pages/Analytics'
import ClaimRedirect from './pages/ClaimRedirect'
import Jar from './pages/Jar'


function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Login />} />
        <Route path='/create-link' element={<CreateLinkPage />} />
        <Route path="/claim/:dropId" element={<ClaimPage />} />
        <Route path="/:shortCode" element={<ClaimRedirect />} />
        <Route path="/my-drops" element={<MyDrops />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/jar" element={<Jar />} />
      </Routes>
    </Router>
  )
}
export default App