import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Settings, 
  Gift, 
  TrendingUp, 
  Vote, 
  MessageSquare, 
  Shield 
} from 'lucide-react'

const Sidebar = () => {
  const location = useLocation()

  const menuItems = [
    { path: '/', icon: Home, label: 'Dashboard', description: 'Bot overview and stats' },
    { path: '/config', icon: Settings, label: 'Bot Config', description: 'General settings' },
    { path: '/giveaways', icon: Gift, label: 'Giveaways', description: 'Manage giveaways' },
    { path: '/leveling', icon: TrendingUp, label: 'Leveling', description: 'XP and badges' },
    { path: '/polls', icon: Vote, label: 'Polls', description: 'Polling system' },
    { path: '/tickets', icon: MessageSquare, label: 'Tickets', description: 'Support tickets' },
    { path: '/moderation', icon: Shield, label: 'Moderation', description: 'Server moderation' }
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ marginBottom: '30px' }}>
        <h2 style={{ color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: 'bold' }}>
          Bot Dashboard
        </h2>
        <p style={{ color: 'var(--gray-color)', fontSize: '0.9rem' }}>
          Control and configure your Discord bot
        </p>
      </div>

      <nav>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <div>
                <div style={{ fontWeight: '500' }}>{item.label}</div>
                <div style={{ fontSize: '0.8rem', opacity: '0.7' }}>{item.description}</div>
              </div>
            </Link>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--gray-color)' }}>
          Discord Bot v2.5.0
        </div>
      </div>
    </aside>
  )
}

export default Sidebar