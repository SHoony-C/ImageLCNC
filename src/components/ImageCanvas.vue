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
        viewBox="0 0 2500 1200"
        preserveAspectRatio="xMidYMid meet"
      >
        <!-- 임시 연결선 (드래그 중) -->
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
            @start-link-drag="startLinkDrag"
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
import { processImage } from "@/services/ImageProcessingService";

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
    'preview-image',
    'update-links'
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
      processedResults: new Map(), // 노드별 처리 결과 저장
      canvasWidth: 2500,  // 기본 캔버스 너비 증가
      canvasHeight: 1200, // 기본 캔버스 높이 증가
    };
  },
  mounted() {
    this.$refs.canvas.focus();
    this.adjustCanvasSize();
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
        this.adjustCanvasSize();
      } catch (error) {
        console.error("드롭 데이터 파싱 오류:", error);
      }
    },
    onMouseDown(e) {
      // 캔버스 영역 클릭 시 선택 해제
      if (e.target === this.$refs.canvas || e.target.tagName === 'svg') {
        this.isDraggingCanvas = true;
        this.lastMousePosition = { x: e.clientX, y: e.clientY };
        // 선택 상태 초기화
        this.$emit('select-node', null);
        this.selectedLinkIndex = null;
      }
      e.preventDefault(); // 브라우저 기본 드래그 선택 방지
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
        // 마우스 위치를 캔버스 좌표계로 변환
        const mouseX = (e.clientX - rect.left) / this.scale - this.panOffset.x;
        const mouseY = (e.clientY - rect.top) / this.scale - this.panOffset.y;
        
        // 임시 연결선의 끝점을 현재 마우스 위치로 업데이트
        const updatedTempLink = {
          ...this.tempLink,
          x2: mouseX,
          y2: mouseY
        };
        this.$emit('update-temp-link', updatedTempLink);
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
          
          this.updateNode({
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
        this.completeLinkDrag({ dropX, dropY });
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
    updateNode(updatedNode) {
      console.log('노드 업데이트:', updatedNode);
      
      // 연결선 좌표 업데이트
      const updatedLinks = this.links.map(link => {
        const newLink = { ...link };
        updatedNode.ports.forEach(port => {
          if (link.source.id === port.id) {
            newLink.source = { ...port };
          }
          if (link.target.id === port.id) {
            newLink.target = { ...port };
          }
        });
        return newLink;
      });

      // 부모 컴포넌트에 업데이트 요청
      this.$emit('update-node', updatedNode);
      this.$emit('update-links', updatedLinks);
    },
    emitUpdateNode(updatedNode) {
      this.updateNode(updatedNode);
    },
    startLinkDrag(event, port) {
      event.preventDefault(); // 드래그 시작 시 선택 방지
      console.log('시작 포트:', port);
      const rect = this.$refs.canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / this.scale - this.panOffset.x;
      const y = (event.clientY - rect.top) / this.scale - this.panOffset.y;
      
      this.isDraggingLink = true;
      this.$emit('update-temp-link', {
        x1: port.x,
        y1: port.y,
        x2: x,
        y2: y,
        sourcePort: port
      });
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
      return this.selectedNodes.some(n => n.id === node.id);
    },
    getNextNodes(node) {
      // 현재 노드의 출력 포트만 필터링
      const outputPorts = node.ports.filter(p => p.type === 'output');
      console.log('현재 노드의 출력 포트:', outputPorts);

      // 현재 노드의 출력 포트에서 시작하는 링크 찾기
      const outgoingLinks = this.links.filter(link => {
        return outputPorts.some(port => {
          const isMatch = port.id === link.source.id;
          if (isMatch) {
            console.log('매칭된 출력 포트:', port.id, '-> 타겟:', link.target.id);
          }
          return isMatch;
        });
      });
      
      console.log('발견된 연결:', outgoingLinks);
      
      // 연결된 다음 노드들 찾기
      const nextNodes = outgoingLinks.map(link => {
        const targetNode = this.nodes.find(n => 
          n.ports.some(p => p.id === link.target.id)
        );
        if (targetNode) {
          console.log('다음 노드 찾음:', targetNode.id, targetNode.type);
        }
        return targetNode;
      }).filter(Boolean);

      console.log('처리할 다음 노드들:', nextNodes.map(n => n.id));
      return nextNodes;
    },
    getPreviousNode(node) {
      console.log('getPreviousNode - 현재 노드:', node);
      console.log('getPreviousNode - 모든 링크:', this.links);
      
      // 현재 노드의 입력 포트로 들어오는 링크 찾기
      const incomingLink = this.links.find(link => {
        const isTargetPort = node.ports.some(port => {
          const isMatch = port.id === link.target.id;
          console.log('포트 비교:', port.id, link.target.id, isMatch);
          return isMatch;
        });
        console.log('링크 검사:', link, isTargetPort);
        return isTargetPort;
      });
      
      console.log('발견된 이전 연결:', incomingLink);

      if (!incomingLink) return null;
      
      // 이전 노드 찾기
      const previousNode = this.nodes.find(n => 
        n.ports.some(p => p.id === incomingLink.source.id)
      );
      
      console.log('이전 노드:', previousNode);
      return previousNode;
    },
    validateFlow() {
      const startNode = this.nodes.find(n => n.type === 'start');
      const endNode = this.nodes.find(n => n.type === 'end');
      
      if (!startNode || !endNode) {
        return false;
      }

      // 시작 노드부터 종료 노드까지의 경로 확인
      const visited = new Set();
      const queue = [startNode];
      
      while (queue.length > 0) {
        const currentNode = queue.shift();
        visited.add(currentNode.id);
        
        if (currentNode.id === endNode.id) {
          return true; // 종료 노드에 도달
        }
        
        const nextNodes = this.getNextNodes(currentNode);
        for (const nextNode of nextNodes) {
          if (!visited.has(nextNode.id)) {
            queue.push(nextNode);
          }
        }
      }
      
      return false; // 종료 노드에 도달할 수 없음
    },
    async startProcessing() {
      if (this.isProcessing) return;
      this.isProcessing = true;
      this.processedResults = new Map();
      
      try {
        // 시작 노드 찾기
        const startNode = this.nodes.find(n => n.type === 'start');
        if (!startNode) {
          throw new Error('시작 노드가 없습니다.');
        }
        if (!startNode.image) {
          throw new Error('시작 노드에 이미지를 먼저 업로드하세요.');
        }

        // 워크플로우 유효성 검사
        if (!this.validateFlow()) {
          throw new Error('시작 노드부터 종료 노드까지의 연결이 올바르지 않습니다.');
        }

        // 시작 노드의 이미지를 결과에 저장
        this.processedResults.set(startNode.id, startNode.image);
        
        // 다음 노드들 처리
        const nextNodes = this.getNextNodes(startNode);
        for (const nextNode of nextNodes) {
          await this.processNode(nextNode);
        }

        console.log('이미지 처리가 완료되었습니다.');
      } catch (error) {
        console.error('Processing error:', error);
        alert(error.message || '이미지 처리 중 오류가 발생했습니다.');
      } finally {
        this.isProcessing = false;
      }
    },
    async processNode(node) {
      if (!node) {
        console.error('Invalid node:', node);
        return;
      }

      console.log('노드 처리 시작:', node.id, node.type);
      this.processingNode = node;
      
      try {
        // 이전 노드 찾기
        const prevNode = this.getPreviousNode(node);
        console.log('이전 노드:', prevNode);
        
        if (!prevNode) {
          throw new Error('이전 노드를 찾을 수 없습니다.');
        }

        // 이전 노드의 처리 결과 가져오기
        const inputImage = this.processedResults.get(prevNode.id);
        console.log('입력 이미지:', inputImage ? '있음' : '없음');
        
        if (!inputImage) {
          throw new Error('처리할 이미지가 없습니다.');
        }

        // 노드 처리
        const result = await this.processNodeLogic(node, inputImage);
        console.log('노드 처리 결과:', result ? '성공' : '실패');
        
        this.processedResults.set(node.id, result);

        // 노드 업데이트 - 처리 결과 이미지 저장
        this.$emit('update-node', {
          ...node,
          processedImage: result
        });

        // 다음 노드들 처리
        const nextNodes = this.getNextNodes(node);
        console.log('다음 노드들:', nextNodes);
        
        for (const nextNode of nextNodes) {
          await this.processNode(nextNode);
        }
      } catch (error) {
        console.error(`Error processing node ${node.id}:`, error);
        throw error;
      }
    },
    async processNodeLogic(node, inputImage) {
      console.log('노드 처리 로직 시작:', node.type, node.options);
      
      if (!inputImage) {
        console.error('입력 이미지 없음');
        return null;
      }

      if (node.type === 'end') {
        return inputImage;
      }

      try {
        switch (node.options?.type) {
          case 'filter':
            return await processImage(inputImage, 'filter', node.options);
          case 'resize':
            return await processImage(inputImage, 'resize', node.options);
          case 'transform':
            return await processImage(inputImage, 'transform', node.options);
          default:
            console.log('기본 이미지 반환');
            return inputImage;
        }
      } catch (error) {
        console.error('이미지 처리 중 오류:', error);
        throw error;
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
    },
    // 노드 처리 결과 업데이트
    updateNodeProcessedImage(nodeId, processedImage) {
      const node = this.nodes.find(n => n.id === nodeId);
      if (node) {
        this.$emit('update-node', {
          ...node,
          processedImage
        });
      }
    },
    // 파일 업로드 처리
    handleFileUpload({ file, nodeId }) {
      console.log('파일 업로드 시작:', file, nodeId);
      
      if (!file) {
        console.error('파일이 없습니다.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        console.log('이미지 로드 완료:', imageUrl.substring(0, 50) + '...');
        
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
          this.$emit('update-node', {
            ...node,
            image: imageUrl
          });
          console.log('노드 이미지 업데이트 요청:', nodeId);
        }
      };
      reader.readAsDataURL(file);
    },
    completeLinkDrag({ dropX, dropY }) {
      if (!this.tempLink || !this.tempLink.sourcePort) {
        this.$emit('update-temp-link', null);
        return;
      }

      let targetPort = null;
      const threshold = 15 / this.scale;
      
      // 가장 가까운 입력 포트 찾기
      this.nodes.forEach(node => {
        if (!node.ports) return;
        
        node.ports.forEach(port => {
          if (port.type !== 'input') return;
          
          const dx = port.x - dropX;
          const dy = port.y - dropY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < threshold) {
            targetPort = port;
          }
        });
      });
      
      if (targetPort && this.tempLink.sourcePort.id !== targetPort.id) {
        // 연결 생성 전 순환 검사
        if (this.wouldCreateCycle(this.tempLink.sourcePort, targetPort)) {
          alert('순환 연결은 허용되지 않습니다.');
        } else {
          // 연결 생성 시 포트 정보 완전히 복사
          const newLink = {
            source: { 
              id: this.tempLink.sourcePort.id,
              x: this.tempLink.sourcePort.x,
              y: this.tempLink.sourcePort.y,
              type: this.tempLink.sourcePort.type
            },
            target: { 
              id: targetPort.id,
              x: targetPort.x,
              y: targetPort.y,
              type: targetPort.type
            }
          };
          console.log('새 연결 생성:', newLink);
          this.$emit('complete-link-drag', newLink);
        }
      }
      
      this.$emit('update-temp-link', null);
      this.isDraggingLink = false;
    },
    // 순환 연결 검사
    wouldCreateCycle(sourcePort, targetPort) {
      const sourceNode = this.nodes.find(n => 
        n.ports.some(p => p.id === sourcePort.id)
      );
      const targetNode = this.nodes.find(n => 
        n.ports.some(p => p.id === targetPort.id)
      );
      
      if (!sourceNode || !targetNode) return false;
      
      // 시작 노드로 돌아가는 연결 방지
      if (targetNode.type === 'start') {
        return true;
      }
      
      const visited = new Set();
      const queue = [targetNode];
      
      while (queue.length > 0) {
        const currentNode = queue.shift();
        visited.add(currentNode.id);
        
        if (currentNode.id === sourceNode.id) {
          return true; // 순환 발견
        }
        
        const nextNodes = this.getNextNodes(currentNode);
        for (const nextNode of nextNodes) {
          if (!visited.has(nextNode.id)) {
            queue.push(nextNode);
          }
        }
      }
      
      return false;
    },
    // 캔버스 크기 조정이 필요한 경우 호출
    adjustCanvasSize() {
      const nodes = this.nodes;
      if (!nodes.length) return;

      // 모든 노드의 x, y 좌표를 고려하여 필요한 캔버스 크기 계산
      const maxX = Math.max(...nodes.map(n => n.x + 100)); // 노드 너비와 여유 공간 고려
      const maxY = Math.max(...nodes.map(n => n.y + 100)); // 노드 높이와 여유 공간 고려

      this.canvasWidth = Math.max(2500, maxX);
      this.canvasHeight = Math.max(1200, maxY);
    },
  },
  watch: {
    nodes: {
      deep: true,
      handler() {
        this.adjustCanvasSize();
      }
    }
  }
};
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden; /* 컨테이너 자체는 오버플로우 숨김 */
}

.canvas {
  width: 100%;
  height: 100%;
  background-color: #f5f5f5;
  position: relative;
  overflow: auto;
  min-width: 2500px; /* 최소 너비 증가 */
  min-height: 1200px; /* 최소 높이 증가 */
}

/* 스크롤바 스타일링 */
.canvas::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.canvas::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.canvas::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.canvas::-webkit-scrollbar-thumb:hover {
  background: #555;
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