import { useEffect, useState } from 'react'

interface BookCoverProps {
  cover: Blob
  title: string
}

export function BookCover({ cover, title }: BookCoverProps) {
  const [source] = useState(() => URL.createObjectURL(cover))

  useEffect(() => {
    return () => URL.revokeObjectURL(source)
  }, [source])

  return source ? <img src={source} alt={`Cover of ${title}`} /> : <div className="cover-loading" />
}
