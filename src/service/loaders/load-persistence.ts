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
const REGION_KEY = 'current-region'

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

export const regionPersistance = {
  getRegion() {
    return read(REGION_KEY)
  },
  setRegion(val: Json) {
    write(REGION_KEY, val)
  },
  delRegion() {
    del(REGION_KEY)
  },
}