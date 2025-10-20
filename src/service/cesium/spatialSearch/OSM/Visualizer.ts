import type { Category } from '@/interface/globalInterface';
import { createHighlightManager } from '@/utils/toolbar/spatialSearch/manageOSMHighlight';
import { Cesium3DTileset } from 'cesium';
import { createBuildingGlowShader } from "@/utils/toolbar/spatialSearch/BuildingShader";
export class Visualizer {
  private highlight;
  private tileset: Cesium3DTileset;

  constructor(tileset: Cesium3DTileset) {
    this.tileset = tileset
    // this.tileset.customShader = createBuildingGlowShader()
    this.highlight = createHighlightManager(tileset);

  }
  highlightBuilding(
    pinEntityId: string,
    categoryIds: Record<Category, number[]>
  ) {
    this.highlight.setCategoryIds(pinEntityId, categoryIds);
  }
  clearHighLightById(pinEntityId: string) {
    this.highlight.removeCategoryIds(pinEntityId);
  }
  clearAll() {
    this.highlight.removeAllCategories();
  }
  destroy() { }
}
