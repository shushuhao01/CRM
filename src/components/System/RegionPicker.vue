<template>
  <div class="region-picker">
    <el-select
      :model-value="inner.province"
      placeholder="选择省"
      clearable
      filterable
      class="region-select"
      @change="onProvinceChange"
    >
      <el-option v-for="p in provinces" :key="p.value" :label="p.label" :value="p.value" />
    </el-select>
    <el-select
      :model-value="inner.city"
      placeholder="选择市（可不限）"
      clearable
      filterable
      class="region-select"
      :disabled="!inner.province"
      @change="onCityChange"
    >
      <el-option v-for="c in cities" :key="c.value" :label="c.label" :value="c.value" />
    </el-select>
    <el-select
      :model-value="inner.district"
      placeholder="选择区（可不限）"
      clearable
      filterable
      class="region-select"
      :disabled="!inner.city"
      @change="onDistrictChange"
    >
      <el-option v-for="d in districts" :key="d.value" :label="d.label" :value="d.value" />
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { loadAddressData, getProvinces, getCitiesByProvince, getDistrictsByCity } from '../../utils/addressData';

interface RegionValue {
  province?: string;      // 省 value（拼音）
  provinceName?: string;  // 省 label（中文）
  city?: string;
  cityName?: string;
  district?: string;
  districtName?: string;
  reason?: string;
}

const props = defineProps<{ modelValue: RegionValue }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: RegionValue): void }>();

const provinces = ref<{ label: string; value: string }[]>([]);
const cities = ref<{ label: string; value: string }[]>([]);
const districts = ref<{ label: string; value: string }[]>([]);

// 本地镜像，避免直接改 props
const inner = reactive<RegionValue>({ ...props.modelValue });

const emitValue = (v: RegionValue) => {
  Object.assign(inner, v);
  emit('update:modelValue', { ...inner });
};

const onProvinceChange = (val: string) => {
  const label = provinces.value.find(p => p.value === val)?.label || '';
  cities.value = val ? getCitiesByProvince(val) : [];
  districts.value = [];
  emitValue({ province: val || '', provinceName: label, city: '', cityName: '', district: '', districtName: '' });
};

const onCityChange = (val: string) => {
  const label = cities.value.find(c => c.value === val)?.label || '';
  districts.value = (inner.province && val) ? getDistrictsByCity(inner.province, val) : [];
  emitValue({ city: val || '', cityName: label, district: '', districtName: '' });
};

const onDistrictChange = (val: string) => {
  const label = districts.value.find(d => d.value === val)?.label || '';
  emitValue({ district: val || '', districtName: label });
};

// 外部值整体替换时（如回显/重置）同步镜像并重建下拉数据
watch(
  () => props.modelValue,
  (v) => {
    Object.assign(inner, v || {});
    if (inner.province) {
      cities.value = getCitiesByProvince(inner.province);
      if (inner.city) {
        districts.value = getDistrictsByCity(inner.province, inner.city);
      } else {
        districts.value = [];
      }
    } else {
      cities.value = [];
      districts.value = [];
    }
  },
  { deep: true }
);

onMounted(async () => {
  await loadAddressData();
  provinces.value = getProvinces();
  // 回显：已有值时重建市/区下拉
  if (inner.province) {
    cities.value = getCitiesByProvince(inner.province);
    if (inner.city) districts.value = getDistrictsByCity(inner.province, inner.city);
  }
});
</script>

<style scoped>
.region-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.region-select {
  width: 140px;
}
</style>
