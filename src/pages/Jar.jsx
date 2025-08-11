import { useEffect, useState, useCallback, useRef } from 'react'
import { ethers } from 'ethers'
import jarArtifact from './abi/TipperJar.json'
import Navbar from './Navbar'
import './Jar.css'

const JAR_ADDRESS = '0x0C8a7eF6494eF7fA11e506dDe27B16b029c9Faa1'
const FUJI_CHAIN_ID = 43113

function showToast(msg) {
  const toast = document.createElement('div')
  toast.className = 'toast-notification'
  toast.innerText = msg
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2000)
}

export default function Jar() {
  const [wallet, setWallet] = useState('')
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState(null)
  const [amount, setAmount] = useState('')

  // refs to avoid stale closures + duplicate listeners
  const walletRef = useRef('')
  const listenersAttachedRef = useRef(false)
  const blockHandlerRef = useRef(null)

  useEffect(() => { walletRef.current = wallet }, [wallet])

  const getContract = useCallback(async () => {
    if (!provider) return null
    const signer = provider.getSigner()
    return new ethers.Contract(JAR_ADDRESS, jarArtifact.abi, signer)
  }, [provider])

  const readJarBalance = useCallback(async (addr) => {
    if (!addr) { setBalance('0'); return }
    try {
      const contract = await getContract()
      if (!contract) return
      const bal = await contract.jarBalances(addr)
      setBalance(ethers.utils.formatEther(bal))
    } catch {
      setBalance('0')
    }
  }, [getContract])

  const ensureFuji = useCallback(async () => {
    if (!provider) return false
    try {
      const net = await provider.getNetwork()
      if (Number(net.chainId) !== FUJI_CHAIN_ID) {
        showToast('⚠️ Switch to Avalanche Fuji')
        return false
      }
      return true
    } catch { return false }
  }, [provider])

  // bootstrap provider + initial read
  useEffect(() => {
    if (!window.ethereum) {
      showToast('🦊 Wallet not found')
      return
    }

    const prov = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(prov)

    // request accounts for this origin (Vercel)
    (async () => {
      try { await window.ethereum.request({ method: 'eth_requestAccounts' }) } catch {}

      let addr = ''
      try { addr = await prov.getSigner().getAddress() } catch {}
      if (!addr) {
        const saved = localStorage.getItem('walletAddress') || ''
        addr = saved
      }
      setWallet(addr)
      await ensureFuji()
      await readJarBalance(addr)
    })()

    return () => {
      // cleanup happens in the listener effect below
    }
  }, [ensureFuji, readJarBalance])

  // attach listeners ONCE, with proper cleanup
  useEffect(() => {
    if (!provider || listenersAttachedRef.current) return
    listenersAttachedRef.current = true

    const onAccountsChanged = async (accounts) => {
      const next = accounts?.[0] || ''
      setWallet(next)
      await readJarBalance(next)
    }

    const onChainChanged = () => {
      // Full reload to reset provider state across wallets (MetaMask/Pelagus)
      window.location.reload()
    }

    window.ethereum?.on?.('accountsChanged', onAccountsChanged)
    window.ethereum?.on?.('chainChanged', onChainChanged)

    // live sync on each new block (lightweight re-read)
    const bh = async () => {
      const ok = await ensureFuji()
      if (!ok) return
      const addr = walletRef.current
      if (addr) await readJarBalance(addr)
    }
    blockHandlerRef.current = bh
    provider.on('block', bh)

    return () => {
      // 🔥 cleanup to prevent MaxListenersExceededWarning
      try { window.ethereum?.removeListener?.('accountsChanged', onAccountsChanged) } catch {}
      try { window.ethereum?.removeListener?.('chainChanged', onChainChanged) } catch {}
      try { if (blockHandlerRef.current) provider.removeListener('block', blockHandlerRef.current) } catch {}
      listenersAttachedRef.current = false
      blockHandlerRef.current = null
    }
  }, [provider, ensureFuji, readJarBalance])

  const refresh = async () => {
    // optional: re-request accounts to ensure active account on this origin
    try { await window.ethereum?.request?.({ method: 'eth_requestAccounts' }) } catch {}
    await readJarBalance(walletRef.current)
    showToast('🔄 Refreshed')
  }

  const deposit = async () => {
    if (!provider) {
      showToast('🦊 Connect your wallet first')
      return
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      showToast('❌ Enter a valid amount')
      return
    }

    setLoading(true)
    try {
      const ok = await ensureFuji()
      if (!ok) { setLoading(false); return }

      const signer = provider.getSigner()
      const signerAddress = await signer.getAddress()
      const contract = new ethers.Contract(JAR_ADDRESS, jarArtifact.abi, signer)
      const tx = await contract.deposit({ value: ethers.utils.parseEther(amount) })
      await tx.wait()

      // read now + small retry for RPC lag
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
