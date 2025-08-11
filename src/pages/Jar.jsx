import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import jarArtifact from './abi/TipperJar.json'
import Navbar from './Navbar'
import './Jar.css'

const JAR_ADDRESS = '0x0C8a7eF6494eF7fA11e506dDe27B16b029c9Faa1'

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

  useEffect(() => {
    const init = async () => {
      const savedWallet = localStorage.getItem('walletAddress')
      if (savedWallet && window.ethereum) {
        setWallet(savedWallet)
        const providerInstance = new ethers.providers.Web3Provider(window.ethereum)
        setProvider(providerInstance)
        const signer = providerInstance.getSigner()
        const contract = new ethers.Contract(JAR_ADDRESS, jarArtifact.abi, signer)
        try {
          const bal = await contract.jarBalances(savedWallet)
          setBalance(ethers.utils.formatEther(bal))
        } catch {
          setBalance('0')
        }
      }
    }
    init()
  }, [])

  const deposit = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      showToast('❌ Enter a valid amount')
      return
    }

    setLoading(true)
    try {
      const signer = await provider.getSigner()
      const signerAddress = await signer.getAddress()
      const contract = new ethers.Contract(JAR_ADDRESS, jarArtifact.abi, signer)
      const tx = await contract.deposit({ value: ethers.utils.parseEther(amount) })
      await tx.wait()
      const updated = await contract.jarBalances(signerAddress)
      setBalance(ethers.utils.formatEther(updated))
      showToast('✅ Deposit successful!')
      setAmount('')
    } catch {
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
        <p className="wallet">Connected: {wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : 'Not connected'}</p>
        <p className="jar-balance">Balance: {balance !== null ? `${balance} AVAX` : 'Loading...'}</p>
        <div className="jar-action">
          <input
            type="number"
            placeholder="Amount to deposit (AVAX)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button className="jar-btn" onClick={deposit} disabled={loading}>
            {loading ? 'Depositing...' : '➕ Deposit to Jar'}
          </button>
        </div>
      </div>
    </div>
  )
}
