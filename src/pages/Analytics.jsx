import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import Navbar from './Navbar'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, LineChart, Line
} from 'recharts'
import './Analytics.css'

export default function Analytics() {
  const [tokenTotals, setTokenTotals] = useState([])
  const [tipVolume, setTipVolume] = useState([])
  const [dailyTipBars, setDailyTipBars] = useState([]) // just tips count by day
  const [topRecipients, setTopRecipients] = useState([])
  const [stats, setStats] = useState({ total: 0, avax: 0, usdc: 0, avg: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)

      // --- Tips
      const { data: tipsData, error: tipErr } = await supabase
        .from('tips')
        .select('amount, token, author_handle, created_at')

      if (tipErr) {
        console.error('❌ Error fetching tips:', tipErr.message)
        setLoading(false)
        return
      }

      // Totals by token
      let avax = 0, usdc = 0, total = 0
      tipsData.forEach(t => {
        const amt = parseFloat(t.amount || 0)
        const token = (t.token || '').toUpperCase()
        total += amt
        if (token === 'AVAX') avax += amt
        if (token === 'USDC') usdc += amt
      })
      const avg = tipsData.length ? (total / tipsData.length).toFixed(3) : '0.000'
      setStats({ total: total.toFixed(3), avax: avax.toFixed(3), usdc: usdc.toFixed(3), avg })
      setTokenTotals([
        { name: 'AVAX', value: parseFloat(avax.toFixed(3)) },
        { name: 'USDC', value: parseFloat(usdc.toFixed(3)) }
      ])

      // Tip volume over time (amount by token)
      const dayMapTips = new Map()
      tipsData.forEach(t => {
        const day = new Date(t.created_at).toISOString().split('T')[0]
        const token = (t.token || '').toUpperCase()
        const amt = parseFloat(t.amount || 0)
        if (!dayMapTips.has(day)) dayMapTips.set(day, { date: day, AVAX: 0, USDC: 0 })
        if (token === 'AVAX') dayMapTips.get(day).AVAX += amt
        if (token === 'USDC') dayMapTips.get(day).USDC += amt
      })
      setTipVolume(Array.from(dayMapTips.values()).sort((a, b) => new Date(a.date) - new Date(b.date)))

      // Leaderboard
      const userMap = {}
      tipsData.forEach(t => {
        const user = t.author_handle || 'unknown'
        const amt = parseFloat(t.amount || 0)
        userMap[user] = (userMap[user] || 0) + amt
      })
      setTopRecipients(
        Object.entries(userMap)
          .map(([handle, totalAmt]) => ({ handle, total: parseFloat(totalAmt.toFixed(3)) }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10)
      )

      // Daily tips count
      const daily = new Map()
      tipsData.forEach(t => {
        const day = new Date(t.created_at).toISOString().split('T')[0]
        if (!daily.has(day)) daily.set(day, { date: day, tips_count: 0 })
        daily.get(day).tips_count += 1
      })
      setDailyTipBars(Array.from(daily.values()).sort((a, b) => new Date(a.date) - new Date(b.date)))

      setLoading(false)
    }

    fetchAll()
  }, [])

  return (
    <div className="analytics-wrapper">
      <Navbar />
      <h2 className="analytics-title">📊 Tipper Analytics</h2>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">🔺<span>Total AVAX</span><strong>{stats.avax}</strong></div>
        <div className="stat-card">💵<span>Total USDC</span><strong>{stats.usdc}</strong></div>
      </div>

      {!loading && (
        <div className="chart-grid">
          {/* Daily Tips Count */}
          <div className="chart-section">
            <h3>Daily Tips Count</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyTipBars}>
                <CartesianGrid stroke="rgba(13,127,199,0.25)" strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tips_count" fill="#007bff" /> {/* cyan */}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* AVAX vs USDC */}
          <div className="chart-section">
            <h3>AVAX vs USDC</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tokenTotals}>
                <CartesianGrid stroke="rgba(13,127,199,0.25)" strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#007bff" barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tip Volume */}
          <div className="chart-section">
            <h3>Tip Volume Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={tipVolume}>
                <CartesianGrid stroke="rgba(13,127,199,0.25)" strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="AVAX" stroke="#dd230eff" strokeWidth={2} />
                <Line type="monotone" dataKey="USDC" stroke="#001216ff" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Leaderboard */}
          <div className="chart-section">
            <h3>Leaderboard</h3>
            <table className="leader-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Handle</th>
                  <th>Total Tipped</th>
                </tr>
              </thead>
              <tbody>
                {topRecipients.map((u, i) => (
                  <tr key={i}>
                    <td>#{i + 1}</td>
                    <td>@{u.handle}</td>
                    <td>{u.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
