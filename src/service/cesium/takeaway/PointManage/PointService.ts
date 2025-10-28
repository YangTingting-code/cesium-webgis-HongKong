import * as Cesium from 'cesium'
import type { DeliveryOrder } from '@/interface/takeaway/interface'
import { PinRenderService } from './PinRenderService'
import { PopupService } from './PopupService'
import { InteractionService } from './InteractionService'

export class PointService {
  private pinRender: PinRenderService
  private popup: PopupService
  private interaction: InteractionService
  private orders: DeliveryOrder[]
  constructor(viewer: Cesium.Viewer, orders: DeliveryOrder[]) {
    this.orders = orders
    this.pinRender = new PinRenderService(viewer)
    this.popup = new PopupService(viewer)
    this.interaction = new InteractionService(viewer, this.popup, this.pinRender)
  }

  public async drawCombinedStops() {
    for (let i = 0; i < this.orders.length; i++) {
      const order = this.orders[i]
      const pickupId = this.pinRender.drawPickup(i, order.pickupNodes[0])
      const dropoffId = this.pinRender.drawDropoff(i, order.dropoffNodes[0])
      this.popup.createPickupPopup(pickupId, order.pickupNodes[0])
      this.popup.createDropoffPopup(dropoffId, order.dropoffNodes[0])
    }
    this.interaction.bind()
  }

  public clear() {
    this.interaction.unbind()
    this.popup.clear()
    this.pinRender.clear()
  }

  public getPopupState() {
    return this.popup.getShowState()
  }

  public reshowPopup(state: Record<string, boolean>) {
    this.popup.restoreState(state)
  }

  public hidePopups() {
    this.popup.hideAll()
  }

  public showPopups() {
    this.popup.showAll()
  }

  public hasEntity(): boolean {
    return this.pinRender.getAllIds().length > 0
  }
}
