import { useEffect, useState } from 'react'

export function Home() {
  const [message, setMessage] = useState<string>('Connecting...')

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL

    fetch(`${apiUrl}/`)
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => setMessage('Error: could not connect to backend'))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Hyperwrite AI</h1>
      <p>Backend status: <strong>{message}</strong></p>
    </div>
  )
}