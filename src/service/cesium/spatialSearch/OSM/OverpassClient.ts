import axios from 'axios';
import { ElMessage } from 'element-plus'
// ---------------- OverpassClient ----------------
export class OverpassClient {
  async fetch(lng: number, lat: number, radius: number): Promise<any> {
    const query = `
      [out:json][timeout:60];
      (
        way["building"](around:${radius},${lat},${lng});
        relation["building"](around:${radius},${lat},${lng});
        node["shop"](around:${radius},${lat},${lng});
        node["amenity"](around:${radius},${lat},${lng});
      );
      out geom;
    `;
    try {
      const res = await axios.get(
        `https://overpass-api.de/api/interpreter?data=${query}`
      );
      return res.data;
    } catch (err) {
      ElMessage({
        message: '请求建筑数据失败，可以删除弹窗再试一次',
        type: 'error',
      })
      ElMessage.closeAll()
      console.dir('向Overpass API获取数据失败', err);
      throw err;
    }
  }
}
