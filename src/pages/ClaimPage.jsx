import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ethers } from 'ethers'
import { supabase } from '../utils/supabase'
import './ClaimPage.css'
import Navbar from './Navbar'

export default function ClaimPage() {
  const { dropId } = useParams()
  const [wallet, setWallet] = useState(null)
  const [status, setStatus] = useState('🔄 Checking drop status...')
  const [canClaim, setCanClaim] = useState(false)
  const [loading, setLoading] = useState(true)
  const [txHash, setTxHash] = useState(null)
  const [claimCount, setClaimCount] = useState(0)
  const [maxClaims, setMaxClaims] = useState(1)

  const contractAddress = '0xe154F4963d28e4Aa690d804c5928efE0b496DaDB'
  const abi = [
    {
      inputs: [{ internalType: 'bytes32', name: 'dropId', type: 'bytes32' }],
      name: 'claim',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    }
  ]

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' })
        setWallet(addr)
      } catch (err) {
        console.error('Wallet connection error', err)
      }
    } else {
      alert('Please install MetaMask!')
    }
  }

  useEffect(() => {
    const checkExistingConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setWallet(accounts[0])
        }
      }
    }
    checkExistingConnection()
  }, [])

  useEffect(() => {
    async function init() {
      if (!dropId) {
        setStatus('❌ Invalid drop link.')
        setLoading(false)
        return
      }

      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        await provider.send('eth_requestAccounts', [])
        const signer = provider.getSigner()
        const userAddr = (await signer.getAddress()).toLowerCase()
        setWallet(userAddr)

        // 🔍 Get drop details
        const { data: dropData, error } = await supabase
          .from('drops')
          .select('*')
          .eq('drop_id', dropId)
          .maybeSingle()

        if (error || !dropData) {
          setStatus('❌ Drop not found')
          setLoading(false)
          return
        }

        const isWhitelist = dropData.whitelist && dropData.whitelist.length > 0
        const max = dropData.number_of_people || dropData.num_recipients || 1
        setMaxClaims(max)

        // ✅ Whitelist check
        if (isWhitelist) {
          const whitelist = dropData.whitelist.map(a => a.toLowerCase())
          if (!whitelist.includes(userAddr)) {
            setStatus('❌ You are not whitelisted for this drop.')
            setLoading(false)
            return
          }
        }

        // 🔢 Total claims made
        const { count: totalClaims } = await supabase
          .from('claims')
          .select('*', { count: 'exact', head: true })
          .eq('drop_id', dropId)

        setClaimCount(totalClaims || 0)

        // 🔁 Already claimed?
        const { data: existingClaim } = await supabase
          .from('claims')
          .select('tx_hash')
          .eq('drop_id', dropId)
          .eq('wallet_address', userAddr)
          .maybeSingle()

        if (existingClaim) {
          setTxHash(existingClaim.tx_hash)
          setStatus('✅ Tokens already claimed')
          setCanClaim(false)
          return
        }

        // ❌ Max reached
        if ((totalClaims || 0) >= max) {
          setStatus('❌ This drop has reached its claim limit.')
          setCanClaim(false)
          return
        }

        // ✅ All good
        setStatus('🔓 Ready to claim')
        setCanClaim(true)
      } catch (err) {
        console.error(err)
        setStatus('❌ Error: ' + (err.message || 'unknown error'))
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [dropId])

  const handleClaim = async () => {
    try {
      setStatus('⏳ Claiming...')
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const contract = new ethers.Contract(contractAddress, abi, signer)
      const tx = await contract.claim(dropId)
      await tx.wait()

      await supabase.from('claims').insert({
        drop_id: dropId,
        wallet_address: wallet.toLowerCase(),
        tx_hash: tx.hash
      })

      setTxHash(tx.hash)
      setStatus('✅ Successfully claimed!')
      setCanClaim(false)
      setClaimCount(prev => prev + 1)
    } catch (err) {
      console.error(err)
      setStatus('❌ Claim failed: ' + (err.reason || err.message))
    }
  }

  return (
    <div className="claim-wrapper">
      <Navbar />
      <div className="claim-box">
        <h2 className="claim-title">🎁 Claim Your Tokens</h2>

        {!wallet && !loading && (
          <>
            <div className="claim-status">🦊 Please connect your wallet</div>
            <button className="claim-button" onClick={connectWallet}>🔌 Connect Wallet</button>
          </>
        )}

        {wallet && canClaim && (
          <>
            <div className="claim-status">{status}</div>
            <button className="claim-button" onClick={handleClaim}>🚀 Claim Now</button>
          </>
        )}

        {wallet && !canClaim && !loading && (
          <div className="claim-success">{status}</div>
        )}

        {txHash && (
          <div style={{ marginTop: '10px', fontSize: '14px' }}>
            <a href={`https://testnet.snowtrace.io/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: '#00ff99' }}>
              🔗 View Transaction
            </a>
          </div>
        )}

        {!loading && (
          <div style={{ marginTop: '20px', color: '#bbb', fontSize: '14px' }}>
            🎯 {claimCount} of {maxClaims} claims used
          </div>
        )}
      </div>
    </div>
  )
}
