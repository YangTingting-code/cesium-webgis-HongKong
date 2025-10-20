// ChartDataManager.ts
import { reactive } from 'vue';

export interface ChartData {
  value: number;
  name: string;
}

export class ChartDataManager {
  private key = 'chartDataManage';
  data = reactive<Record<string, ChartData[]>>(
    JSON.parse(localStorage.getItem(this.key) || '{}')
  );

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.data));
  }

  remove(pinEntityId: string) {
    delete this.data[pinEntityId];
    this.save();
  }

  clear() {
    localStorage.removeItem(this.key);
  }

  add(pinEntityId: string, result: ChartData[]) {
    if (!this.data[pinEntityId]) {
      this.data[pinEntityId] = result;
      this.save();
    }
  }
}
