import * as Cesium from 'cesium'
import type { NodePoint } from '@/interface/takeaway/interface'

export class PinRenderService {
  private viewer: Cesium.Viewer
  private pickupIds: string[] = []
  private dropoffIds: string[] = []

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  public createPin(
    id: string,
    position: [number, number],
    color: Cesium.Color,
    label: string
  ): Cesium.Entity {
    const pin = new Cesium.PinBuilder().fromText(label, color, 48).toDataURL()
    const entity = new Cesium.Entity({
      id,
      position: Cesium.Cartesian3.fromDegrees(position[0], position[1]),
      billboard: {
        image: pin,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -20),
      },
    })
    this.viewer.entities.add(entity)
    return entity
  }

  public drawPickup(index: number, node: NodePoint): string {
    const id = `pickup${index}`
    this.createPin(id, [node.lng, node.lat], Cesium.Color.GREEN, `${index + 1}`)
    this.pickupIds.push(id)
    return id
  }

  public drawDropoff(index: number, node: NodePoint): string {
    const id = `dropoff${index}`
    this.createPin(id, [node.lng, node.lat], Cesium.Color.RED, `${index + 1}`)
    this.dropoffIds.push(id)
    return id
  }

  public clear() {
    [...this.pickupIds, ...this.dropoffIds].forEach(id => {
      this.viewer.entities.removeById(id)
    })
    this.pickupIds = []
    this.dropoffIds = []
  }

  public getAllIds() {
    return [...this.pickupIds, ...this.dropoffIds]
  }
}
