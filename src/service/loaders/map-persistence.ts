type Json = any

const read = (key: string) => {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return
  }
}
const write = (key: string, val: Json) => {
  sessionStorage.setItem(key, JSON.stringify(val))
}

const del = (key: string) => {
  sessionStorage.removeItem(key)
}

const MAPSTYLE_KEY = 'current-mapId'

export const mapPersistence = {
  getMapstyle() {
    return read(MAPSTYLE_KEY)
  },
  setMapstyle(val: Json) {
    write(MAPSTYLE_KEY, val)
  },
  delMapstyle() {
    del(MAPSTYLE_KEY)
  },

}