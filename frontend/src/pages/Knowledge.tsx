import './Knowledge.css'

export function Knowledge() {
  return (
    <div className="knowledge-page">
      <div className="knowledge-grid-bg" />
      <div className="glow glow-purple" />
      <div className="glow glow-cyan" />
      <div className="glow glow-pink" />

      <div className="knowledge-content">
        <h1 className="knowledge-title">Knowledge Base</h1>
        <p className="knowledge-description">
          Your knowledge base for storing and retrieving context for AI interactions.
        </p>
        <div className="knowledge-card">
          <div className="placeholder-icon">🧠</div>
          <h2>Coming Soon</h2>
          <p>
            The knowledge base feature is under development. You'll be able to upload documents,
            create collections, and leverage AI-powered search to enhance your writing sessions.
          </p>
          <ul className="feature-list">
            <li>📁 Upload documents (PDF, TXT, Markdown)</li>
            <li>📂 Organize into collections</li>
            <li>🔍 Semantic search across your knowledge</li>
            <li>🤖 Context injection into AI sessions</li>
          </ul>
        </div>
      </div>
    </div>
  )
}