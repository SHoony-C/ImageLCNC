<!-- components/ImageNode.vue -->
<template>
    <g @mousedown="selectThisNode">
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
        :class="{ 'node-rect': true, selected, processing: isProcessing }"
      />
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
        fill="black"
        @mousedown.stop="startLink($event, port)"
      ></circle>
      <!-- START 노드: 파일 업로드 -->
      <foreignObject
        v-if="node.type === 'start'"
        :x="node.x - 50"
        :y="node.y + 30"
        width="100"
        height="100"
      >
        <input type="file" @change="onFileChange" />
      </foreignObject>
      <!-- 노드 이미지(파일 업로드/처리 결과) -->
      <image
        v-if="node.image"
        :href="node.image"
        :x="node.x + 40"
        :y="node.y - 20"
        width="100"
        height="100"
        @click.stop="previewImage(node.image)"
      />
      <!-- 처리 결과 이미지 -->
      <image
        v-if="processedImage"
        :x="node.x + 60"
        :y="node.y"
        :width="60"
        :height="40"
        :href="processedImage"
        @click="$emit('preview-image', processedImage)"
      />
    </g>
  </template>
  
  <script>
  export default {
    name: "ImageNode",
    props: {
      node: { type: Object, required: true },
      selected: Boolean,
      isProcessing: Boolean,
      processedImage: String
    },
    computed: {
      nodeColor() {
        if (this.node.type === "start") return "#2ecc71";
        if (this.node.type === "end") return "#e74c3c";
        return "#3498db";
      }
    },
    methods: {
      handleMouseDown(event) {
        console.log('ImageNode - mousedown event');
        // 드래그를 위한 마우스다운은 유지
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
      startLink(_, port) {
        const startX = port.x;
        const startY = port.y;
        this.$emit("start-link-drag", { port, startX, startY });
      },
      onFileChange(event) {
        const file = event.target.files[0];
        this.$emit("file-upload", { file });
      },
      selectThisNode() {
        this.$emit("select-node", this.node);
      },
      previewImage(imgUrl) {
        this.$emit("preview-image", imgUrl);
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
  </style>
  