<template>
  <div id="website-app">
    <Navbar />
    <router-view />
    <Footer />
    <CustomerService />
  </div>
</template>

<script setup lang="ts">
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
import CustomerService from './components/CustomerService.vue'
</script>

<style lang="scss">
#website-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
