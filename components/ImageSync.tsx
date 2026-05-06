import React, { useState } from 'react';

type AuthMode = 'cookie' | 'token';

export default function ImageSync() {
  const [authMode, setAuthMode] = useState<AuthMode>('cookie');
  const [authValue, setAuthValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    if (!authValue.trim()) {
      setStatus('error');
      setMessage(`Please paste your Collectr ${authMode === 'cookie' ? 'cookie' : 'Bearer token'}.`);
      return;
    }

    setStatus('loading');
    setMessage('Syncing images from Collectr showcase...');

    try {
      const body = authMode === 'cookie'
        ? { cookie: authValue.trim() }
        : { token: authValue.trim() };

      const res = await fetch('/api/syncCollectrImages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Sync failed. Try the other auth method.');
        return;
      }

      setStatus('success');
      setMessage(
        `Synced ${data.synced} cards${data.skipped > 0 ? ` (${data.skipped} skipped)` : ''}.`
      );
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Network error.');
    }
  };

  const statusColor =
    status === 'success' ? '#4caf50' :
    status === 'error' ? '#ef5350' :
    '#aaaaaa';

  const placeholder = authMode === 'cookie'
    ? 'Paste the full cookie string from DevTools (e.g. _ga=...; session=...)'
    : 'Paste Bearer token (eyJ...)';

  const hint = authMode === 'cookie'
    ? 'In DevTools → Network → click any Collectr API request → Headers → Request Headers → copy the "cookie:" value'
    : 'In DevTools → Network → click any Collectr API request → Headers → look for "authorization: Bearer ..."';

  return (
    <div
      style={{
        backgroundColor: '#1e1e1e',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
      }}
    >
      <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '8px', fontSize: '15px' }}>
        Sync Card Images
      </h3>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        {(['cookie', 'token'] as AuthMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => { setAuthMode(mode); setAuthValue(''); setMessage(''); setStatus('idle'); }}
            style={{
              padding: '5px 14px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              backgroundColor: authMode === mode ? '#00897b' : '#333',
              color: '#fff',
            }}
          >
            {mode === 'cookie' ? 'Cookie' : 'Bearer Token'}
          </button>
        ))}
      </div>

      <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px 0' }}>{hint}</p>

      <textarea
        value={authValue}
        onChange={(e) => setAuthValue(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{
          width: '100%',
          backgroundColor: '#2a2a2a',
          color: '#ffffff',
          border: '1px solid #444',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={handleSync}
          disabled={status === 'loading'}
          style={{
            background: status === 'loading' ? '#555' : 'linear-gradient(135deg, #00695c, #00897b)',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {status === 'loading' ? 'Syncing...' : 'Sync Images'}
        </button>
        {message && <span style={{ color: statusColor, fontSize: '13px' }}>{message}</span>}
      </div>
    </div>
  );
}
