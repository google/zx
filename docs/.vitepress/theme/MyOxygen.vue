<template>
  <!--  <div class="Oxygen">-->
  <!--    <a href="https://webpod.dev/?from=zx-site">-->
  <!--      &lt;!&ndash;<img src="https://webpod.dev/img/banner.png" alt="Webpod - deploy JavaScript apps">&ndash;&gt;-->
  <!--      <img-->
  <!--        src="https://webpod.dev/img/logo.svg"-->
  <!--        alt="Webpod - deploy JavaScript apps"-->
  <!--      />-->
  <!--      <p>Webpod – deploy JavaScript apps to own cloud or private server</p>-->
  <!--    </a>-->
  <!--  </div>-->
</template>

<style scoped>
.Oxygen {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  border-radius: 12px;
  min-height: 256px;
  text-align: center;
  line-height: 18px;
  font-size: 12px;
  font-weight: 500;
  background-color: var(--vp-carbon-ads-bg-color);
}

.Oxygen :deep(img) {
  margin: 0 auto;
}

.Oxygen :deep(p) {
  display: block;
  margin: 0 auto;
  color: var(--vp-carbon-ads-text-color);
  transition: color 0.25s;
}

.Oxygen :deep(p:hover) {
  color: var(--vp-carbon-ads-hover-text-color);
}
</style>
<script setup></script>
