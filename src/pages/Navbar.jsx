import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Navbar.css'
import { supabase } from '../utils/supabase'

export default function Navbar() {
  const [wallet, setWallet] = useState('')
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Check if wallet is already connected (does NOT trigger MetaMask)
    async function checkWallet() {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            setWallet(accounts[0])
          }
        } catch (err) {
          console.error("Failed to check wallet:", err)
        }
      }
    }

    // Check Supabase session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
    }

    checkWallet()
    checkSession()

    // Supabase auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Only triggers wallet prompt on button click
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        setWallet(accounts[0])
      } catch (err) {
        console.error("Connection rejected")
      }
    } else {
      alert("No EVM wallet found. Please install MetaMask or another wallet.")
    }
  }

  return (
    <div className="navbar-wrapper">
      <nav className="navbar">
        <div className="navbar-left">
          <Link to="/" className="nav-title">💧 SNOWDROP</Link>
        </div>

        <div className="navbar-center">
  {session ? (
    <>
      <Link to="/create-link" className="nav-link">Create Drop</Link>
      <Link to="/my-drops" className="nav-link">My Drops</Link>
      <Link to="/analytics" className="nav-link">Analytics</Link>
       <Link to="/jar" className="nav-link">Jar</Link>
    </>
  ) : (
    <Link to="/analytics" className="nav-link solo-analytics">Analytics</Link>
  )}
</div>


        <div className="navbar-right">
          {!wallet ? (
            <button className="wallet-btn" onClick={connectWallet}>🔗 Connect Wallet</button>
          ) : (
            <span className="wallet-display">{wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
          )}
        </div>
      </nav>
    </div>
  )
}
