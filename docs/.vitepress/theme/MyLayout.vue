<script setup>
import DefaultTheme from 'vitepress/theme'
import MyOxygen from './MyOxygen.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #aside-ads-after>
      <MyOxygen />
    </template>
  </Layout>
</template>
