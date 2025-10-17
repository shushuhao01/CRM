// 备份原始地址数据文件
// 备份时间: 2025年
// 此文件为原始数据的备份，请勿修改

export interface AddressOption {
  label: string;
  value: string;
  children?: AddressOption[];
}

export interface Street {
  label: string;
  value: string;
}

export interface District {
  label: string;
  value: string;
  children?: Street[];
}

export interface City {
  label: string;
  value: string;
  children?: District[];
}

export interface Province {
  label: string;
  value: string;
  children?: City[];
}

// 原始数据已备份，新数据将在addressData.ts中更新
export const provinces: Province[] = [];