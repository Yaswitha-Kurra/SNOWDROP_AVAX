const SUPABASE_URL = 'https://vavrqhflogjkxnsphdhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnJxaGZsb2dqa3huc3BoZGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTg0OTYsImV4cCI6MjA2ODgzNDQ5Nn0.g9-9Pe_KXWCWqENEvgtmtFBVm64dRKM9slQrhdYU_lQ'; // 👈 Replace with your real anon key
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const twitterHandle = 'PraneethaCheru1'; // 👈 Change if needed

fetch(`${SUPABASE_URL}/rest/v1/tips?author_handle=eq.${twitterHandle}&claimed=is.false&select=amount,token`, {
  method: 'GET',
  headers,
})
  .then(res => res.json())
  .then(data => {
    const totals = { AVAX: 0, USDC: 0 };
    data.forEach(tip => {
      const token = (tip.token || '').toUpperCase();
      const amt = Number(tip.amount || 0);
      if (token === 'AVAX') totals.AVAX += amt;
      else if (token === 'USDC') totals.USDC += amt;
    });
    console.log("✅ Fetched Tips:", totals);
  })
  .catch(err => console.error("❌ Fetch Error:", err));



  