export function Knowledge() {
  return (
    <div className="page-container">
      <h1>Knowledge Base</h1>
      <p className="page-description">
        Your knowledge base for storing and retrieving context for AI interactions.
      </p>
      <div className="knowledge-placeholder">
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
  )
}