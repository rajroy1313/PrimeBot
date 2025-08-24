import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import BotConfig from './pages/BotConfig'
import Giveaways from './pages/Giveaways'
import Leveling from './pages/Leveling'
import Polls from './pages/Polls'
import Tickets from './pages/Tickets'
import Moderation from './pages/Moderation'

function App() {
  return (
    <Router>
      <div className="dashboard-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/config" element={<BotConfig />} />
            <Route path="/giveaways" element={<Giveaways />} />
            <Route path="/leveling" element={<Leveling />} />
            <Route path="/polls" element={<Polls />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/moderation" element={<Moderation />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App