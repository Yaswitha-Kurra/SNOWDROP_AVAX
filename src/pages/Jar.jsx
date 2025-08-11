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

  // keep latest wallet in a ref for block listener closures
  const walletRef = useRef('')
  const visibleRef = useRef(true)

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
    } catch {
      return false
    }
  }, [provider])

  useEffect(() => {
    walletRef.current = wallet
  }, [wallet])

  // init + listeners
  useEffect(() => {
    let blockHandler = null
    const init = async () => {
      if (!window.ethereum) {
        showToast('🦊 Wallet not found')
        return
      }

      // Request account permission for this origin (important on Vercel)
      try { await window.ethereum.request({ method: 'eth_requestAccounts' }) } catch {}

      const prov = new ethers.providers.Web3Provider(window.ethereum)
      setProvider(prov)

      // pick active address (prefer provider)
      let addr = ''
      try { addr = await prov.getSigner().getAddress() } catch {}
      if (!addr) {
        const saved = localStorage.getItem('walletAddress') || ''
        addr = saved
      }
      setWallet(addr)

      await ensureFuji()
      await readJarBalance(addr)

      // Update on account change
      const onAccountsChanged = async (accounts) => {
        const next = accounts?.[0] || ''
        setWallet(next)
        await readJarBalance(next)
      }
      window.ethereum.on?.('accountsChanged', onAccountsChanged)

      // Hard refresh on chain change to avoid mixed providers
      const onChainChanged = () => window.location.reload()
      window.ethereum.on?.('chainChanged', onChainChanged)

      // Live sync: on every new block (when tab visible), re-read jar balance
      blockHandler = async () => {
        if (!visibleRef.current) return
        const ok = await ensureFuji()
        if (!ok) return
        const current = walletRef.current
        if (current) await readJarBalance(current)
      }
      prov.on('block', blockHandler)

      // Pause/resume on tab visibility change
      const onVisibility = async () => {
        visibleRef.current = document.visibilityState === 'visible'
        if (visibleRef.current) {
          const current = walletRef.current
          await readJarBalance(current)
        }
      }
      document.addEventListener('visibilitychange', onVisibility)

      // Cleanup
      return () => {
        window.ethereum?.removeListener?.('accountsChanged', onAccountsChanged)
        window.ethereum?.removeListener?.('chainChanged', onChainChanged)
        document.removeEventListener('visibilitychange', onVisibility)
        if (blockHandler) prov.removeListener('block', blockHandler)
      }
    }

    const cleanupPromise = init()
    return () => { /* cleanup handled inside init's return */ }
  }, [ensureFuji, readJarBalance])

  const refresh = async () => {
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

      // read immediately + retry a bit for RPC lag
      for (let i = 0; i < 5; i++) {
        try {
          const updated = await contract.jarBalances(signerAddress)
          setBalance(ethers.utils.formatEther(updated))
          setWallet(signerAddress)
          break
        } catch {}
        await new Promise(r => setTimeout(r, 700))
      }

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
