import { useState } from 'react'
import { ethers } from 'ethers'
import { supabase } from '../utils/supabase'
import { QRCodeCanvas } from 'qrcode.react'
import './CreateLink.css'
import Navbar from './Navbar'

const showToast = (msg) => {
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.innerText = msg
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

const generateShortCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default function CreateLinkPage() {
  const [token, setToken] = useState('AVAX')
  const [amount, setAmount] = useState('')
  const [recipients, setRecipients] = useState('')
  const [whitelistMode, setWhitelistMode] = useState(false)
  const [whitelist, setWhitelist] = useState('')
  const [generatedLink, setGeneratedLink] = useState('')
  const [loading, setLoading] = useState(false)

  const [dualAvax, setDualAvax] = useState('')
  const [dualUsdc, setDualUsdc] = useState('')
  const [dualRecipients, setDualRecipients] = useState('')
  const [dualGeneratedLink, setDualGeneratedLink] = useState('')
  const [dualLoading, setDualLoading] = useState(false)

  const [showEnlargedQR, setShowEnlargedQR] = useState(false)
  const [enlargedQRLink, setEnlargedQRLink] = useState('')

  const contractAddress = "0xe154F4963d28e4Aa690d804c5928efE0b496DaDB"
  const usdcAddress = "0x5425890298aed601595a70AB815c96711a31Bc65"

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const wlArray = whitelistMode
        ? whitelist.split(/[,\n]/).map(a => a.trim().toLowerCase()).filter(a => a.startsWith('0x') && a.length === 42)
        : []

      if (!amount || (!recipients && !wlArray.length)) {
        alert('Please enter valid amount and recipient count')
        setLoading(false)
        return
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      const signer = provider.getSigner()
      const userAddress = (await signer.getAddress()).toLowerCase()

      const parsedAmount = token === 'AVAX'
        ? ethers.utils.parseEther(amount)
        : ethers.utils.parseUnits(amount, 6)

      if (token === 'USDC') {
        const usdcAbi = ["function approve(address spender, uint256 amount) external returns (bool)"]
        const usdc = new ethers.Contract(usdcAddress, usdcAbi, signer)
        const approval = await usdc.approve(contractAddress, parsedAmount)
        await approval.wait()
      }

      const abi = [
        {
          inputs: [
            { name: "token", type: "string" },
            { name: "totalAmount", type: "uint256" },
            { name: "numRecipients", type: "uint256" }
          ],
          name: "createDrop",
          outputs: [{ name: "dropId", type: "bytes32" }],
          stateMutability: "payable",
          type: "function"
        },
        {
          name: "DropCreated",
          type: "event",
          inputs: [
            { name: "dropId", type: "bytes32", indexed: true },
            { name: "creator", type: "address", indexed: true },
            { name: "token", type: "string" },
            { name: "totalAmount", type: "uint256" },
            { name: "numRecipients", type: "uint256" }
          ],
          anonymous: false
        }
      ]

      const contract = new ethers.Contract(contractAddress, abi, signer)
      const valueToSend = token === 'AVAX' ? parsedAmount : 0
      const tx = await contract.createDrop(token, parsedAmount, wlArray.length || recipients, { value: valueToSend })
      const receipt = await tx.wait()
      const dropId = receipt.events.find(e => e.event === 'DropCreated')?.args?.dropId
      if (!dropId) throw new Error("No drop ID found")

      const shortCode = generateShortCode()
      const claimUrl = `${window.location.origin}/${shortCode}`
      setGeneratedLink(claimUrl)
      showToast('✅ Drop created successfully!')

      const session = (await supabase.auth.getSession()).data.session
      const twitterHandle = session?.user?.user_metadata?.user_name || null

      const insertObj = {
        twitter_handle: twitterHandle,
        wallet_address: userAddress,
        token,
        amount: Number(amount),
        number_of_people: Number(wlArray.length || recipients),
        claim_url: claimUrl,
        short_code: shortCode,
        drop_id: dropId,
        whitelist: wlArray.length ? wlArray : null
      }

      const { error } = await supabase.from('drops').insert(insertObj)
      if (error) console.error('Supabase insert error', error)
    } catch (err) {
      console.error(err)
      alert("Drop creation failed")
    } finally {
      setLoading(false)
    }
  }

  const handleDualDrop = async () => {
    setDualLoading(true)
    try {
      if (!dualAvax || !dualUsdc || !dualRecipients) {
        alert("Please fill in all fields.")
        setDualLoading(false)
        return
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      const signer = provider.getSigner()
      const userAddress = (await signer.getAddress()).toLowerCase()

      const parsedAvax = ethers.utils.parseEther(dualAvax)
      const parsedUsdc = ethers.utils.parseUnits(dualUsdc, 6)

      const usdcAbi = ["function approve(address spender, uint256 amount) external returns (bool)"]
      const usdc = new ethers.Contract(usdcAddress, usdcAbi, signer)
      const approval = await usdc.approve(contractAddress, parsedUsdc)
      await approval.wait()

      const abi = [
        {
          name: "createDualDrop",
          type: "function",
          stateMutability: "payable",
          inputs: [
            { name: "avaxAmount", type: "uint256" },
            { name: "usdcAmount", type: "uint256" },
            { name: "numRecipients", type: "uint256" }
          ],
          outputs: [{ name: "dropId", type: "bytes32" }]
        },
        {
          name: "DropCreated",
          type: "event",
          inputs: [
            { name: "dropId", type: "bytes32", indexed: true },
            { name: "creator", type: "address", indexed: true },
            { name: "token", type: "string" },
            { name: "totalAmount", type: "uint256" },
            { name: "numRecipients", type: "uint256" }
          ],
          anonymous: false
        }
      ]

      const contract = new ethers.Contract(contractAddress, abi, signer)
      const tx = await contract.createDualDrop(parsedAvax, parsedUsdc, dualRecipients, { value: parsedAvax })
      const receipt = await tx.wait()
      const dropId = receipt.events.find(e => e.event === 'DropCreated')?.args?.dropId
      if (!dropId) throw new Error("No drop ID found")

      const shortCode = generateShortCode()
      const claimUrl = `${window.location.origin}/${shortCode}`
      setDualGeneratedLink(claimUrl)
      showToast("✅ Dual drop created!")

      const session = (await supabase.auth.getSession()).data.session
      const twitterHandle = session?.user?.user_metadata?.user_name || null

      const { error } = await supabase.from('drops').insert({
        twitter_handle: twitterHandle,
        wallet_address: userAddress,
        token: 'DUAL',
        amount_avax: Number(dualAvax),
        amount_usdc: Number(dualUsdc),
        short_code: shortCode,
        number_of_people: Number(dualRecipients),
        claim_url: claimUrl,
        drop_id: dropId
      })

      if (error) console.error('Supabase insert error', error)
    } catch (err) {
      console.error(err)
      alert("Dual drop creation failed")
    } finally {
      setDualLoading(false)
    }
  }

  const handleEnlargeQR = (link) => {
    setEnlargedQRLink(link)
    setShowEnlargedQR(true)
  }

  const closeEnlargedQR = () => {
    setShowEnlargedQR(false)
    setEnlargedQRLink('')
  }

  return (
    <div className="page-wrapper">
      <Navbar />

      {/* SINGLE DROP */}
      <div className="create-link-container">
        <h2>🔗 Create Claim Drop</h2>
        <div className="input-row">
          <select value={token} onChange={e => setToken(e.target.value)}>
            <option value="AVAX">AVAX</option>
            <option value="USDC">USDC</option>
          </select>
          <input type="number" placeholder="Total Amount" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        {!whitelistMode && (
          <div className="input-row">
            <input type="number" placeholder="Number of Claimers" value={recipients} onChange={e => setRecipients(e.target.value)} />
          </div>
        )}
        <label>
          <input type="checkbox" checked={whitelistMode} onChange={() => setWhitelistMode(!whitelistMode)} />
          Enable whitelist mode
        </label>
        {whitelistMode && (
          <textarea placeholder="Whitelist wallet addresses (comma-separated)" value={whitelist} onChange={e => setWhitelist(e.target.value)} />
        )}
        <button onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Link'}
        </button>
      </div>

      {generatedLink && (
        <div className="link-result-box">
          <h3>✅ Your Claim Link</h3>
          <div className="short-url">{generatedLink.slice(0, 32)}...{generatedLink.slice(-6)}</div>
          <button onClick={() => {
            navigator.clipboard.writeText(generatedLink)
            showToast('📋 Link copied to clipboard!')
          }}>📋 Copy Link</button>
          <div className="qr-wrapper">
            <QRCodeCanvas value={generatedLink} size={160} />
          </div>
          <button className="enlarge-button" onClick={() => handleEnlargeQR(generatedLink)}>🔍 Enlarge QR</button>
        </div>
      )}

      {/* DUAL DROP */}
      <div className="create-link-container">
        <h2>💥 Create Dual Token Drop</h2>
        <div className="input-row">
          <input type="number" placeholder="AVAX Amount" value={dualAvax} onChange={e => setDualAvax(e.target.value)} />
          <input type="number" placeholder="USDC Amount" value={dualUsdc} onChange={e => setDualUsdc(e.target.value)} />
        </div>
        <div className="input-row">
          <input type="number" placeholder="Number of Claimers" value={dualRecipients} onChange={e => setDualRecipients(e.target.value)} />
        </div>
        <button onClick={handleDualDrop} disabled={dualLoading}>
          {dualLoading ? 'Creating...' : 'Generate Dual Drop'}
        </button>
      </div>

      {dualGeneratedLink && (
        <div className="link-result-box">
          <h3>✅ Dual Token Drop Link</h3>
          <div className="short-url">{dualGeneratedLink.slice(0, 32)}...{dualGeneratedLink.slice(-6)}</div>
          <button onClick={() => {
            navigator.clipboard.writeText(dualGeneratedLink)
            showToast('📋 Link copied to clipboard!')
          }}>📋 Copy Link</button>
          <div className="qr-wrapper">
            <QRCodeCanvas value={dualGeneratedLink} size={160} />
          </div>
          <button className="enlarge-button" onClick={() => handleEnlargeQR(dualGeneratedLink)}>🔍 Enlarge QR</button>
        </div>
      )}

      {showEnlargedQR && (
        <div className="qr-modal-overlay" onClick={closeEnlargedQR}>
          <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
            <QRCodeCanvas value={enlargedQRLink} size={400} />
            <button className="enlarge-button" onClick={closeEnlargedQR}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}