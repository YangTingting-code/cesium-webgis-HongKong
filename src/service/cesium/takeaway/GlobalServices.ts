import type { PathService } from '@/service/cesium/takeaway/PathManage/PathService'
import type { AnimationService } from '@/service/cesium/takeaway/AnimationManage/AnimationService'
import type { PointService } from '@/service/cesium/takeaway/PointManage/PointService'

//统一管理全局的Cesium 服务实例
export const GlobalServices = {
  pathService: null as PathService | null,
  animationService: null as AnimationService | null,
  pointService: null as PointService | null,
}

//提供初始化注册函数
export function registerServices(services: {
  pathService: PathService | null,
  animationService: AnimationService | null,
  pointService: PointService | null,
}) {
  GlobalServices.pathService = services.pathService
  GlobalServices.animationService = services.animationService
  GlobalServices.pointService = services.pointService
}

//清除注册
export function clearServices() {
  GlobalServices.pathService = null
  GlobalServices.animationService = null
  GlobalServices.pointService = null
}