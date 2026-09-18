import { useEffect, useState } from 'react'

interface ParentToolsPageProps {
  onDone: () => void
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function formatBytes(value?: number) {
  if (value === undefined) return 'Not available'
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

export function ParentToolsPage({ onDone }: ParentToolsPageProps) {
  const [usage, setUsage] = useState<number>()
  const [quota, setQuota] = useState<number>()
  const [persistent, setPersistent] = useState<boolean | null>(null)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)

  const refreshStorage = async () => {
    if (!navigator.storage) return
    const estimate = await navigator.storage.estimate()
    setUsage(estimate.usage)
    setQuota(estimate.quota)
    setPersistent(await navigator.storage.persisted?.() ?? null)
  }

  useEffect(() => {
    let disposed = false
    if (navigator.storage) {
      void Promise.all([
        navigator.storage.estimate(),
        navigator.storage.persisted?.() ?? Promise.resolve(null),
      ]).then(([estimate, isPersistent]) => {
        if (disposed) return
        setUsage(estimate.usage)
        setQuota(estimate.quota)
        setPersistent(isPersistent)
      })
    }
    const onInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onInstallPrompt)
    return () => {
      disposed = true
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
    }
  }, [])

  const requestPersistence = async () => {
    if (!navigator.storage?.persist) return
    setPersistent(await navigator.storage.persist())
    await refreshStorage()
  }

  return (
    <section className="parent-page" aria-labelledby="parent-title">
      <div className="parent-heading">
        <div>
          <p className="eyebrow">Grown-ups only</p>
          <h1 id="parent-title">Parent Tools</h1>
        </div>
        <button className="secondary-button" type="button" onClick={onDone}>Done</button>
      </div>

      <div className="parent-grid">
        <article className="tool-card storage-card">
          <span className="tool-number" aria-hidden="true">01</span>
          <h2>Keep books safe</h2>
          <p>Books exist only on this tablet. A future full backup will be the safest protection against device loss or cleared browser data.</p>
          <div className="storage-meter" aria-label={`${formatBytes(usage)} used out of ${formatBytes(quota)}`}>
            <span style={{ width: quota && usage ? `${Math.min(100, (usage / quota) * 100)}%` : '0%' }} />
          </div>
          <p className="storage-value">{formatBytes(usage)} used · {formatBytes(quota)} available</p>
          <button className="secondary-button" type="button" onClick={requestPersistence} disabled={!navigator.storage?.persist || persistent === true}>
            {persistent === true ? 'Protected storage requested' : 'Request protected storage'}
          </button>
          {persistent === false && <p className="warning-text">This browser did not grant protected storage. Keep regular backups once backup export is available.</p>}
        </article>

        <article className="tool-card">
          <span className="tool-number" aria-hidden="true">02</span>
          <h2>Install on iPad</h2>
          <ol>
            <li>Open this page in Safari.</li>
            <li>Tap the Share button.</li>
            <li>Choose <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong>.</li>
          </ol>
          <p className="small-note">Open the Home Screen app once while online before testing it offline.</p>
        </article>

        <article className="tool-card">
          <span className="tool-number" aria-hidden="true">03</span>
          <h2>Install on Android</h2>
          <p>Use Chrome's install option, or the button below when it is available.</p>
          <button
            className="primary-button"
            type="button"
            disabled={!installPrompt}
            onClick={async () => {
              if (!installPrompt) return
              await installPrompt.prompt()
              await installPrompt.userChoice
              setInstallPrompt(null)
            }}
          >
            {installPrompt ? 'Install app' : 'Install option not available'}
          </button>
        </article>

        <article className="tool-card decision-card">
          <span className="tool-number" aria-hidden="true">04</span>
          <h2>Protected PDFs</h2>
          <p>Password-protected and unsupported encrypted PDFs are rejected. Unlock the PDF first, then add the unlocked copy.</p>
        </article>
      </div>
    </section>
  )
}
