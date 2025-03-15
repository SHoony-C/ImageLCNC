<template>
  <div 
    class="minimap" 
    @mousedown="startDrag" 
    @mouseup="stopDrag"
    @mouseleave="stopDrag"
    @wheel.prevent="onWheel"
  >
    <svg width="200" height="150" ref="minimap">
      <rect x="0" y="0" width="200" height="150" fill="#f0f0f0" stroke="#ccc"/>
      <!-- 노드들 -->
      <g v-for="node in nodes" :key="node.id">
        <rect
          :x="node.x * miniScale"
          :y="node.y * miniScale"
          :width="60 * miniScale"
          :height="40 * miniScale"
          :fill="getColor(node)"
          stroke="#333"
        />
      </g>
      <!-- 연결선들 -->
      <g v-for="(link, index) in links" :key="index">
        <line
          :x1="link.source.x * miniScale"
          :y1="link.source.y * miniScale"
          :x2="link.target.x * miniScale"
          :y2="link.target.y * miniScale"
          :stroke="isSelected(index) ? 'red' : 'black'"
          :stroke-width="isSelected(index) ? 2 : 1"
        />
      </g>
      <!-- 뷰포트 표시 -->
      <rect
        :x="viewportRect.x"
        :y="viewportRect.y"
        :width="viewportRect.width"
        :height="viewportRect.height"
        fill="rgba(0, 0, 255, 0.1)"
        stroke="blue"
        stroke-width="2"
        stroke-dasharray="5,5"
        style="cursor: move;"
        @mousedown.stop="startViewportDrag"
        @mousemove.stop="onViewportDrag"
        @mouseup.stop="stopViewportDrag"
      />
    </svg>
  </div>
</template>

<script>
export default {
  name: "MiniMap",
  props: {
    nodes: { type: Array, required: true },
    links: { type: Array, required: true },
    scale: { type: Number, default: 1 },
    panOffset: { type: Object, default: () => ({ x: 0, y: 0 }) },
    selectedLinkIndex: { type: Number, default: null },
    canvasWidth: { type: Number, default: 800 },
    canvasHeight: { type: Number, default: 600 }
  },
  data() {
    return {
      miniMapScale: 0.1,
      isDragging: false,
      isViewportDragging: false,
      dragStartPos: { x: 0, y: 0 },
      initialPanOffset: { x: 0, y: 0 }
    };
  },
  computed: {
    miniScale() {
      return this.miniMapScale;
    },
    viewportRect() {
      const vpWidth = (this.canvasWidth / this.scale) * this.miniScale;
      const vpHeight = (this.canvasHeight / this.scale) * this.miniScale;
      const vpX = -this.panOffset.x * this.miniScale;
      const vpY = -this.panOffset.y * this.miniScale;
      
      return {
        x: vpX,
        y: vpY,
        width: vpWidth,
        height: vpHeight
      };
    }
  },
  methods: {
    getColor(node) {
      if (node.type === "start") return "#2ecc71";
      if (node.type === "end") return "#e74c3c";
      return "#3498db";
    },
    isSelected(index) {
      return index === this.selectedLinkIndex;
    },
    startViewportDrag(e) {
      this.isViewportDragging = true;
      const rect = this.$refs.minimap.getBoundingClientRect();
      this.dragStartPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      this.initialPanOffset = { ...this.panOffset };
      e.preventDefault();
    },
    onViewportDrag(e) {
      if (!this.isViewportDragging) return;
      
      const rect = this.$refs.minimap.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      const dx = (currentX - this.dragStartPos.x) / this.miniScale;
      const dy = (currentY - this.dragStartPos.y) / this.miniScale;
      
      this.$emit('update-pan', {
        x: this.initialPanOffset.x - dx,
        y: this.initialPanOffset.y - dy
      });
    },
    stopViewportDrag() {
      this.isViewportDragging = false;
    },
    startDrag(e) {
      // 미니맵 배경 클릭 시 해당 위치로 뷰포트 중심 이동
      if (e.target.tagName === 'rect' && e.target === e.currentTarget.querySelector('rect')) {
        const rect = this.$refs.minimap.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.miniScale;
        const y = (e.clientY - rect.top) / this.miniScale;
        
        this.$emit('update-pan', {
          x: -x + this.canvasWidth / (2 * this.scale),
          y: -y + this.canvasHeight / (2 * this.scale)
        });
      }
    },
    onDrag() {
      // 현재 사용하지 않는 메서드이므로 빈 메서드로 남겨두거나
      // 필요없다면 template의 @mousemove="onDrag"를 제거해도 됩니다.
    },
    stopDrag() {
      this.isDragging = false;
    },
    onWheel(e) {
      const delta = e.deltaY;
      if (delta > 0) {
        this.miniMapScale = Math.max(0.05, this.miniMapScale - 0.01);
      } else {
        this.miniMapScale = Math.min(0.3, this.miniMapScale + 0.01);
      }
    }
  }
};
</script>

<style scoped>
.minimap {
  width: 200px;
  height: 150px;
  user-select: none;
}
</style>