class IntersectObserver {
  entries = {}
  observer

  constructor() {
    this.observer = new IntersectionObserver(this.onElementObserved, {
      threshold: 0.0,
    })
  }

  observe(id, el, methodIn, methodOut) {
    this.entries[id] = { el, methodIn, methodOut }

    this.observer.observe(el)
  }

  unobserve(id, el) {
    this.observer.unobserve(el)
    delete this.entries[id]
  }

  onElementObserved = (entries) => {
    entries.forEach((entry) => {
      const id = entry.target.dataset.intersectId

      if (id && this.entries[id]) {
        if (entry.isIntersecting) {
          this.entries[id].methodIn(entry)
        } else {
          this.entries[id].methodOut(entry)
        }
      }
    })
  }
}

export default new IntersectObserver()
