import * as Cesium from 'cesium';
import { createApp, ref } from 'vue'
import Popup from '@/components/takeaway/Popup.vue'
import { BasePopup } from '../popup/BasePopup'

interface PopupOptions {
  popupId: string
  title: string
  viewer: Cesium.Viewer
  entityId: string
  pickName?: string
  opening_hours?: string
  phone?: string
  cuisine?: string
  facebook?: string
  instagram?: string

  //送货点
  dropoffName?: string,
  region?: string,
  building?: string,
  description?: string

}
export class InfoPopup extends BasePopup {
  private popupId: string
  private title: string
  private pickName: string | undefined
  private opening_hours: string | undefined
  private phone: string | undefined
  private cuisine: string | undefined
  private facebook: string | undefined
  private instagram: string | undefined
  private dropoffName: string | undefined
  private building: string | undefined
  private description: string | undefined
  private region: string | undefined

  constructor(option: PopupOptions) {
    super(option.viewer, option.entityId, ref(false))
    this.popupId = option.entityId
    this.title = option.title
    this.pickName = option.pickName
    this.opening_hours = option.opening_hours
    this.phone = option.phone
    this.cuisine = option.cuisine
    this.facebook = option.facebook
    this.instagram = option.instagram
    this.dropoffName = option.dropoffName
    this.building = option.building
    this.description = option.description
    this.region = option.region
    this.mountContent()
  }

  mountContent() {
    createApp(Popup, {
      title: this.title,
      showRef: this.showRef,
      popupId: this.popupId,
      options: {
        pickName: this?.pickName,
        openinghours: this?.opening_hours,
        phone: this?.phone,
        cuisine: this?.cuisine,
        facebook: this?.facebook,
        instagram: this?.instagram,

        //送货点
        dropoffName: this?.dropoffName,
        building: this?.building,
        description: this?.description,
        region: this?.region
      },

    }).mount(this.div)
  }

  public getShowState(): boolean { //弹窗是否显示
    return this.showRef.value
  }

}