import { useEffect } from 'react'

function useScrollTop(dependency) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [dependency])
}

export default useScrollTop
