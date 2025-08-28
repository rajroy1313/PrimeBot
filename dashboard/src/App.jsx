import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/useAuth'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import BotConfig from './pages/BotConfig'
import Giveaways from './pages/Giveaways'
import Leveling from './pages/Leveling'
import Polls from './pages/Polls'
import Tickets from './pages/Tickets'
import Moderation from './pages/Moderation'
import LoginPage from './pages/LoginPage'
import queryClient from './lib/queryClient'

function AuthenticatedApp() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <div className="dashboard-container">
      <Sidebar user={user} />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/config" element={<BotConfig />} />
          <Route path="/dashboard/giveaways" element={<Giveaways />} />
          <Route path="/dashboard/leveling" element={<Leveling />} />
          <Route path="/dashboard/polls" element={<Polls />} />
          <Route path="/dashboard/tickets" element={<Tickets />} />
          <Route path="/dashboard/moderation" element={<Moderation />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router basename="/dashboard">
        <AuthenticatedApp />
      </Router>
    </QueryClientProvider>
  )
}

export default App