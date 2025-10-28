import type { NodePoint, BuildingPolygon, DeliveryNodes } from '@/interface/takeaway'

//找出外卖店
export function isDeliveryShop(nodePoints: NodePoint[]) {
  const deliveryPoints: NodePoint[] = []
  nodePoints.forEach(n => {
    if (n.maintype === 'Sustenance' || n.maintype === 'Food,beverages')
      deliveryPoints.push(n)
  })
  return deliveryPoints
}

//定义同义词 → 统一名称
const categoryAliasMap: Record<string, string> = {
  // ☕ 咖啡类
  coffee: 'cafe',
  cafe: 'cafe',
  tea: 'cafe',
  beverages: 'cafe',
  dairy: 'cafe',

  // 🍞 烘焙类
  bakery: 'bakery',
  pastry: 'bakery',
  confectionery: 'bakery',
  chocolate: 'bakery',
  dessert: 'bakery',

  // 🍽️ 餐饮类
  sustenance: 'restaurant',
  restaurant: 'restaurant',
  fastfood: 'restaurant',
  fast_food: 'restaurant',
  biergarten: 'restaurant',
  deli: 'restaurant',
  pasta: 'restaurant',
  seafood: 'restaurant',

  // 🍲 食材/农产品
  butcher: 'grocery',
  cheese: 'grocery',
  farm: 'grocery',
  food: 'grocery',
  greengrocer: 'grocery',
  spices: 'grocery',
  nuts: 'grocery',
  tortilla: 'grocery',

  // 🌃 夜宵/便利/酒类
  alcohol: 'bar',
  wine: 'bar',
  bar: 'bar',
  pub: 'bar',
  brewing_supplies: 'bar',
  convenience: 'convenience',
  frozen_food: 'convenience'
}

export function classifyDeliveryNodes(
  timeSlot: number,
  nodePoints: NodePoint[],
  buildingPolygons: BuildingPolygon[]
): DeliveryNodes {
  // === Step 1. 定义品类映射表（取餐点类型） ===
  const pickupCategoryMap: Record<string, string[]> = {
    // 早晨：咖啡、面包、轻食 // 7点到10点 （取9点）
    morning: [
      'coffee', 'cafe', 'bakery', 'pastry',
      'tea', 'dairy', 'confectionery', 'greengrocer'
    ],
    // 午餐：正餐、快餐、餐馆 // 10点到14点 （取12点）
    lunch: [
      'sustenance', 'fastfood', 'fast_food', 'restaurant', 'biergarten', 'farm',
      'butcher', 'cheese', 'deli', 'food', 'health_food', 'pasta', 'seafood', 'spices', 'tortilla', 'water',
    ],
    // 下午茶：咖啡、甜点、奶茶、冰淇淋 //14点到17点 （取16点）
    afternoon: [
      'coffee', 'cafe', 'beverages', 'dessert',
      'ice_cream', 'chocolate', 'pastry', 'tea', 'nuts'
    ],
    // 晚餐：正餐、快餐、餐馆 //17点到20点 （取18点）
    dinner: [
      'fastfood', 'fast_food', 'restaurant', 'biergarten',
      'butcher', 'cheese', 'deli', 'farm', 'food',
      'greengrocer', 'pasta', 'seafood', 'spices'
    ],
    // 深夜：酒类、便利店、夜宵 //20点到24点 （取22点）
    lateNight: [
      'alcohol', 'wine', 'bar', 'pub', 'brewing_supplies',
      'convenience', 'frozen_food', 'beverages',
      'bakery', 'nuts'// 有些人买夜宵点心
    ],
  };

  // === Step 2. 根据时间段选择候选品类 ===
  let pickupCategories: string[] = [];
  let targetSceneTypes: BuildingPolygon['sceneType'][] = [];
  let targetNodePoints: string[] = [] // nodePoint.type
  if (timeSlot >= 7 && timeSlot < 10) {
    pickupCategories = pickupCategoryMap.morning;
    targetSceneTypes = ['residentialArea'];
    targetNodePoints = ['Financial'] //amenity中属于办公的
  } else if (timeSlot >= 11 && timeSlot < 14) {
    pickupCategories = pickupCategoryMap.lunch;
    targetSceneTypes = ['residentialArea'];
    targetNodePoints = ['Financial', 'Education']
  } else if (timeSlot >= 14 && timeSlot < 17) {
    pickupCategories = pickupCategoryMap.afternoon;
    targetSceneTypes = ['residentialArea'];
    targetNodePoints = ['Financial', 'Education']
  } else if (timeSlot >= 17 && timeSlot < 20) {
    pickupCategories = pickupCategoryMap.dinner;
    targetSceneTypes = ['residentialArea'];
    targetNodePoints = ['Education']
  } else if (timeSlot >= 20 && timeSlot <= 24) {
    pickupCategories = pickupCategoryMap.lateNight;
    targetSceneTypes = ['residentialArea'];
  } else {
    pickupCategories = pickupCategoryMap.lateNight;
    targetSceneTypes = ['residentialArea'];
  }

  // === Step 3. 筛选取餐点 === 不筛选的话不止外卖店还有其他点
  const pickupNodes: NodePoint[] = nodePoints
    .map(n => {
      if (!n.maintype) return null
      const rawSub = n.subtype.toLowerCase() //获取取餐点的 subtype
      // 从pickupCategories 中找到对应的种类
      const matched = pickupCategories.find(cat => rawSub.includes(cat))
      if (!matched) return null //没有匹配上
      const normalized = categoryAliasMap[matched] || matched
      return {
        ...n,
        category: normalized
      }
    })
    .filter((n): n is NodePoint => Boolean(n))

  // === Step 4. 筛选送货点（建筑质心） ===
  const dropoffNodes: NodePoint[] = buildingPolygons
    .filter((b) => targetSceneTypes.includes(b.sceneType))
    .map((b) => {
      return {
        id: b.id,
        type: b.sceneType,
        tag: b.tag,
        region: b.region,
        lng: b.centroid?.lng, // 这里你原来写错了，lat/lng要分开
        lat: b.centroid?.lat
      } as NodePoint;
    });
  nodePoints.forEach(nodePoint => {
    if (targetNodePoints.includes(nodePoint.maintype))
      dropoffNodes.push(nodePoint)
  })
  if (timeSlot >= 7 && timeSlot < 17) { //在这个时间段这个收货点才成立
    dropoffNodes.push(...nodePoints.filter(n => n.type === 'office'))
  }
  console.log("nodePoints.filter(n=>n.type === 'office')", nodePoints.filter(n => n.type === 'office'))
  return { pickupNodes, dropoffNodes };
}


