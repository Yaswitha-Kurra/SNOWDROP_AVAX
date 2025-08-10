import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import jarArtifact from './abi/TipperJar.json'
import Navbar from './Navbar'
import './Jar.css'

const JAR_ADDRESS = '0x0C8a7eF6494eF7fA11e506dDe27B16b029c9Faa1'

export default function Jar() {
  const [wallet, setWallet] = useState('')
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState(null)

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
        } catch (err) {
          console.error("Error fetching jar balance:", err)
          setBalance('0')
        }
      }
    }
    init()
  }, [])

  const deposit = async () => {
  const amount = prompt("Enter amount of AVAX to deposit:")
  if (!amount || isNaN(amount)) return

  setLoading(true)
  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress() // ← Get the actual signer address
    const contract = new ethers.Contract(JAR_ADDRESS, jarArtifact.abi, signer)
    const network = await provider.getNetwork();
console.log("Connected network:", network.name, network.chainId);
console.log("Signer address:", await signer.getAddress());


    const tx = await contract.deposit({ value: ethers.utils.parseEther(amount) })
    await tx.wait()

    const updated = await contract.jarBalances(signerAddress) // ← Use signer address here
    setBalance(ethers.utils.formatEther(updated))
    setWallet(signerAddress) // ← Update wallet state to the actual signer too

    alert("✅ Deposit successful!")
  } catch (err) {
    console.error(err)
    alert("❌ Deposit failed.")
  } finally {
    setLoading(false)
  }
}


  return (
    <>
    <div className="page-wrapper">
      <Navbar />
    
      <div className="jar-container">
        <h2>🍯 Your Tip Jar</h2>
        <p className="wallet">Connected: {wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : 'Not connected'}</p>
        <p className="jar-balance">Balance: {balance !== null ? `${balance} AVAX` : 'Loading...'}</p>

        <button className="jar-btn" onClick={deposit} disabled={loading}>
          {loading ? 'Depositing...' : '➕ Deposit to Jar'}
        </button>
      </div>
      </div>
    </>
  )
}
