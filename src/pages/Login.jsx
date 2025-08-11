import { useEffect, useState } from "react"
import { ethers } from "ethers"
import './Login.css'
import TipFeed from './TipFeed'
import { supabase } from "../utils/supabase"
import bgImage from '../assets/snowdrop-bg.png'
import { toast, Toaster } from 'react-hot-toast'

const SUPABASE_URL = 'https://vavrqhflogjkxnsphdhh.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnJxaGZsb2dqa3huc3BoZGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTg0OTYsImV4cCI6MjA2ODgzNDQ5Nn0.g9-9Pe_KXWCWqENEvgtmtFBVm64dRKM9slQrhdYU_lQ'
const ESCROW_ADDRESS = "0x370d6006D2C2C1c64408555Fa7ff5b6134C16d4D"


export default function Login() {
  const [user, setUser] = useState(null)
  const [balances, setBalances] = useState({ AVAX: 0, USDC: 0 })
  const [wallet, setWallet] = useState("")
  const [isClaimingAVAX, setIsClaimingAVAX] = useState(false)
  const [isClaimingUSDC, setIsClaimingUSDC] = useState(false)

  useEffect(() => {
    checkSession()
    checkWallet()
  }, [])

  const checkWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length > 0) {
        setWallet(accounts[0])
        localStorage.setItem("walletAddress", accounts[0])
      }
    }
  }

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      handleLogin(session)
    }
  }

const handleLogin = async (session) => {
  const user = session.user
  const handle = user.user_metadata?.user_name?.trim()
  const avatar = user.user_metadata?.avatar_url
  if (!handle || !avatar) return

  setUser({ handle, avatar })
  localStorage.setItem("twitterHandle", handle)
  localStorage.setItem("twitterAvatar", avatar)

  let connectedWallet = wallet
  if (!connectedWallet && window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length > 0) connectedWallet = accounts[0]
    } catch (err) {
      console.error("⚠️ Wallet check failed:", err)
    }
  }

  // ✅ Upsert wallet in Supabase
  if (connectedWallet) {
    try {
      const { error } = await supabase.from("wallets").upsert({
        twitter_handle: handle,
        wallet_address: connectedWallet,
        avatar_url: avatar
      }, { onConflict: "twitter_handle" })

      if (error) {
        console.error("❌ Supabase wallet upsert failed:", error)
      } else {
        console.log("✅ Wallet upserted to Supabase:", handle, connectedWallet)
      }
    } catch (err) {
      console.error("❌ Supabase upsert error:", err)
    }
  }

  const EXTENSION_IDS = [
  "dppbieefbdloflnmjpdiekbnjfcjijei", // Your main extension
  "ljopfldonknfflhlgihlaimfmpgffjej",
  "ccnmpinpfedmemgmjpfihfccplmpbplo",
  "lifmiaadfbedeijdobpakjpdilkloneo",
  "ljdfigfecfimanppcjeinlcdgglgkigp"
]

