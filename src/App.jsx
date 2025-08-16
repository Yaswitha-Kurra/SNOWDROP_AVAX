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
      {/* Mobile-only blocker */}
      <div className="mobile-blocker" role="dialog" aria-live="polite" aria-label="Mobile notice">
        <div className="mobile-box">
          <h1 className="mobile-title">📱 Mobile version coming soon</h1>
          <p className="mobile-sub">Please use a desktop (≥768px) for now.</p>
        </div>
      </div>

      {/* Normal app content (hidden on small screens) */}
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

      {/* Scoped CSS so you don't have to touch other files */}
      <style>{`
        :root { --sd-primary: #1976d2; }

        /* Default (desktop/laptop): show app, hide blocker */
        .mobile-blocker { display: none; }

        /* Small screens: show only the blocker, hide the app */
        @media (max-width: 768px) {
          html, body, #root { height: 100%; }
          body { overflow: hidden; }

          .mobile-blocker {
            display: flex;
            position: fixed;
            inset: 0;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: #f7fbff;
            z-index: 2147483647; /* on top of everything */
            text-align: center;
          }

          .mobile-box {
            max-width: 480px;
            width: 100%;
            padding: 24px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(6px);
            border: 2px solid var(--sd-primary);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          }

          .mobile-title {
            margin: 0 0 8px;
            font-size: 20px;
            font-weight: 700;
            color: var(--sd-primary);
          }

          .mobile-sub {
            margin: 0;
            font-size: 14px;
            color: #3b6b8f;
          }

          .app-content {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}

export default App
