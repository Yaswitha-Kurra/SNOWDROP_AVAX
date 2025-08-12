import { useEffect, useState, useCallback, useRef } from 'react'
import { ethers } from 'ethers'
import jarArtifact from './abi/TipperJar.json'
import Navbar from './Navbar'
import './Jar.css'

const JAR_ADDRESS = '0x0C8a7eF6494eF7fA11e506dDe27B16b029c9Faa1'
const FUJI_CHAIN_ID = 43113
const POLL_MS = 4000

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

  // ----- helpers (ethers v5) -----
  const getProvider = useCallback(() => {
    if (!window.ethereum) return null
    return new ethers.providers.Web3Provider(window.ethereum)
  }, [])

  const getSigner = useCallback((prov) => prov.getSigner(), [])

  const getContract = useCallback(async (prov) => {
    if (!prov) return null
    const signer = getSigner(prov)
    return new ethers.Contract(JAR_ADDRESS, jarArtifact.abi, signer)
  }, [getSigner])

  const ensureFuji = useCallback(async (prov) => {
    if (!prov) return false
    try {
      const net = await prov.getNetwork()
      if (Number(net.chainId) !== FUJI_CHAIN_ID) {
        showToast('⚠️ Switch to Avalanche Fuji')
        return false
      }
      return true
    } catch { return false }
  }, [])

  const readJarBalance = useCallback(async (prov, addr) => {
    if (!prov || !addr) { setBalance('0'); return }
    try {
      const c = await getContract(prov)
      if (!c) return
      const bal = await c.jarBalances(addr)
      setBalance(ethers.utils.formatEther(bal))
    } catch {
      setBalance('0')
    }
  }, [getContract])

  // ----- bootstrap -----
  useEffect(() => {
    const prov = getProvider()
    if (!prov) {
      showToast('🦊 Wallet not found')
      return
    }
    setProvider(prov)

    (async () => {
      try { await window.ethereum.request?.({ method: 'eth_requestAccounts' }) } catch {}
      let addr = ''
      try { addr = await prov.getSigner().getAddress() } catch {}
      if (!addr) addr = localStorage.getItem('walletAddress') || ''
      setWallet(addr)
      await ensureFuji(prov)
      await readJarBalance(prov, addr)
    })()
  }, [getProvider, ensureFuji, readJarBalance])

  // ----- listeners + polling (no provider.on('block')) -----
  useEffect(() => {
    if (!provider) return

    const onAccountsChanged = async (accounts) => {
      const next = accounts?.[0] || ''
      setWallet(next)
      await readJarBalance(provider, next)
    }
    const onChainChanged = () => window.location.reload()

    window.ethereum?.on?.('accountsChanged', onAccountsChanged)
    window.ethereum?.on?.('chainChanged', onChainChanged)

    // lightweight polling so tips from elsewhere show up
    const tick = async () => {
      const ok = await ensureFuji(provider)
      if (!ok) return
      const addr = walletRef.current
      if (addr) await readJarBalance(provider, addr)
    }
    pollIdRef.current = window.setInterval(tick, POLL_MS)
    tick() // prime once

    return () => {
      try { window.ethereum?.removeListener?.('accountsChanged', onAccountsChanged) } catch {}
      try { window.ethereum?.removeListener?.('chainChanged', onChainChanged) } catch {}
      if (pollIdRef.current) {
        clearInterval(pollIdRef.current)
        pollIdRef.current = null
      }
    }
  }, [provider, ensureFuji, readJarBalance])

  // ----- actions -----
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

      const signer = getSigner(provider)
      const signerAddress = await signer.getAddress()
      const contract = await getContract(provider)

      const tx = await contract.deposit({ value: ethers.utils.parseEther(amount) })
      await tx.wait()

      // immediate read + small retry for RPC lag
      let done = false
      for (let i = 0; i < 5; i++) {
        try {
          const updated = await contract.jarBalances(signerAddress)
          setBalance(ethers.utils.formatEther(updated))
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
