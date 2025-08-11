import { useEffect, useState, useCallback } from 'react'
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

  // helper to get a contract instance tied to current signer
  const getContract = useCallback(async () => {
    if (!provider) return null
    const signer = provider.getSigner()
    return new ethers.Contract(JAR_ADDRESS, jarArtifact.abi, signer)
  }, [provider])

  // read jar balance for an address
  const readJarBalance = useCallback(async (addr) => {
    try {
      if (!addr) { setBalance('0'); return }
      const contract = await getContract()
      if (!contract) return
      const bal = await contract.jarBalances(addr)
      setBalance(ethers.utils.formatEther(bal))
    } catch {
      setBalance('0')
    }
  }, [getContract])

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) {
        showToast('🦊 Wallet not found')
        return
      }

      // Ask for permission on this origin (important on Vercel)
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' })
      } catch (e) {
        // user may reject; continue best-effort
      }

      const providerInstance = new ethers.providers.Web3Provider(window.ethereum)
      setProvider(providerInstance)

      // active account (prefer provider account; fallback to saved)
      let activeAddress = ''
      try {
        const signer = providerInstance.getSigner()
        activeAddress = await signer.getAddress()
      } catch {
        activeAddress = ''
      }
      const saved = localStorage.getItem('walletAddress')
      const finalAddr = activeAddress || saved || ''
      if (finalAddr) setWallet(finalAddr)

      // Ensure Fuji
      try {
        const net = await providerInstance.getNetwork()
        if (Number(net.chainId) !== FUJI_CHAIN_ID) {
          showToast('⚠️ Switch network to Avalanche Fuji')
        }
      } catch {}

      await readJarBalance(finalAddr)

      // Listen for account / chain changes
      const onAccountsChanged = async (accounts) => {
        const next = accounts?.[0] || ''
        setWallet(next)
        await readJarBalance(next)
      }
      const onChainChanged = () => {
        // simplest: reload app context on chain switch
        window.location.reload()
      }

      window.ethereum.on?.('accountsChanged', onAccountsChanged)
      window.ethereum.on?.('chainChanged', onChainChanged)

      return () => {
        window.ethereum?.removeListener?.('accountsChanged', onAccountsChanged)
        window.ethereum?.removeListener?.('chainChanged', onChainChanged)
      }
    }

    init()
  }, [readJarBalance])

  const refresh = async () => {
    await readJarBalance(wallet)
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
      // network guard (prod)
      const net = await provider.getNetwork()
      if (Number(net.chainId) !== FUJI_CHAIN_ID) {
        showToast('⚠️ Switch to Avalanche Fuji')
        setLoading(false)
        return
      }

      const signer = provider.getSigner()
      const signerAddress = await signer.getAddress()
      const contract = new ethers.Contract(JAR_ADDRESS, jarArtifact.abi, signer)

      const tx = await contract.deposit({ value: ethers.utils.parseEther(amount) })
      await tx.wait()

      // Retry read a few times for RPC sync
      let updatedOk = false
      for (let i = 0; i < 5; i++) {
        try {
          const updated = await contract.jarBalances(signerAddress)
          setBalance(ethers.utils.formatEther(updated))
          setWallet(signerAddress) // reflect depositor explicitly
          updatedOk = true
          break
        } catch {}
        await new Promise(r => setTimeout(r, 750))
      }
      if (!updatedOk) await refresh()

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