if (connectedWallet && handle && typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
  EXTENSION_IDS.forEach(id => {
    try {
      chrome.runtime.sendMessage(
        id,
        {
          action: "saveTwitterSession",
          twitterHandle: handle,
          walletAddress: connectedWallet,
          twitterAvatar: avatar
        },
        (res) => {
          if (chrome.runtime.lastError) {
            console.warn(`❌ Extension send failed to ${id}:`, chrome.runtime.lastError.message)
          } else {
            console.log(`✅ Sent to extension (${id}):`, res)
          }
        }
      )
    } catch (err) {
      console.warn(`⚠️ Error sending to extension (${id}):`, err)
    }
  })
}


  // ✅ Fetch balances
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tips?author_handle=eq.${handle}&claimed=is.false&select=amount,token`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  })

  const tips = await res.json()
  const totals = { AVAX: 0, USDC: 0 }
  tips.forEach(tip => {
    const token = (tip.token || '').toUpperCase()
    const amt = Number(tip.amount || 0)
    if (token === 'AVAX') totals.AVAX += amt
    if (token === 'USDC') totals.USDC += amt
  })

  setBalances(totals)
}



  const loginWithTwitter = async () => {
    await supabase.auth.signInWithOAuth({ provider: "twitter" })
  }

  const connectWallet = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = provider.getSigner()
      const address = await signer.getAddress()
      setWallet(address)
      localStorage.setItem("walletAddress", address)

      // If already logged in, upsert immediately
      const twitterHandle = localStorage.getItem("twitterHandle")
      const avatar = localStorage.getItem("twitterAvatar")

      if (twitterHandle && avatar) {
        await supabase.from("wallets").upsert({
          twitter_handle: twitterHandle,
          wallet_address: address,
          avatar_url: avatar
        }, { onConflict: "twitter_handle" })
      }
    } catch (err) {
      alert("Wallet connection failed.")
    }
  }

  const handleClaim = async (token) => {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    await provider.send("eth_requestAccounts", [])
    const signer = provider.getSigner()
    const userAddress = await signer.getAddress()

    const contract = new ethers.Contract(ESCROW_ADDRESS, [
      {
        name: `claim${token}`,
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "twitterHandle", type: "string" },
          { name: "receiver", type: "address" }
        ],
        outputs: []
      }
    ], signer)

    // 👇 Set loading state
    if (token === "AVAX") setIsClaimingAVAX(true)
    if (token === "USDC") setIsClaimingUSDC(true)

    const tx = await contract[`claim${token}`](user.handle, userAddress)
    await tx.wait()

    await fetch(`${SUPABASE_URL}/rest/v1/tips?author_handle=eq.${user.handle}&token=eq.${token}&claimed=is.false`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ claimed: true })
    })

    const toastId = toast(
  (t) => (
    <div>
      ✅ {token} Claimed!<br />
      <a
        href={`https://testnet.snowtrace.io/tx/${tx.hash}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#1976d2', textDecoration: 'underline' }}
      >
        🔗 View on Snowtrace
      </a>
      <br />
      <button
        onClick={() => {
          toast.dismiss(t.id)
          window.location.reload()
        }}
        style={{
          marginTop: '10px',
          padding: '6px 12px',
          borderRadius: '8px',
          background: '#1976d2',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Close & Refresh
      </button>
    </div>
  ),
  {
    duration: Infinity,
  }
)

  } catch (err) {
    console.error(err)
    toast.error(`❌ ${token} Claim failed`)
  } finally {
    // 🔁 Reset loading state
    if (token === "AVAX") setIsClaimingAVAX(false)
    if (token === "USDC") setIsClaimingUSDC(false)
  }
}



  return (
    <div
  className="page"
  style={{
    backgroundImage: `url(${bgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
  }}
>

      <Toaster position="top-center" />
      <div className="navbar-wrapper">
  <nav className="navbar">
    <div className="navbar-left">
      <a href="/" className="nav-title">💧 SNOWDROP</a>
    </div>

    <div className="navbar-center">
      {user ? (
        <>
          <a href="/create-link" className="nav-link">Create Drop</a>
          <a href="/my-drops" className="nav-link">My Drops</a>
          <a href="/analytics" className="nav-link">Analytics</a>
          <a href="/jar" className="nav-link">Jar</a>
        </>
      ) : (
        <a href="/analytics" className="nav-link solo-analytics">Analytics</a>
      )}
    </div>

    <div className="navbar-right">
      {!wallet ? (
        <button className="wallet-btn" onClick={connectWallet}>🔗 Connect Wallet</button>
      ) : (
        <span className="wallet-display">
  {(wallet || localStorage.getItem("walletAddress"))?.slice(0, 6)}...
  {(wallet || localStorage.getItem("walletAddress"))?.slice(-4)}
</span>

      )}
    </div>
  </nav>
</div>



      <div className="dashboard-layout">
        <div className="main-column">
          <div className="main">
            {user ? (
              <>
                <img className="avatar" src={user.avatar.replace('_normal', '_400x400')} alt="avatar" />
                <h2 className="welcome">Welcome @{user.handle}</h2>
                <h3 className="balance-title">💸 Tip Balances</h3>
                <div className="cards">
  <div className="card">
    <p>🔺 {balances.AVAX.toFixed(3)} AVAX</p>
    <button
      className="claim-btn"
      onClick={() => handleClaim("AVAX")}
      disabled={isClaimingAVAX || balances.AVAX < 0.001}
    >
      {isClaimingAVAX ? "Claiming AVAX..." : "Claim AVAX"}
    </button>
  </div>

  <div className="card">
    <p>💲 {balances.USDC.toFixed(3)} USDC</p>
    <button
      className="claim-btn"
      onClick={() => handleClaim("USDC")}
      disabled={isClaimingUSDC || balances.USDC < 0.001}
    >
      {isClaimingUSDC ? "Claiming USDC..." : "Claim USDC"}
    </button>
  </div>
</div>
              </>
            ) : (
              <button className="login-btn" onClick={loginWithTwitter}>Login with Twitter</button>
            )}
          </div>
        </div>
        <TipFeed />
      </div>
    </div>
  )
}
