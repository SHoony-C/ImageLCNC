<!-- ConnectionLine.vue -->
<template>
    <line
      :x1="link.source.x"
      :y1="link.source.y"
      :x2="link.target.x"
      :y2="link.target.y"
      :stroke="selected ? 'red' : 'black'"
      :stroke-width="selected ? 3 : 2"
      @click.stop="$emit('click')"
      style="cursor: pointer;"
    ></line>
  </template>
  
  <script>
  export default {
    name: "ConnectionLine",
    props: {
      link: Object,
      selected: {
        type: Boolean,
        default: false
      }
    }
  };
  </script>