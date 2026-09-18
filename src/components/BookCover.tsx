import { useEffect, useState } from 'react'

interface BookCoverProps {
  cover?: Blob | ArrayBuffer
  title: string
}

export function BookCover({ cover, title }: BookCoverProps) {
  const [source, setSource] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    if (!cover) {
      setSource('')
      return
    }

    const coverBlob = cover instanceof Blob
      ? cover
      : new Blob([cover], { type: 'image/jpeg' })
    const nextSource = URL.createObjectURL(coverBlob)
    setSource(nextSource)
    return () => URL.revokeObjectURL(nextSource)
  }, [cover])

  return source && !failed
    ? <img src={source} alt={`Cover of ${title}`} onError={() => setFailed(true)} />
    : <div className="cover-loading" aria-label={`Cover unavailable for ${title}`} />
}
