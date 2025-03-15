<!-- components/ImageNode.vue -->
<template>
    <g :class="['node', { selected: isSelected }]" @mousedown="selectThisNode">
      <rect
        :x="node.x - 30"
        :y="node.y - 20"
        width="60"
        height="40"
        rx="5"
        ry="5"
        :fill="nodeColor"
        class="draggable"
        @mousedown.stop="handleMouseDown"
        @click.stop="selectNode"
        :class="['node-rect', nodeTypeClass, {
          'selected': selected,
          'processing': isProcessing
        }]"
      ></rect>
      <text
        :x="node.x"
        :y="node.y + 5"
        text-anchor="middle"
        fill="white"
        class="no-drag"
      >
        {{ node.label }}
      </text>
      <!-- 포트 (연결점) -->
      <circle
        v-for="port in node.ports"
        :key="port.id"
        :cx="port.x"
        :cy="port.y"
        r="5"
        :fill="getPortColor(port)"
        @mousedown.stop="startLink($event, port)"
        :class="['port', { 'disabled': isPortDisabled(port) }]"
      ></circle>
      <!-- START 노드: 파일 업로드 -->
      <foreignObject
        v-if="node.type === 'start'"
        :x="node.x - 50"
        :y="node.y + 30"
        width="100"
        height="40"
      >
        <div class="file-upload-btn">
          <input 
            type="file" 
            accept="image/*"
            @change="onFileChange"
            class="file-input"
          />
          [파일선택]
        </div>
      </foreignObject>
      <!-- 노드 이미지(파일 업로드/처리 결과) -->
      <image
        v-if="node.image"
        :href="node.image"
        :x="node.x + 40"
        :y="node.y - 40"
        width="80"
        height="80"
        @click.stop="previewImage(node.image)"
        class="node-image"
      />
      <!-- 처리 결과 이미지 -->
      <image
        v-if="node.processedImage"
        :href="node.processedImage"
        :x="node.x + 40"
        :y="node.y - 40"
        width="80"
        height="80"
        @click.stop="previewImage(node.processedImage)"
        class="node-image"
      />
    </g>
  </template>
  
  <script>
  export default {
    name: "ImageNode",
    props: {
      node: { type: Object, required: true },
      selected: Boolean,
      isProcessing: Boolean
    },
    computed: {
      nodeColor() {
        if (this.node.type === "start") return "#2ecc71";
        if (this.node.type === "end") return "#e74c3c";
        return "#3498db";
      },
      nodeTypeClass() {
        switch(this.node.id) {
          case 'start':
            return 'node-start';
          case 'end_data':
            return 'node-end';
          case 'end_back':
            return 'node-end-back';
          case 'end_draw':
            return 'node-end-draw';
          case 'end_image':
            return 'node-end-image';
          default:
            return 'node-process';
        }
      }
    },
    methods: {
      handleMouseDown(event) {
        event.stopPropagation(); // 이벤트 전파 중단
        this.$emit('mousedown-on-node', this.node, event);
      },
      selectNode(event) {
        console.log('ImageNode - selectNode:', this.node);
        event.stopPropagation(); // 이벤트 전파 중단
        this.$emit('select-node', this.node);
      },
      startDrag() {
        const canvasRect = this.$el.ownerSVGElement.getBoundingClientRect();
        const onMouseMove = (e) => {
          const newX = e.clientX - canvasRect.left;
          const newY = e.clientY - canvasRect.top;
          const newPorts = this.node.ports.map((port, idx) => {
            if (this.node.type === "start") {
              return { ...port, x: newX + 30, y: newY };
            } else if (this.node.type === "end") {
              return { ...port, x: newX - 30, y: newY };
            } else {
              return { ...port, x: newX + (idx === 0 ? -20 : 20), y: newY };
            }
          });
          const newNode = { ...this.node, x: newX, y: newY, ports: newPorts };
          this.$emit("update-node", newNode);
        };
        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      },
      startLink(event, port) {
        event.preventDefault(); // 브라우저 기본 드래그 동작 방지
        event.stopPropagation(); // 이벤트 전파 중단
        
        if (port.type === 'input') {
          console.log('입력 포트에서는 연결을 시작할 수 없습니다.');
          return;
        }
        
        this.$emit('start-link-drag', event, port);
      },
      canStartLink(port) {
        // 출력 포트에서만 연결 가능
        return port.type === 'output';
      },
      isPortDisabled(port) {
        // 입력 포트만 비활성화
        return port.type === 'input';
      },
      getPortColor(port) {
        if (port.type === 'input') {
          return '#4CAF50'; // 입력 포트는 초록색
        }
        return '#2196F3'; // 출력 포트는 파란색
      },
      onFileChange(event) {
        const file = event.target.files[0];
        if (file) {
          console.log('파일 선택됨:', file.name, file.type);
          if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
          }
          this.$emit('file-upload', { 
            file,
            nodeId: this.node.id
          });
        }
      },
      selectThisNode() {
        this.$emit("select-node", this.node);
      },
      previewImage(imageUrl) {
        console.log('이미지 미리보기:', imageUrl);
        this.$emit('preview-image', imageUrl);
      }
    }
  };
  </script>
  
  <style scoped>
  .no-drag {
    pointer-events: none;
    user-select: none;
  }
  .draggable {
    cursor: pointer;
  }
  .selected {
    stroke: #2196F3;
    stroke-width: 2px;
  }
  .processing {
    stroke: #3498db;
    stroke-width: 2px;
    animation: pulse 1s infinite;
  }
  .port {
    cursor: pointer;
  }
  .port.disabled {
    cursor: not-allowed;
  }
  .file-upload-btn {
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
    text-align: center;
    width: 100px;
  }
  .file-input {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
  .node-group {
    user-select: none;
  }
  .node-image {
    cursor: pointer;
  }
  .node-image:hover {
    opacity: 0.8;
  }
  .node-start rect {
    fill: #4CAF50;
    stroke: #45a049;
  }
  .node-end rect {
    fill: #f44336;
    stroke: #d32f2f;
  }
  .node-end-back rect {
    fill: #9C27B0;
    stroke: #7B1FA2;
  }
  .node-end-draw rect {
    fill: #FF9800;
    stroke: #F57C00;
  }
  .node-end-image rect {
    fill: #2196F3;
    stroke: #1976D2;
  }
  .node-process rect {
    fill: #78909C;
    stroke: #546E7A;
  }
  .node-end-back {
    fill: #673AB7;    /* 진한 보라색 */
    stroke: #512DA8;
  }
  .node-end-draw {
    fill: #673AB7;    /* 진한 보라색 */
    stroke: #512DA8;
  }
  .node-end-image {
    fill: #673AB7;    /* 진한 보라색 */
    stroke: #512DA8;
  }
  .node-end-back:hover {
    fill: #7E57C2;
  }
  .node-end-draw:hover {
    fill: #7E57C2;
  }
  .node-end-image:hover {
    fill: #7E57C2;
  }
  </style>
  