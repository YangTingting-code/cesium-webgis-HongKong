//外卖店
export interface NodePoint {
  id: number;
  type: 'shop' | 'amenity' | 'office' | 'station'; // shop/amenity/office 这里可以修改
  maintype: string; //比如说amenity里面有多种  amenity:
  subtype: string; // cafe/restaurant/post_office
  lat: number;
  lng: number;
  tag: Record<string, unknown>;
  region: string;
  baseOrderCount?: number; // 基础订单量 外卖店才有基础订单量 哪些是外卖店？ amenity ： Sustenance，shop ："Food,beverages" 这两种
  orders?: number; // 当前订单量
}


export interface BuildingPolygon {
  id: number;
  buildingType: string;
  sceneType: string;
  geometry: Array<{ lat: number; lng: number }>;
  functionNodes: NodePoint[]; // 内部功能点
  tag: Record<string, unknown>; //建筑信息
  basePeople?: number; // 整栋建筑人流 根据时间和建筑信息设置人流
  area?: number | null; //缓存面积 方便计算人流
  centroid?: { lng: number; lat: number } | null; //缓存质心，方便生成人流点位
  region: string
}

export const amenityRules = {
  //外卖
  "Sustenance": [
    //食物
    'bar', //晚上单多
    'biergarten', //中午和晚上单多
    'cafe', //上午和下午单多
    'fast_food', //中午和晚上单多
    'ice_cream', //下午单多
    'pub', //晚上单多
    'restaurant', //可以外卖堂食 午间和晚高峰单多
  ],
  "Education": [
    'university',
    'college',
    'dancing_school',
    'driving_school',
    'first_aid_school',
    'kindergarten',
    'language_school',
    'library',
    'surf_school',
    'toy_library',
    'school',
    'music_school',
    'training',
    'school',
    'traffic_park',
  ],
  "Transportation": ['bus_station', 'taxi', 'ferry_terminal'],
  //外卖
  "Financial": [
    'atm',
    'bank', //银行上班有午餐外卖多
    'payment_terminal',
    'bureau_de_change',
    'money_transfer',
    'payment_centre',
  ],
  "Healthcare": [
    'baby_hatch',
    'clinic',
    'dentist',
    'doctors',
    'hospital',
    'nursing_home',
    'pharmacy',
    'social_facility',
    'veterinary',
  ],
  'Entertainment,Arts,Culture': [
    'arts_centre',
    'brothel',
    'casino',
    'cinema',
    'community_centre',
    'conference_centre',
    'events_venue',
    'exhibition_centre',
    'fountain',
    'gambling',
    'love_hotel',
    'music_venue',
    'nightclub',
    'planetarium',
    'public_bookcase',
    'social_centre',
    'stage',
    'stripclub',
    'studio',
    'swingerclub',
    'theatre',
  ],
  'Public Service': [
    'courthouse',
    'fire_station',
    'police',
    'post_box',
    'post_depot',
    'post_office',
    'prison',
    'ranger_station',
    'townhall',
  ],
  "Facilities": [
    'bbq',
    'bench',
    'bench',
    'dog_toilet',
    'dressing_room',
    'drinking_water',
    'give_box',
    'lounge',
    'mailroom',
    'parcel_locker',
    'shelter',
    'shower',
    'telephone',
    'toilets',
    'water_point',
    'watering_place',
  ],
  'Waste Management': [
    'sanitary_dump_station',
    'recycling',
    'waste_basket',
    'waste_disposal',
    'waste_transfer_station',
  ],
  /* "Others": [
    "animal_boarding", "animal_breeding", "animal_shelter", "animal_training", "baking_oven", "clock", "crematorium", "dive_centre", "funeral_hall", "grave_yard", "hunting_stand", "internet_cafe", "kitchen", "kneipp_water_cure", "lounger", "marketplace",//?市场？买菜？
    "mortuary", "monastery", "	photo_booth", "place_of_mourning", "place_of_worship", "public_bath", "refugee_site", "vending_machine", "user defined"
  ] */
};
export const shopRules = {
  //商业服务
  'Food,beverages': [
    'alcohol', //晚上单多
    'bakery', //早上单多 晚上单多 其他时间比较平均
    'beverages',
    'brewing_supplies',
    'butcher',
    'cheese',
    'chocolate',
    'coffee', //咖啡店 早上和下午单多
    'confectionery',
    'convenience',
    'dairy',
    'deli',
    'farm',
    'food',
    'frozen_food',
    'greengrocer',
    'health_food',
    'ice_cream',
    'nuts',
    'pasta',
    'pastry',
    'seafood',
    'spices',
    'tea',
    'tortilla',
    'water',
    'wine',
  ],
  'General store,department store,mall': [
    //人下班之后回去 或者中午吃饭 应该晚餐会比较多人
    'department_store',
    'general',
    'kiosk',
    'mall',
    'supermarket',
    'wholesale',
    'convenience'
  ],
  'Clothing,shoes,accessories': [
    //商场里面买衣服的
    'baby_goods',
    'bag',
    'clothes',
    'fabric',
    'fashion_accessories',
    'jewelry',
    'leather',
    'sewing',
    'shoes',
    'shoe_repair',
    'tailor',
    'watches',
    'wool',
  ],
  'Discount store,charity': ['charity', 'second_hand', 'variety_store', 'pawnbroker'],
  'Health and beauty': [
    'beauty',
    'chemist',
    'cosmetics',
    'erotic',
    'hairdresser',
    'hairdresser_supply',
    'hearing_aids',
    'herbalist',
    'massage',
    'medical_supply',
    'nutrition_supplements',
    'optician',
    'perfumery',
    'tattoo',
  ],
  'Do-it-yourself, household, building materials, gardening': [
    'agrarian',
    'appliance',
    'bathroom_furnishing',
    'country_store',
    'doityourself',
    'electrical',
    'energy',
    'fireplace',
    'florist',
    'garden_centre',
    'garden_furniture',
    'gas',
    'glaziery',
    'groundskeeping',
    'hardware',
    '	houseware',
    'locksmith',
    'paint',
    'pottery',
    'security',
    'tool_hire',
    'trade',
    'doityourself',

  ],
  'Furniture and interior': [
    'antiques',
    'bed',
    'candles',
    'carpet',
    'curtain',
    'doors',
    'flooring',
    'furniture',
    'household_linen',
    'interior_decoration',
    'kitchen',
    'lighting',
    'tiles',
    'window_blind',
    'fabric',
  ],
  "Electronics": [
    'computer',
    'electronics',
    'hifi',
    'mobile_phone',
    'printer_ink',
    'radiotechnics',
    'telecommunication',
    'vacuum_cleaner',
  ],
  'Outdoors and sport, vehicles': [
    'atv',
    'bicycle',
    'boat',
    'car',
    'car_parts',
    'car_repair',
    'caravan',
    'fishing',
    'fuel',
    'military_surplus',
    'golf',
    'hunting',
    'motorcycle',
    'motorcycle_repair',
    'outdoor',
    'running',
    'scooter',
    'scuba_diving',
    'ski',
    'snowmobile',
    'sports',
    'surf',
    'swimming_pool',
    'trailer',
    'truck',
    'tyres',
  ],
  'Art, music, hobbies': [
    'art',
    'camera',
    'collector',
    'craft',
    'frame',
    'games',
    'model',
    'music',
    'musical_instrument',
    'photo',
    'trophy',
    'video',
    'video_games',
  ],
  'Stationery, gifts, books, newspapers': [
    'anime',
    'book',
    'gift',
    'lottery',
    'newsagent',
    'stationery',
    'ticket',
  ],
  /* "Others": [
    "bookmaker", "cannabis", "copyshop", "dry_cleaning", "e-cigarette", "funeral_directors", "laundry", "money_lender", "outpost",//主要用于在线订货的商品
    "party", "pawnbroker", "pest_control", "pet", "pet_grooming", "pyrotechnics", "religion", "rental", "storage_rental", "tobacco", "toys", "travel_agency", "vacant", "weapons", "user defined"
  ] */
};
export type officeRules = 'office';
export type stationRules = 'station';
export const buildingType = {
  officeArea: ['officed', 'industrial', 'government'],
  residentialArea: [
    'apartments',
    'barracks',
    'bungalow',
    'cabin',
    'detached',
    'annexe',
    'dormitory',
    'farm',
    'ger',
    'hotel',
    'house',
    'houseboat',
    'residential',
    'semidetached_house',
    'static_caravan',
    'stilt_house',
    'terrace',
    'tree_house',
    'trullo',
  ],
  mallArea: ['retail', 'supermarket', 'kiosk', 'retail', 'bakehouse'],
  stationArea: [
    //需要额外判断
    'train_station',
    'transportation',
  ],
  educationArea: ['university', 'college', 'kindergarten', 'school'],
};

