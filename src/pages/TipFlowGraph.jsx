import React, { useEffect, useState } from 'react'
import Graph from 'react-vis-network-graph'
import { supabase } from '../utils/supabase'

export default function TipFlowGraph() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })

  useEffect(() => {
    const fetchTips = async () => {
      const { data, error } = await supabase.from('tips').select('*')
      if (error) return console.error(error)

      const nodes = new Set()
      const edges = []

      data.forEach(tip => {
        if (tip.author_handle && tip.recipient_handle) {
          nodes.add(tip.author_handle)
          nodes.add(tip.recipient_handle)
          edges.push({
            from: tip.author_handle,
            to: tip.recipient_handle,
            label: `${tip.token}: ${tip.amount}`
          })
        }
      })

      setGraphData({
        nodes: Array.from(nodes).map(id => ({ id, label: id })),
        edges
      })
    }

    fetchTips()
  }, [])

  const graphOptions = {
    height: '100%',
    width: '100%',
    nodes: {
      shape: 'dot',
      size: 10,
      font: { size: 14 },
      color: '#ff4d4d'
    },
    edges: {
      arrows: 'to',
      color: '#ff4d4d',
      smooth: true
    },
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based'
    }
  }

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <Graph
        graph={graphData}
        options={graphOptions}
      />
    </div>
  )
}