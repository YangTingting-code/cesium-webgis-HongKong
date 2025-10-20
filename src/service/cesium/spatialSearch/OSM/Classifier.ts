import type {
  BuildingProfile,
  Category,
  CategoryRules,
} from '@/interface/globalInterface';
//返回分类好的建筑id
export class Classifier {
  // CATEGORY_RULES 根据 OSM 标签整理
  private CATEGORY_RULES: Record<Category, CategoryRules> = {
    commercial: {
      building: [
        'retail',
        'commercial',
        'supermarket',
        'kiosk',
        'office',
        'shop',
        'industrial',
      ],
      shop: [
        'bakery',
        'beverages',
        'butcher',
        'clothes',
        'convenience',
        'cosmetics',
        'department_store',
        'florist',
        'furniture',
        'mall',
        'supermarket',
        'kiosk',
        'hairdresser',
        'jewelry',
        'shoes',
        'electronics',
        'books',
        'gift',
        'alcohol',
        'brewing_supplies',
        'cheese',
        'chocolate',
        'coffee',
        'confectionery',
        'dairy',
        'deli',
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
        'fabric',
        '	jewelry',
        'leather',
        'shoes',
        'tailor',
        'watches',
        'sewing',
        '	wool',
        'yes',
      ],
      amenity: [
        'cafe',
        'bar',
        'restaurant',
        'fast_food',
        'biergarten',
        'food_court',
        'ice_cream',
        'pub',
        'arts_centre',
        'casino',
        'cinema',
        'nightclub',
      ],
      office: [
        'accounting',
        'advertising',
        'architecture',
        'consulting',
        'finance',
        'it',
        'lawyer',
        'advertising_agency',
        'architect',
        'chamber',
        'company',
        'construction_company',
        'courier',
        'coworking',
        'educational_institution',
        'energy_supplier',
        'estate_agent',
        'event_management',
        '	financial',
        'financial_advisor',
        'transport',
        'tax_advisor',
      ],
    },
    accommodation: {
      building: [
        'apartments',
        'residential',
        'house',
        'houseboat',
        'dormitory',
        'hotel',
        'bungalow',
        'cabin',
        'detached',
        'terrace',
        'tree_house',
        'semidetached_house',
        'barracks',
        'annexe',
        'ger',
        'static_caravan',
        'stilt_house',
        'trullo',
      ],
    },
    civic: {
      building: [
        'civic',
        'public',
        'school',
        'university',
        'hospital',
        'kindergarten',
        'museum',
        'college',
        'fire_station',
        'government',
        'toilets',
        'library',
        'clock_tower',
      ],
      amenity: [
        'school',
        'university',
        'college',
        'kindergarten',
        'library',
        'townhall',
        'police',
        'hospital',
        'clinic',
        'toilets',
        'fire_station',
        'community_centre',
        'college',
        'atm',
        'bank',
        'money_transfer',
        'baby_hatch',
        'social_facility',
        'veterinary',
        'post_box',
        'post_office',
        'post_depot',
        'courthouse',
        'prison',
        'ranger_station',
        'dressing_room',
        'drinking_water',
        'lounge',
        'mailroom',
        'shelter',
        'telephone',
        'shower',
        'water_point',
        'watering_place',
        'sanitary_dump_station',
        'recycling',
        'waste_basket',
        'waste_disposal',
        '	waste_transfer_station',
        'music_venue',
        'social_centre',
        'theatre',
      ],
      office: [
        'association',
        'broadcaster',
        'charity',
        'diplomatic',
        'employment_agency',
        'government',
        'forestry',
        'university',
        'water_utility',
        'visa',
        'telecommunication',
        'politician',
        'harbour_master',
      ],
    },
    transportation: {
      building: ['train_station', 'transportation', 'bridge'],
      amenity: [
        'bus_station',
        'taxi',
        'parking',
        'ferry_terminal',
        'political_party',
        'bicycle_parking',
        'fuel',
      ],
    },
  };

  //把建筑按照类型分类 可以根据osm 文档补充完善
  // 4. 分类函数 ": Category | 'unknown'"表示函数返回值的类型
  private classifyBuilding(building: BuildingProfile): Category | 'unknown' {
    const bType = building.buildingType;
    //1.粗分类 先一次性把buildingType看完再看功能点决定
    //前面是对象 CATEGORY_RULES → 用 for…in 拿键
    for (const category in this.CATEGORY_RULES) {
      const rules = this.CATEGORY_RULES[category as Category];
      if (rules.building?.includes(bType)) {
        return category as Category;
      }
    }
    //2.如果这个建筑没有buildingType的话就查看功能点匹配 容易以偏概全 不用功能点给建筑类型分类
    //后面是数组 building.functionNodes → 用 for…of 拿元素
    /* for (const fn of building.functionNodes) {
      if (rules[fn.type as keyof typeof rules]?.includes(fn.subtype)) {
        return category as Category;
      }
    } */
    //粗分类没有匹配上的话 就返回unknow类型
    return 'unknown';
  }

  // 批量处理建筑数组 分类
  classifyBuildingsBatch(buildings: BuildingProfile[]): {
    classifiedBuildings: (BuildingProfile & {
      category: Category | 'unknown';
    })[];
    categoryIds: Record<Category, number[]>;
  } {
    const categoryIds: Record<Category, number[]> = {
      commercial: [],
      accommodation: [],
      civic: [],
      transportation: [],
    };
    const classifiedBuildings = buildings.map((building) => {
      const category = this.classifyBuilding(building);
      if (category !== 'unknown') {
        categoryIds[category].push(building.id);
      }
      return {
        ...building,
        category,
      };
    });
    return {
      classifiedBuildings,
      categoryIds,
    };
  }
}
