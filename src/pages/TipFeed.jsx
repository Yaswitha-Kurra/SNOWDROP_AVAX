import { useEffect, useState } from "react"
import "./TipFeed.css"

const SUPABASE_URL = 'https://vavrqhflogjkxnsphdhh.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnJxaGZsb2dqa3huc3BoZGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTg0OTYsImV4cCI6MjA2ODgzNDQ5Nn0.g9-9Pe_KXWCWqENEvgtmtFBVm64dRKM9slQrhdYU_lQ' // 🔁 replace with your real key

export default function TipFeed() {
  const [tips, setTips] = useState([])

  useEffect(() => {
    fetchTips()
  }, [])

  const fetchTips = async () => {
    const tipsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tips?select=author_handle,tweet_id,created_at,sender_wallet,amount,token&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    )

    const walletsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/wallets?select=wallet_address,twitter_handle,avatar_url`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    )

    const tips = await tipsRes.json()
    const wallets = await walletsRes.json()
    const map = {}
    wallets.forEach((w) => {
      map[w.wallet_address.toLowerCase()] = {
        handle: w.twitter_handle,
        avatar: w.avatar_url,
      }
    })

    const final = tips.map((tip) => {
      const sender = map[tip.sender_wallet.toLowerCase()]
      const receiver = Object.values(map).find((w) => w.handle === tip.author_handle)
      return {
        ...tip,
        senderHandle: sender?.handle || tip.sender_wallet.slice(0, 6) + "...",
        senderAvatar:
          sender?.avatar ||
          "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png",
        receiverAvatar:
          receiver?.avatar ||
          "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png",
      }
    })

    setTips(final)
  }

  return (
    <div className="tip-feed">
      <h2 className="tip-feed-title">📡 Live Tip Feed</h2>
      <div className="tip-feed-container">
        {tips.map((tip, index) => (
          <div className="tip-card" key={index}>
            <div className="tip-row">
              <img src={tip.senderAvatar} alt="sender" />
              <span><strong>@{tip.senderHandle}</strong> →</span>
              <img src={tip.receiverAvatar} alt="receiver" />
              <span><strong>@{tip.author_handle}</strong></span>
            </div>
            <div className="tweet-link">
              <a
                href={`https://twitter.com/${tip.author_handle}/status/${tip.tweet_id}`}
                target="_blank"
                rel="noreferrer"
              >
                View Post →
              </a>
            </div>
            <div className="timestamp">
              {new Date(tip.created_at).toLocaleString()} — 💸 {Number(tip.amount).toFixed(3)}{" "}
              {tip.token?.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
