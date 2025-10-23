import { defineStore } from 'pinia'

export const useRegionStore = defineStore('regionStore', {
  state: () => ({
    currRegions: ['九龙城区'] as string[],
    lastRegions: [] as string[],

  }),
  actions: {
    updateRegion(regions: string[]) {
      if (regions.length < 1) return
      this.lastRegions = this.currRegions
      this.currRegions = regions
    },
  }

})