// 功能点主类 → 场景类型 amenityRules
export const maintypeToScene: Record<string, string> = {
  Sustenance: 'mallArea', // 餐饮类 → 商业
  Financial: 'officeArea', // 金融 → 办公
  Healthcare: 'officeArea', // 医疗机构 → 也算 daytime 工作人口
  Education: 'educationArea', // 教育 → 教育场景
  'Public Service': 'officeArea', // 公共服务 → 办公类
  Transportation: 'stationArea', // 交通 → 混合
  'Entertainment,Arts,Culture': 'mallArea', // 娱乐文化 → 商业
  Facilities: 'mixedArea', // 设施类 → 混合
  'Waste Management': 'mixedArea', // 垃圾设施 → 混合
  Others: 'mixedArea', // 兜底
};

export interface HeatSnap {
  id: string; // 固定主键，随便起，例如 'latest'
  updated: number; // 时间戳，方便调试
  points: Array<{
    lng: number;
    lat: number;
    value: number; // 当前人流（basePeople）
    region: string
  }>;
}

export interface HeatSnapWithoutId {
  // id: string          // 固定主键，随便起，例如 'latest'
  timestamp: Date; // 时间戳，方便调试
  points: Array<{
    lng: number;
    lat: number;
    value: number; // 当前人流（basePeople）
    region: string
  }>;
}
export interface HeatmapPoint {
  x: number;
  y: number;
  value?: number;
}

export interface FlowHour {
  slot: number;
  timestamp: string; //ISO
  points: Array<{
    lng: number;
    lat: number;
    value: number; // 当前人流（basePeople）
  }>;
}

