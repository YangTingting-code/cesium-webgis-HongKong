import { flatPolygon } from '@/utils/geo/json2Feature'
import axios from 'axios'
// ---------------- OverpassClient ----------------
export class OverpassClient {
  async fetchByBBox(regions: Array<string>): Promise<any> { //调用这个函数的时候传入想要的区域
    const allData: any[] = []
    for (const region of regions) {
      const query = await this.getQuery(region)
      try {
        const res = await axios.post(
          "https://overpass-api.de/api/interpreter",
          `data=${encodeURIComponent(query)}`, // 这里要编码
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            }
          }
        );
        // 给每条元素增加 region 字段
        res.data.elements.forEach((el: any) => {
          el.region = region;
        });
        allData.push(...res.data.elements)
      } catch (err) {
        console.error('向 Overpass API 获取数据失败', err);
        throw err;
      }
    }
    // 返回统一格式
    return { elements: allData };
  }

  private async getQuery(name: string) {
    const polygons = await flatPolygon(name)
    let query = '[out:json];\n(\n';
    polygons.forEach((coords, index) => {
      query += `  // 多边形${index + 1}\n`;
      query += this.makePolygonQuery(coords);
    });
    query += ');\nout geom;';
    return query
  }
  private makePolygonQuery(coords) {
    return `
    way["building"](poly:"${coords}");
    relation["building"](poly:"${coords}");
    node["shop"](poly:"${coords}");
    node["amenity"](poly:"${coords}");
    node["office"](poly:"${coords}");
    `;
  }
}
