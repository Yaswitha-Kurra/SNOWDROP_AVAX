import { useEffect, useState, useCallback, useRef } from 'react'
import { ethers } from 'ethers'
import jarArtifact from './abi/TipperJar.json'
import Navbar from './Navbar'
import './Jar.css'

const JAR_ADDRESS = '0x0C8a7eF6494eF7fA11e506dDe27B16b029c9Faa1'
const FUJI_CHAIN_ID = 43113

function showToast(msg) {
  const el = document.createElement('div')
  el.className = 'toast-notification'
  el.innerText = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2000)
}

export default function Jar() {
  const [wallet, setWallet] = useState('')
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState(null)
  const [amount, setAmount] = useState('')

  const pollIdRef = useRef(null)
  const walletRef = useRef('')
  useEffect(() => { walletRef.current = wallet }, [wallet])

  // Provider bootstrap (ethers v6)
  useEffect(() => {
    if (!window.ethereum) {
      showToast('🦊 Wallet not found')
      return
    }
    const prov = new ethers.BrowserProvider(window.ethereum) // v6
    setProvider(prov)

    ;(async () => {
      try { await window.ethereum.request?.({ method: 'eth_requestAccounts' }) } catch {}
      let addr = ''
      try {
        const signer = await prov.getSigner()
        addr = await signer.getAddress()
      } catch {}
      if (!addr) addr = localStorage.getItem('walletAddress') || ''
      setWallet(addr)
      await ensureFuji(prov)
      await readJarBalance(prov, addr)
    })()

    return () => {
      if (pollIdRef.current) {
        clearInterval(pollIdRef.current)
        pollIdRef.current = null
      }
    }
  }, [])

  const ensureFuji = useCallback(async (prov) => {
    if (!prov) return false
    try {
      const net = await prov.getNetwork()
      if (Number(net.chainId) !== FUJI_CHAIN_ID) {
        showToast('⚠️ Switch to Avalanche Fuji')
        return false
      }
      return true
    } catch {
      return false
    }
  }, [])

  const getContract = useCallback(async (prov) => {
    if (!prov) return null
    const signer = await prov.getSigner()
    return new ethers.Contract(JAR_ADDRESS, jarArtifact.abi, signer)
  }, [])

  const readJarBalance = useCallback(async (prov, addr) => {
    if (!prov || !addr) { setBalance('0'); return }
    try {
      const c = await getContract(prov)
      if (!c) return
      const bal = await c.jarBalances(addr)
      setBalance(ethers.formatEther(bal)) // v6
    } catch {
      setBalance('0')
    }
  }, [getContract])

  // Lightweight polling (every 4s) instead of provider.on('block')
  useEffect(() => {
    if (!provider) return
    if (pollIdRef.current) return
    const tick = async () => {
      const ok = await ensureFuji(provider)
      if (!ok) return
      const addr = walletRef.current
      if (addr) await readJarBalance(provider, addr)
    }
    pollIdRef.current = window.setInterval(tick, 4000)
    // prime once
    tick()
    return () => {
      if (pollIdRef.current) {
        clearInterval(pollIdRef.current)
        pollIdRef.current = null
      }
    }
  }, [provider, ensureFuji, readJarBalance])

  const refresh = async () => {
    try { await window.ethereum?.request?.({ method: 'eth_requestAccounts' }) } catch {}
    await readJarBalance(provider, walletRef.current)
    showToast('🔄 Refreshed')
  }

  const deposit = async () => {
    if (!provider) return showToast('🦊 Connect your wallet first')
    if (!amount || isNaN(amount) || Number(amount) <= 0) return showToast('❌ Enter a valid amount')

    setLoading(true)
    try {
      const ok = await ensureFuji(provider)
      if (!ok) { setLoading(false); return }

      const signer = await provider.getSigner()
      const signerAddress = await signer.getAddress()
      const contract = await getContract(provider)

      const tx = await contract.deposit({ value: ethers.parseEther(amount) }) // v6
      await tx.wait()

      // read now + small retry for RPC lag
      let done = false
      for (let i = 0; i < 5; i++) {
        try {
          const updated = await contract.jarBalances(signerAddress)
          setBalance(ethers.formatEther(updated))
          setWallet(signerAddress)
          done = true
          break
        } catch {}
        await new Promise(r => setTimeout(r, 700))
      }
      if (!done) await refresh()

      showToast('✅ Deposit successful!')
      setAmount('')
    } catch (e) {
      console.error(e)
      showToast('❌ Deposit failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="jar-container">
        <h2>🍯 Your Tip Jar</h2>
        <p className="wallet">
          Connected: {wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : 'Not connected'}
        </p>
        <p className="jar-balance">
          Balance: {balance !== null ? `${balance} AVAX` : 'Loading...'}
        </p>
        <div className="jar-action">
          <input
            type="number"
            placeholder="Amount to deposit (AVAX)"
            value={amount}
            onChange={(e) => setAmount(e.target.value.trim())}
          />
          <button className="jar-btn" onClick={deposit} disabled={loading}>
            {loading ? 'Depositing...' : '➕ Deposit to Jar'}
          </button>
          <button className="jar-btn ghost" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
