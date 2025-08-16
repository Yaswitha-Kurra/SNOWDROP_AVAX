// App.jsx
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
    <>
      {/* Always-on blocker */}
      <div className="mobile-blocker" role="dialog" aria-live="polite" aria-label="Coming soon notice">
        <div className="mobile-box">
          <h1 className="mobile-title">❄️ SnowDrop is coming soon</h1>
          <p className="mobile-sub">We’re putting the final polish. Check back shortly.</p>
        </div>
      </div>

      {/* Your normal app (kept but hidden) */}
      <Router>
        <div className="app-content">
          <Routes>
            <Route path='/' element={<Login />} />
            <Route path='/create-link' element={<CreateLinkPage />} />
            <Route path="/claim/:dropId" element={<ClaimPage />} />
            <Route path="/:shortCode" element={<ClaimRedirect />} />
            <Route path="/my-drops" element={<MyDrops />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/jar" element={<Jar />} />
          </Routes>
        </div>
      </Router>

      {/* Scoped styles (apply to all screen sizes) */}
      <style>{`
        :root { --sd-primary: #1976d2; }

        html, body, #root { height: 100%; }
        body { margin: 0; overflow: hidden; font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif; }

        /* Show blocker for everyone */
        .mobile-blocker {
          display: flex;
          position: fixed;
          inset: 0;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(180deg, #f7fbff 0%, #e9f3ff 100%);
          z-index: 2147483647;
          text-align: center;
        }

        .mobile-box {
          max-width: 520px;
          width: 100%;
          padding: 28px 24px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(6px);
          border: 2px solid var(--sd-primary);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        }

        .mobile-title {
          margin: 0 0 10px;
          font-size: 24px;
          font-weight: 800;
          color: var(--sd-primary);
          letter-spacing: 0.2px;
        }

        .mobile-sub {
          margin: 0;
          font-size: 14px;
          color: #3b6b8f;
        }

        /* Hide the rest of the app */
        .app-content { display: none !important; }
      `}</style>
    </>
  )
}

export default App
