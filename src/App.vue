<template>
  <div id="app">
    <city-map></city-map>
    <static-layout class="layout"></static-layout>
  </div>
</template>

<script>
import CityMap from './components/CityMap.vue';
import StaticLayout from './components/staticLayout.vue';

export default {
  components: { CityMap, StaticLayout },
  name: "App",
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  background-image: url('/smart-taiyuan/static/bg.jpg');
}
.layout{
  position:absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
