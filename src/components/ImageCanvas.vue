<template>
  <div class="canvas-container">
    <div
      class="canvas"
      ref="canvas"
      @dragover.prevent="onDragOver"
      @drop="onDrop"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mousedown="onMouseDown"
      @keydown="onKeyDown"
      tabindex="0"
    >
      <!-- SVG를 transform-origin 추가하여 줌 중심점 설정 -->
      <svg 
        :style="{ 
          transform: `scale(${scale}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: '0 0'
        }" 
        width="100%" 
        height="100%"
      >
        <!-- 임시 연결선 -->
        <line
          v-if="tempLink"
          :x1="tempLink.x1"
          :y1="tempLink.y1"
          :x2="tempLink.x2"
          :y2="tempLink.y2"
          stroke="gray"
          stroke-dasharray="5,5"
          stroke-width="2"
        ></line>
  
        <!-- 연결선들 -->
        <ConnectionLine
          v-for="(link, index) in links"
          :key="index"
          :link="link"
          :selected="isLinkSelected(link)"
          @click="selectLink(index)"
        />

        <!-- 노드들 -->
        <g v-for="node in nodes" :key="node.id">
          <ImageNode
            :node="node"
            :selected="isNodeSelected(node)"
            @update-node="emitUpdateNode"
            @start-link-drag="emitStartLinkDrag"
            @file-upload="emitFileUpload"
            @select-node="handleNodeSelect"
            @preview-image="emitPreviewImage"
            @mousedown-on-node="handleNodeMouseDown"
          />
        </g>
      </svg>
    </div>
    <MiniMap
      :nodes="nodes"
      :links="links"
      :scale="scale"
      :panOffset="panOffset"
      :selectedLinkIndex="selectedLinkIndex"
      :canvasWidth="800"
      :canvasHeight="600"
      @update-pan="handleMiniMapPan"
    />

    <!-- 추가: 컨트롤 패널 -->
    <div class="control-panel">
      <button 
        class="process-btn"
        @click="startProcessing"
        :disabled="isProcessing"
      >
        {{ isProcessing ? 'Processing...' : 'Start Processing' }}
      </button>
    </div>
  </div>
</template>
  
<script>
import ImageNode from "./ImageNode.vue";
import ConnectionLine from "./ConnectionLine.vue";
import MiniMap from "./MiniMap.vue";

export default {
  name: "ImageCanvas",
  components: { ImageNode, ConnectionLine, MiniMap },
  emits: [
    'node-dropped',
    'update-temp-link',
    'update-node',
    'complete-link-drag',
    'update-pan-offset',
    'copy-selected-nodes',
    'paste-nodes',
    'start-link-drag',
    'select-link',
    'file-upload',
    'select-node',
    'preview-image'
  ],
  props: {
    nodes: Array,
    links: Array,
    tempLink: Object,
    scale: Number,
    selectedNodes: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      isDraggingLink: false,
      isDraggingCanvas: false,
      lastMousePosition: { x: 0, y: 0 },
      panOffset: { x: 0, y: 0 },
      activeNodeId: null,
      nodeOffsetX: 0,
      nodeOffsetY: 0,
      selectedLinkIndex: null,
      isProcessing: false,
      processingNode: null,
      selectedNode: null,
      processedResults: new Map() // 노드별 처리 결과 저장
    };
  },
  mounted() {
    this.$refs.canvas.focus();
  },
  computed: {
    hasValidFlow() {
      // 시작 노드가 있고, 모든 노드가 연결되어 있는지 확인
      return this.nodes.some(n => n.type === 'start') && this.validateFlow();
    }
  },
  methods: {
    handleMiniMapPan(newPanOffset) {
      console.log('미니맵 pan 업데이트:', newPanOffset);
      this.panOffset = { ...newPanOffset };
      this.$emit('update-pan-offset', this.panOffset);
    },
    onDragOver(e) {
      e.preventDefault();
    },
    onDrop(event) {
      try {
        const jsonData = event.dataTransfer.getData("nodeCandidate");
        if (!jsonData) return;
        const nodeData = JSON.parse(jsonData);
        
        const rect = this.$refs.canvas.getBoundingClientRect();
        const offsetX = (event.clientX - rect.left) / this.scale - this.panOffset.x;
        const offsetY = (event.clientY - rect.top) / this.scale - this.panOffset.y;
        
        this.$emit("node-dropped", { nodeData, offsetX, offsetY });
      } catch (error) {
        console.error("드롭 데이터 파싱 오류:", error);
      }
    },
    onMouseDown(e) {
      if (e.target === this.$refs.canvas || e.target.tagName === 'svg') {
        this.isDraggingCanvas = true;
        this.lastMousePosition = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    },
    handleNodeMouseDown(node, e) {
      this.activeNodeId = node.id;
      const rect = this.$refs.canvas.getBoundingClientRect();
      this.nodeOffsetX = ((e.clientX - rect.left) / this.scale) - node.x - this.panOffset.x;
      this.nodeOffsetY = ((e.clientY - rect.top) / this.scale) - node.y - this.panOffset.y;
    },
    onMouseMove(e) {
      const rect = this.$refs.canvas.getBoundingClientRect();
      
      if (this.isDraggingLink && this.tempLink) {
        const updatedTempLink = {
          ...this.tempLink,
          x2: (e.clientX - rect.left) / this.scale - this.panOffset.x,
          y2: (e.clientY - rect.top) / this.scale - this.panOffset.y,
        };
        this.$emit("update-temp-link", updatedTempLink);
      } else if (this.activeNodeId) {
        const node = this.nodes.find(n => n.id === this.activeNodeId);
        if (node) {
          const newX = ((e.clientX - rect.left) / this.scale) - this.nodeOffsetX - this.panOffset.x;
          const newY = ((e.clientY - rect.top) / this.scale) - this.nodeOffsetY - this.panOffset.y;
          
          const portOffsetX = newX - node.x;
          const portOffsetY = newY - node.y;
          
          const updatedPorts = node.ports.map(port => ({
            ...port,
            x: port.x + portOffsetX,
            y: port.y + portOffsetY
          }));
          
          this.$emit("update-node", {
            ...node,
            x: newX,
            y: newY,
            ports: updatedPorts
          });
        }
      } else if (this.isDraggingCanvas) {
        const dx = (e.clientX - this.lastMousePosition.x) / this.scale;
        const dy = (e.clientY - this.lastMousePosition.y) / this.scale;
        
        this.panOffset.x += dx;
        this.panOffset.y += dy;
        this.lastMousePosition = { x: e.clientX, y: e.clientY };
        
        this.$emit("update-pan-offset", this.panOffset);
      }
    },
    onMouseUp(e) {
      if (this.isDraggingLink) {
        const rect = this.$refs.canvas.getBoundingClientRect();
        const dropX = (e.clientX - rect.left) / this.scale - this.panOffset.x;
        const dropY = (e.clientY - rect.top) / this.scale - this.panOffset.y;
        this.$emit("complete-link-drag", { dropX, dropY });
        this.isDraggingLink = false;
      }
      
      this.isDraggingCanvas = false;
      this.activeNodeId = null;
    },
    onKeyDown(e) {
      if (e.ctrlKey) {
        if (e.key === 'c') {
          this.$emit("copy-selected-nodes");
        } else if (e.key === 'v') {
          this.$emit("paste-nodes");
        }
      }
    },
    emitUpdateNode(updatedNode) {
      this.$emit("update-node", updatedNode);
    },
    emitStartLinkDrag(data) {
      this.$emit("start-link-drag", data);
      this.isDraggingLink = true;
    },
    selectLink(index) {
      this.selectedLinkIndex = index;
      this.$emit("select-link", index);
    },
    isLinkSelected(link) {
      return this.links.indexOf(link) === this.selectedLinkIndex;
    },
    emitFileUpload(payload) {
      this.$emit("file-upload", payload);
    },
    handleNodeSelect(node) {
      console.log('ImageCanvas - handleNodeSelect:', node);
      this.$emit('select-node', node);
    },
    emitPreviewImage(imageUrl) {
      this.$emit("preview-image", imageUrl);
    },
    isNodeSelected(node) {
      const isSelected = this.selectedNodes.some(n => n.id === node.id);
      console.log('ImageCanvas - isNodeSelected:', node.id, isSelected);
      return isSelected;
    },
    validateFlow() {
      // 모든 노드가 올바르게 연결되어 있는지 확인
      const visited = new Set();
      const startNode = this.nodes.find(n => n.type === 'start');
      
      const traverse = (node) => {
        if (visited.has(node.id)) return true;
        visited.add(node.id);
        
        const outgoingLinks = this.links.filter(l => l.source.id === node.id);
        if (outgoingLinks.length === 0 && node.type !== 'end') return false;
        
        return outgoingLinks.every(link => {
          const nextNode = this.nodes.find(n => n.id === link.target.id);
          return traverse(nextNode);
        });
      };
      
      return traverse(startNode);
    },
    async startProcessing() {
      if (this.isProcessing) return;
      this.isProcessing = true;
      this.processedResults.clear();
      
      try {
        const startNode = this.nodes.find(n => n.type === 'start');
        await this.processNode(startNode);
      } catch (error) {
        console.error('Processing error:', error);
      } finally {
        this.isProcessing = false;
        this.processingNode = null;
      }
    },
    async processNode(node) {
      this.processingNode = node;
      
      // 노드 처리 시각화를 위한 지연
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        // 노드 타입에 따른 이미지 처리 로직
        const result = await this.processNodeLogic(node);
        this.processedResults.set(node.id, result);
        
        // 다음 노드 처리
        const outgoingLinks = this.links.filter(l => l.source.id === node.id);
        for (const link of outgoingLinks) {
          const nextNode = this.nodes.find(n => n.id === link.target.id);
          await this.processNode(nextNode);
        }
      } catch (error) {
        console.error(`Error processing node ${node.id}:`, error);
        throw error;
      }
    },
    async processNodeLogic(node) {
      // 각 노드 타입별 처리 로직
      switch (node.type) {
        case 'start':
          return node.options.image;
        case 'filter':
          return this.applyFilter(node);
        case 'transform':
          return this.applyTransform(node);
        // ... 다른 노드 타입들 ...
        default:
          return null;
      }
    },
    updateNodeOptions() {
      if (!this.selectedNode) return;
      this.$emit('update-node', {
        ...this.selectedNode,
        options: { ...this.selectedNode.options }
      });
    },
    formatLabel(key) {
      return key.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  }
};
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100vh;
}

.canvas {
  width: 100%;
  height: 100%;
  background-color: #f5f5f5;
  position: relative;
  overflow: hidden;
}

.minimap {
  position: absolute;
  bottom: 20px;
  right: 20px;
  border: 1px solid #ccc;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 1000;
}

.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.process-btn {
  padding: 10px 20px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.process-btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.process-btn:hover:not(:disabled) {
  background-color: #27ae60;
}

.node-settings-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 15px;
  width: 300px;
  z-index: 1000;
}

.settings-content {
  max-height: 400px;
  overflow-y: auto;
}

.setting-item {
  margin-bottom: 10px;
}

.setting-item label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.setting-item input,
.setting-item select {
  width: 100%;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

/* 처리 중인 노드 스타일 */
.processing {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>