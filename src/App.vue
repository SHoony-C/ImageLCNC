<!-- App.vue -->
<template>
  <div id="app">
    <ImageWorkflow />
  </div>
</template>

<script>
import ImageWorkflow from "./components/ImageWorkflow.vue";

export default {
  name: "App",
  components: {
    ImageWorkflow
  }
};
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}
</style>
