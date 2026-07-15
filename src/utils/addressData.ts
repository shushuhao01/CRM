// 2025年中国完整行政区划数据 - 懒加载版本
// 数据已外置为 public/data/address.json，首次使用时按需加载，减少约2MB打包体积

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

// ── 懒加载缓存 ──────────────────────────────────────

let _provinces: Province[] = []
let _loaded = false
let _loading: Promise<Province[]> | null = null

/**
 * 初始化地址数据（异步加载JSON，需在组件 onMounted 中调用）
 * 多次调用安全，只会加载一次
 */
export async function loadAddressData(): Promise<Province[]> {
  if (_loaded) return _provinces
  if (_loading) return _loading

  _loading = fetch(import.meta.env.BASE_URL + 'data/address.json')
    .then(res => res.json())
    .then((data: Province[]) => {
      _provinces = data
      _loaded = true
      _loading = null
      return _provinces
    })
    .catch(err => {
      console.error('[addressData] 加载地址数据失败:', err)
      _loading = null
      return _provinces
    })

  return _loading
}

// ── 同步辅助函数（需先调用 loadAddressData 初始化）──

export function getProvinces(): Province[] {
  return _provinces.map(({ label, value }) => ({ label, value }))
}

export function getCitiesByProvince(provinceValue: string): City[] {
  const province = _provinces.find(p => p.value === provinceValue);
  return province?.children ?? [];
}

export function getDistrictsByCity(provinceValue: string, cityValue: string): District[] {
  const province = _provinces.find(p => p.value === provinceValue);
  if (!province) return [];

  const city = province.children?.find(c => c.value === cityValue);
  return city?.children ?? [];
}

export function getStreetsByDistrict(provinceValue: string, cityValue: string, districtValue: string): Street[] {
  const province = _provinces.find(p => p.value === provinceValue);
  if (!province) return [];

  const city = province.children?.find(c => c.value === cityValue);
  if (!city) return [];

  const district = city.children?.find(d => d.value === districtValue);
  return district?.children ?? [];
}

// 🔥 根据代码分别获取省/市/区/街道的中文名称（用于导出等场景，找不到时回退原始值）
export function getAddressPartLabels(
  provinceValue?: string,
  cityValue?: string,
  districtValue?: string,
  streetValue?: string
): { province: string; city: string; district: string; street: string } {
  const result = {
    province: provinceValue || '',
    city: cityValue || '',
    district: districtValue || '',
    street: streetValue || ''
  };

  const province = provinceValue ? _provinces.find(p => p.value === provinceValue) : undefined;
  if (province) {
    result.province = province.label;
    const city = cityValue ? province.children?.find(c => c.value === cityValue) : undefined;
    if (city) {
      result.city = city.label;
      const district = districtValue ? city.children?.find(d => d.value === districtValue) : undefined;
      if (district) {
        result.district = district.label;
        const street = streetValue ? district.children?.find(s => s.value === streetValue) : undefined;
        if (street) {
          result.street = street.label;
        }
      }
    }
  }

  return result;
}

// 根据代码获取地址名称
export function getAddressLabel(provinceValue?: string, cityValue?: string, districtValue?: string, streetValue?: string): string {
  const parts: string[] = [];

  if (provinceValue) {
    const province = _provinces.find(p => p.value === provinceValue);
    if (province) {
      parts.push(province.label);

      if (cityValue && province.children) {
        const city = province.children.find(c => c.value === cityValue);
        if (city) {
          // 如果城市名和省份名相同（如直辖市），不重复添加
          if (city.label !== province.label) {
            parts.push(city.label);
          }

          if (districtValue && city.children) {
            const district = city.children.find(d => d.value === districtValue);
            if (district) {
              parts.push(district.label);

              if (streetValue && district.children) {
                const street = district.children.find(s => s.value === streetValue);
                if (street) {
                  parts.push(street.label);
                }
              }
            }
          }
        }
      }
    }
  }

  return parts.join('');
}

export default _provinces;

