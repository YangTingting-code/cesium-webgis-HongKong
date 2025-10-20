export interface SearchData {
  ids: {
    pointEntityId: string;
    circleEntityId: string;
    pinEntityId: string;
    popupId: string;
  };
  position: { lng: number; lat: number; h: number };
}

export class SearchCircleDataManager {
  private key = 'searchDataManage';

  getAll(): Record<string, SearchData> {
    return JSON.parse(localStorage.getItem(this.key) || '{}');
  }

  setAll(data: Record<string, SearchData>) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  add(pinEntityId: string, radius: number, data: SearchData) {
    const all = this.getAll();
    all[`${pinEntityId},${radius}`] = data;
    this.setAll(all);
  }

  remove(pinEntityId: string, radius: number) {
    const all = this.getAll();
    delete all[`${pinEntityId},${radius}`];
    this.setAll(all);
  }
  clear() {
    localStorage.removeItem(this.key);
  }

  maxId() {
    let maxLocal = -1;
    const data = this.getAll();
    Object.keys(data).forEach((key) => {
      const parts = key.split(','); // ['circle-center-0', '100']
      const num = Number(parts[0].split('-').pop());
      if (!Number.isNaN(num) && num > maxLocal) maxLocal = num;
    });
    return Math.max(maxLocal, -1) + 1;
  }

  update(pinEntityId: string, radius: number) {
    //key迁移
    const all = this.getAll();
    const oldRadius = Object.keys(all)[0].split(',')[1];
    const data = all[`${pinEntityId},${oldRadius}`]; // 先保存旧数据的引用（对象是引用类型，直接保存可以避免后续操作导致取不到）
    delete all[`${pinEntityId},${oldRadius}`]; //从 all 中删除旧的 key（只是删掉键，不会清空 data 里的内容）
    all[`${pinEntityId},${radius}`] = data; // 把旧数据赋给新 key，这样保证数据迁移正确
    this.setAll(all);
  }
}
