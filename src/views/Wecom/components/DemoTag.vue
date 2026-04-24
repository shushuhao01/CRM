<template>
  <span v-if="visible" class="demo-tag">示例</span>
</template>

<script setup lang="ts">
defineProps<{ visible?: boolean }>()
</script>

<style scoped>
.demo-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #fff;
  background: linear-gradient(135deg, #e6a23c, #f0b85a);
  padding: 1px 8px;
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: middle;
  line-height: 18px;
  user-select: none;
}
</style>

