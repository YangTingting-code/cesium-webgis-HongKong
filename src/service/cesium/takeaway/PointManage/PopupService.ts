import InfoPopup from '../InfoPopup'
import type { NodePoint } from '@/interface/takeaway/interface'
import * as Cesium from 'cesium'

export class PopupService {
  private viewer: Cesium.Viewer
  private popupMap = new Map<string, InfoPopup>()

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  public createPickupPopup(entityId: string, node: NodePoint) {
    const popup = new InfoPopup({
      popupId: entityId + '_popup',
      viewer: this.viewer,
      title: '外卖店',
      entityId,
      pickName: node.tag.name as string,
      opening_hours: node.tag.opening_hours as string,
      phone: node.tag.phone as string,
      cuisine: node.tag.cuisine as string,
      facebook: node.tag['contact:facebook'] as string,
      instagram: node.tag['contact:instagram'] as string,
    })
    this.popupMap.set(entityId, popup)
  }

  public createDropoffPopup(entityId: string, node: NodePoint) {
    const popup = new InfoPopup({
      popupId: entityId + '_popup',
      viewer: this.viewer,
      title: '目的地',
      entityId,
      dropoffName: node.tag.name as string,
      region: node.region,
      building: node.tag.building as string,
      description: node.tag.description as string,
    })
    this.popupMap.set(entityId, popup)
  }

  public toggle(id: string) {
    this.popupMap.get(id)?.toggle()
  }

  public hideAll() {
    this.popupMap.forEach(p => p.hide())
  }

  public showAll() {
    this.popupMap.forEach(p => p.show())
  }

  public clear() {
    this.popupMap.forEach(p => p.destroy())
    this.popupMap.clear()
  }

  public getShowState() {
    const state: Record<string, boolean> = {}
    this.popupMap.forEach((popup, id) => {
      state[id] = popup.getShowState()
    })
    return state
  }

  public restoreState(state: Record<string, boolean>) {
    Object.keys(state).forEach(id => {
      if (state[id]) this.popupMap.get(id)?.show()
    })
  }
}
