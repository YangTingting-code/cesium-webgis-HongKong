import * as Cesium from 'cesium';

/**
 * 批量高亮管理器
 */

export function createHighlightManager(tileset: Cesium.Cesium3DTileset) {
  /* const baseConds: [string, string][] = [
    ["${building} === 'commercial'", "color('gold')"],
    ["${building} === 'retail'", "color('red')"],
    ["${building} === 'supermarket'", "color('yellow')"],
    ['true', "color('white', 0.7)"],
  ]; */

  const categoryColors: Record<string, string> = {
    commercial: 'orange', // 商业区：亮橙色，活力感强
    accommodation: 'royalblue', // 住宿：皇家蓝，稳重干净
    civic: 'mediumseagreen', // 公共设施：海绿色，清爽自然
    transportation: 'crimson', // 交通：深红色，醒目警示
  };
  //用图钉图标的id区分开来
  const highlightedIds: Record<string, Record<string, number[]>> = {};

  //更新样式
  function updateStyle() {
    const conditions: [string, string][] = [];
    //遍历所有圆圈的id 关键是这里 所有圆圈的id都被处理了！
    for (const entityId in highlightedIds) {
      const currentIdObj = highlightedIds[entityId];
      for (const category in currentIdObj) {
        currentIdObj[category].forEach((id) => {
          conditions.push([
            `\${elementId} === ${id}`,
            //按照当前种类赋予颜色
            `color('${categoryColors[category]}',0.8)`,
          ]);
        });
      }
    }
    // 默认颜色
    conditions.push(['true', "color('white', 1)"]);
    tileset.style = new Cesium.Cesium3DTileStyle({
      color: { conditions },
    });
  }




  return {
    /**
     * 批量设置高亮
     * @param entityId
     * @param categoryIds
     */
    //更新高亮建筑id
    setCategoryIds(entityId: string, categoryIds: Record<string, number[]>) {
      //初始化 一开始是undefined
      if (!highlightedIds[entityId]) {
        highlightedIds[entityId] = {};
      }

      Object.keys(categoryIds).forEach((key) => {
        highlightedIds[entityId][key] = categoryIds[key];
      });

      //改成全局刷新 不只是刷新当前的圆
      updateStyle();
    },
    /**
     * 清空高亮 删除某个圆的时候清除那个圆圈的建筑id
     * @param entity 可选，指定清空某类，默认清空全部
     */
    removeCategoryIds(entity: string) {
      delete highlightedIds[entity];
      updateStyle();
    },
    /**
     * 一键清空所有高亮
     */
    removeAllCategories() {
      // 1. 清空内存
      for (const key in highlightedIds) {
        delete highlightedIds[key];
      }
      // 2. 刷回默认样式
      updateStyle();
      /* tileset.style = new Cesium.Cesium3DTileStyle({
        color: {
          conditions: [['true', "color('white', 1)"]],
        },
      }); */
    },
  };
}
