import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'

export default function ClaimRedirect() {
  const { shortCode } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const resolveDrop = async () => {
      const { data, error } = await supabase
        .from('drops')
        .select('drop_id')
        .eq('short_code', shortCode)
        .maybeSingle()

      if (data?.drop_id) {
        navigate(`/claim/${data.drop_id}`)
      } else {
        alert("❌ Drop not found.")
      }
    }

    resolveDrop()
  }, [shortCode])

  return <div style={{ padding: 20 }}>⏳ Resolving drop...</div>
}
