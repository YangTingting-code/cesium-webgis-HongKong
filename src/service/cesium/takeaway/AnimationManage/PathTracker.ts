//PathTracker 是“路径状态协调者”，PathService 是“路径执行者”。
import type { SegmentType, CombinedOrder } from '@/interface/takeaway/interface'
import { type PathService } from '@/service/cesium/takeaway/PathManage/PathService'
import { ScenePersistence } from '../SceneManage/ScenePersistence'

export class PathTracker {
  private pathService
  private currentSegs: number[] = []
  // private lastCurrentSegs: number[] = []
  // private isDataReload: boolean = false
  private cumD: number = 0

  // private bucketStore = useBucketStore()

  constructor(pathService: PathService) {
    this.pathService = pathService
  }

  public setPathData(order: CombinedOrder, perStepSegments: Record<string, SegmentType[]>) {
    this.pathService.setPathData(order, perStepSegments)
  }

  public isSetCamera() {
    if (ScenePersistence.getIsPath() &&
      !(ScenePersistence.getLastElapsed() > 0)
    ) {
      this.pathService.setCameraByRiderPosOri()
    }
  }


  public updateFrame(isBack: boolean) {
    const buckets = this.pathService.getSegmentBuckets(this.cumD, isBack)

    if (buckets) {
      this.pathService.applySegmentBuckets(buckets)
      // this.bucketStore.updateBuckets(buckets)

      if (buckets.currentSegs?.length) {
        if (buckets.currentSegs.length > 0)
          this.currentSegs = buckets.currentSegs
      }
    }

    if (this.currentSegs.length > 0) {
      //更新动态线位置
      this.pathService.updatePathProgressByDistance(this.cumD, this.currentSegs)
    }

  }

  public updateRiderPosition(isRestore: boolean) {
    if (isRestore) {
      this.pathService.updateRiderPosOriBySession()
    } else {
      this.pathService.updateRiderPosOri()
    }
  }

  public getCumDistance(elapsed: number) {
    this.cumD = this.pathService.getCumDistance(elapsed)
    return this.cumD
  }



  public reset() { //在清除的时候重置
    this.currentSegs = []
    // this.lastCurrentSegs = []
    this.cumD = 0
    // this.isDataReload = false
  }
}