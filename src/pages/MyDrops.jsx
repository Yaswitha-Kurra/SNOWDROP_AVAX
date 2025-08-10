import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import Navbar from './Navbar'
import './MyDrops.css'

export default function MyDrops() {
  const [wallet, setWallet] = useState(null)
  const [drops, setDrops] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getWallet = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setWallet(accounts[0])
        }
      }
    }
    getWallet()
  }, [])

  useEffect(() => {
    const fetchDrops = async () => {
      if (!wallet) return

      const { data: myDrops, error } = await supabase
        .from('drops')
        .select('twitter_handle, wallet_address, amount, amount_avax, amount_usdc, token, claim_url, created_at, drop_id, number_of_people')
        .eq('wallet_address', wallet.trim().toLowerCase())
        .order('created_at', { ascending: false })

      if (error) {
        console.error("❌ Supabase fetch error:", error.message)
      } else {
        console.log("✅ My wallet drops:", myDrops)
        setDrops(myDrops || [])
      }

      setLoading(false)
    }

    fetchDrops()
  }, [wallet])

  const copyToClipboard = (link) => {
    navigator.clipboard.writeText(link)
    const toast = document.createElement('div')
    toast.className = 'toast'
    toast.innerText = '📋 Link copied!'
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 2500)
  }

  return (
    <div className="mydrops-wrapper">
      <Navbar />
      <div className="mydrops-container">
        <h2 className="mydrops-title">📦 My Drops</h2>

        {!wallet && (
          <div className="mydrops-error">🦊 Please connect your wallet to view your drops.</div>
        )}

        {wallet && loading && (
          <div className="mydrops-status">Loading drops...</div>
        )}

        {wallet && !loading && drops.length === 0 && (
          <div className="mydrops-status">You haven't created any drops yet.</div>
        )}

        {wallet && !loading && drops.length > 0 && (
          <div className="drops-list">
            {drops.map((drop, i) => (
              <div className="drop-card" key={i}>
                <div><strong>🆔 ID:</strong> {drop.drop_id?.slice(0, 12)}...</div>
                <div><strong>💰 Token:</strong> {drop.token}</div>

                {drop.token === 'DUAL' ? (
                  <>
                    <div><strong>🥔 AVAX:</strong> {drop.amount_avax}</div>
                    <div><strong>💵 USDC:</strong> {drop.amount_usdc}</div>
                  </>
                ) : (
                  <div><strong>🎯 Amount:</strong> {drop.amount}</div>
                )}

                <div><strong>👥 Claimers:</strong> {drop.number_of_people}</div>
                <div>
                  <strong>🔗 Link:</strong>{' '}
                  <a href={drop.claim_url} target="_blank" rel="noreferrer">
                    {drop.claim_url.slice(0, 32)}...
                  </a>
                </div>
                <button className="copy-link-btn" onClick={() => copyToClipboard(drop.claim_url)}>📋 Copy Link</button>
                <div><strong>📅 Created:</strong> {new Date(drop.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
