import { useEffect } from 'react'

export default function useScrollTop(dependency) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [dependency])
}
