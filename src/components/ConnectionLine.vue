<!-- ConnectionLine.vue -->
<template>
  <line
    v-if="isValidLink"
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
    link: {
      type: Object,
      required: true
    },
    selected: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    isValidLink() {
      return this.link && 
             this.link.source && 
             this.link.target && 
             typeof this.link.source.x === 'number' && 
             typeof this.link.source.y === 'number' && 
             typeof this.link.target.x === 'number' && 
             typeof this.link.target.y === 'number';
    }
  }
};
</script>