import { useEffect, useState } from 'react'
import styles from './App.module.css'

function App() {
  const [message, setMessage] = useState<string>('Connecting...')

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL

    fetch(`${apiUrl}/`)
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(() => setMessage('Error: could not connect to backend'))
  }, [])

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Hyperwrite AI</h1>
      <p className={styles.status}>Backend status: <strong>{message}</strong></p>
    </div>
  )
}

export default App
