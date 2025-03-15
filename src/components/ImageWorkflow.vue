<!-- components/ImageWorkflow.vue -->
<template>
    <div class="workflow-container">
      <!-- 좌측: 노드 후보 목록 -->
      <NodeList
        :nodeCandidates="nodeCandidates"
        :loading="loading"
        :error="error"
      />
  
      <!-- 중앙: 캔버스 + 미니맵 (줌 기능 포함) -->
      <div class="canvas-container" @wheel.ctrl.prevent="onWheel">
        <ImageCanvas
          :nodes="nodes"
          :links="links"
          :tempLink="tempLink"
          :scale="scale"
          :selectedNodes="selectedNodes"
          @node-dropped="handleNodeDrop"
          @update-node="updateNode"
          @start-link-drag="startLinkDrag"
          @complete-link-drag="completeLinkDrag"
          @delete-link="deleteLink"
          @file-upload="handleFileUpload"
          @select-node="onNodeSelect"
          @update-temp-link="updateTempLink"
          @preview-image="previewImage"
          @update-pan-offset="updatePanOffset"
          @copy-selected-nodes="copySelectedNodes"
          @paste-nodes="pasteNodes"
        />
        <!-- 미니맵 -->
        <MiniMap :nodes="nodes" :links="links" :scale="scale" />
        
        <!-- Start Processing 버튼 - 절대 위치 -->
        <div class="processing-button">
          <button @click="startProcessing">Start Processing</button>
        </div>
      </div>
  
      <!-- 우측: 노드 설정 패널 -->
      <div class="right-panel">
        <NodeSettings 
          :selectedNode="selectedNode"
          @update-node-options="updateNodeOptions"
          @delete-node="deleteNode"
        />
      </div>
    </div>
  </template>
  
  <script>
  import NodeList from "./NodeList.vue";
  import ImageCanvas from "./ImageCanvas.vue";
  import MiniMap from "./MiniMap.vue";
  import NodeSettings from "./NodeSettings.vue";
  import { processImage } from "../services/imageProcessingService.js";
  
  export default {
    name: "ImageWorkflow",
    components: { NodeList, ImageCanvas, MiniMap, NodeSettings },
    data() {
      return {
        nodeCandidates: [],
        // 초기 노드
        nodes: [
          {
            id: "start",
            label: "START",
            type: "start",
            x: 100,
            y: 250,
            image: null, // 업로드 이미지
            ports: [{ id: "p1", x: 130, y: 250 }],
          },
          {
            id: "end",
            label: "END",
            type: "end",
            x: 500,
            y: 250,
            ports: [{ id: "p2", x: 470, y: 250 }],
          },
        ],
        links: [],
        tempLink: null,
        selectedNode: null,
        selectedNodes: [],
        copiedNodes: [],
        previewImageUrl: null,
        scale: 1,
        panOffset: { x: 0, y: 0 },
        loading: false,
        error: ""
      };
    },
    mounted() {
      this.fetchNodeCandidates();
      
      // 전역 키보드 이벤트 설정
      window.addEventListener('keydown', this.handleKeyDown);
    },
    beforeUnmount() {
      // 컴포넌트 소멸 시 이벤트 리스너 제거
      window.removeEventListener('keydown', this.handleKeyDown);
    },
    methods: {
      handleKeyDown(e) {
        // Ctrl+C, Ctrl+V 단축키 처리
        if (e.ctrlKey) {
          if (e.key === 'c') {
            this.copySelectedNodes();
          } else if (e.key === 'v') {
            this.pasteNodes();
          }
        }
      },
      async fetchNodeCandidates() {
        this.loading = true;
        this.error = "";
        try {
          const nodeDefs = [
            {
              id: "resize",
              label: "Resize Image",
              options: {
                type: "adjust",
                description: "Resize the image",
                dropdown1: ["Small", "Medium", "Large"],
                dropdown2: ["Scale 1x", "Scale 2x", "Scale 3x"],
                value1: 100,
                value2: 100
              },
            },
            {
              id: "rotate",
              label: "Rotate Image",
              options: {
                type: "transform",
                description: "Rotate the image",
                dropdown1: ["0°", "90°", "180°", "360°"],
                dropdown2: ["Clockwise", "Counterclockwise"],
                value1: 0,
                value2: 0
              },
            },
            {
              id: "filter",
              label: "Apply Filters",
              options: {
                type: "effect",
                description: "Apply filters to the image",
                dropdown1: ["None", "Grayscale", "Sepia", "Blur"],
                dropdown2: ["Low", "Medium", "High"],
                value1: 50,
                value2: 100
              },
            },
            {
              id: "threshold",
              label: "Thresholding",
              options: {
                type: "binarization",
                description: "Apply thresholding to the image",
                dropdown1: ["Binary", "Binary Inverted", "Truncate", "ToZero", "ToZero Inverted"],
                dropdown2: ["Low", "Medium", "High"],
                value1: 127,
                value2: 255
              },
            },
            {
              id: "canny",
              label: "Canny Edge Detection",
              options: {
                type: "edge_detection",
                description: "Detect edges using Canny algorithm",
                dropdown1: ["Low", "Medium", "High"],
                dropdown2: ["None", "Blurred", "Sharpened"],
                value1: 50,
                value2: 150
              },
            }
          ];
          await new Promise(r => setTimeout(r, 500));
          this.nodeCandidates = nodeDefs;
        } catch (e) {
          this.error = "노드 후보를 불러오는 중 오류가 발생했습니다.";
        } finally {
          this.loading = false;
        }
      },
      onWheel(e) {
        // 마우스 휠로 줌 (Ctrl 키와 함께)
        const delta = e.deltaY;
        const oldScale = this.scale;
        
        if (delta > 0) {
          this.scale = Math.max(0.5, this.scale - 0.1);
        } else {
          this.scale = Math.min(2, this.scale + 0.1);
        }
        
        // 줌의 중심이 마우스 위치가 되도록 오프셋 조정
        if (oldScale !== this.scale) {
          const rect = e.target.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          const oldWorldMouseX = (mouseX / oldScale) - this.panOffset.x;
          const oldWorldMouseY = (mouseY / oldScale) - this.panOffset.y;
          
          const newWorldMouseX = (mouseX / this.scale) - this.panOffset.x;
          const newWorldMouseY = (mouseY / this.scale) - this.panOffset.y;
          
          this.panOffset.x += (newWorldMouseX - oldWorldMouseX);
          this.panOffset.y += (newWorldMouseY - oldWorldMouseY);
        }
      },
      updatePanOffset(offset) {
        this.panOffset = offset;
      },
      handleNodeDrop({ nodeData, offsetX, offsetY }) {
        // 노드 생성 시 정확한 위치에 생성 (스케일 및 패닝 고려)
        const newNode = {
          ...nodeData,
          id: `node-${Date.now()}`,
          x: offsetX,
          y: offsetY,
          type: "normal",
          ports: [
            { id: `p1-${Date.now()}`, x: offsetX - 20, y: offsetY },
            { id: `p2-${Date.now()}`, x: offsetX + 20, y: offsetY },
          ],
          image: null
        };
        this.nodes.push(newNode);
        
        // 새 노드를 선택 상태로 설정
        this.selectedNode = newNode;
        this.selectedNodes = [newNode];
      },
      updateNode(updatedNode) {
        const idx = this.nodes.findIndex(n => n.id === updatedNode.id);
        if (idx !== -1) {
          this.nodes[idx] = updatedNode;
          
          // 선택된 노드도 업데이트
          if (this.selectedNode && this.selectedNode.id === updatedNode.id) {
            this.selectedNode = updatedNode;
          }
        }
        
        // 연결선 좌표 업데이트
        this.links.forEach(link => {
          updatedNode.ports.forEach(port => {
            if (link.source.id === port.id) {
              link.source = { ...port };
            }
            if (link.target.id === port.id) {
              link.target = { ...port };
            }
          });
        });
      },
      updateTempLink(updatedTempLink) {
        this.tempLink = updatedTempLink;
      },
      startLinkDrag({ port, startX, startY }) {
        this.tempLink = {
          x1: startX,
          y1: startY,
          x2: startX,
          y2: startY,
          sourcePort: port
        };
      },
      completeLinkDrag({ dropX, dropY }) {
        let targetPort = null;
        const threshold = 15 / this.scale; // 스케일 고려하여 인식 범위 조정
        
        this.nodes.forEach(n => {
          n.ports.forEach(p => {
            const dx = p.x - dropX;
            const dy = p.y - dropY;
            if (Math.sqrt(dx * dx + dy * dy) < threshold) {
              targetPort = p;
            }
          });
        });
        
        if (targetPort && targetPort.id !== this.tempLink.sourcePort.id) {
          this.links.push({ source: this.tempLink.sourcePort, target: targetPort });
        }
        this.tempLink = null;
      },
      deleteLink(index) {
        this.links.splice(index, 1);
      },
      handleFileUpload({ file }) {
        if (!file) return;
        const startNode = this.nodes.find(n => n.type === "start");
        if (startNode) {
          startNode.image = URL.createObjectURL(file);
          this.updateNode(startNode);
        }
      },
      onNodeSelect(node) {
        console.log('ImageWorkflow - onNodeSelect:', node);
        this.selectedNode = node;
      },
      previewImage(imageUrl) {
        this.previewImageUrl = imageUrl;
      },
      updateNodeOptions({ node, options }) {
        const updatedNode = {
          ...node,
          options: {
            ...node.options,
            ...options
          }
        };
        
        // nodes 배열에서 해당 노드 업데이트
        const nodeIndex = this.nodes.findIndex(n => n.id === node.id);
        if (nodeIndex !== -1) {
          this.nodes[nodeIndex] = updatedNode;
          this.selectedNode = updatedNode; // 선택된 노드도 업데이트
        }
      },
      deleteNode(node) {
        if (node.type === 'start' || node.type === 'end') {
          alert('시작/종료 노드는 삭제할 수 없습니다.');
          return;
        }
        
        this.nodes = this.nodes.filter(n => n.id !== node.id);
        this.links = this.links.filter(link => {
          return !node.ports.some(port => 
            port.id === link.source.id || port.id === link.target.id
          );
        });
        this.selectedNode = null;
      },
      // Start Processing
      startProcessing() {
        const startNode = this.nodes.find(n => n.type === "start");
        if (!startNode || !startNode.image) {
          alert("먼저 START 노드에서 이미지를 업로드하세요.");
          return;
        }
        
        // 처리 가능한 연결 경로 탐색 및 실행
        this.nodes.forEach(node => {
          if (node.type !== "start" && node.type !== "end" && node.options) {
            // 이 노드로 들어오는 연결 확인
            const hasInput = this.links.some(link => 
              node.ports.some(port => port.id === link.target.id)
            );
            
            if (hasInput) {
              processImage(startNode.image, node.options.type, node.options)
                .then(result => {
                  const updatedNode = { ...node, image: result };
                  this.updateNode(updatedNode);
                })
                .catch(error => {
                  console.error(`노드 ${node.id} 처리 중 오류:`, error);
                });
            }
          }
        });
      },
      groupSelectedNodes() {
        if (this.selectedNodes.length < 2) {
          alert("두 개 이상의 노드를 선택해야 그룹화할 수 있습니다.");
          return;
        }
        const groupId = `group-${Date.now()}`;
        this.selectedNodes.forEach(n => {
          n.groupId = groupId;
          this.updateNode(n);
        });
        alert("노드 그룹화 완료 (Group ID: " + groupId + ")");
      },
      copySelectedNodes() {
        if (!this.selectedNodes.length) {
          alert("복사할 노드가 선택되지 않았습니다.");
          return;
        }
        this.copiedNodes = JSON.parse(JSON.stringify(this.selectedNodes));
        console.log("노드 복사 완료");
      },
      pasteNodes() {
        if (!this.copiedNodes.length) {
          alert("붙여넣을 노드가 없습니다.");
          return;
        }
        
        const offset = 30;
        const newNodes = [];
        
        this.copiedNodes.forEach(node => {
          // 고유 ID 생성 및 위치 조정
          const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const portIds = node.ports.map(() => `port-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
          
          const newNode = {
            ...node,
            id: nodeId,
            x: node.x + offset,
            y: node.y + offset,
            ports: node.ports.map((port, idx) => ({
              ...port,
              id: portIds[idx],
              x: port.x + offset,
              y: port.y + offset
            }))
          };
          
          newNodes.push(newNode);
        });
        
        // 새 노드들을 노드 목록에 추가
        this.nodes = [...this.nodes, ...newNodes];
        
        // 새로 붙여넣은 노드들을 선택 상태로 설정
        this.selectedNodes = newNodes;
        this.selectedNode = newNodes[0];
        
        console.log("노드 붙여넣기 완료");
      },
      formatLabel(key) {
        // 언더스코어를 공백으로 변환하고 각 단어의 첫 글자를 대문자로 변환
        return key
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      },
      handleNodeSelect(node) {
        console.log('ImageWorkflow - handleNodeSelect:', node);
        this.selectedNode = node;
      }
    }
  };
  </script>
  
  <style scoped>
  .workflow-container {
    display: flex;
    /* 화면 전체 차지 */
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }
  
  .sidebar {
    width: 200px;
    background: #f4f4f4;
    padding: 10px;
    overflow-y: auto;
  }
  
  .canvas-container {
    flex-grow: 1;
    position: relative;
    overflow: hidden;
    background: #fff;
    border: 1px solid #ccc;
  }
  
  .right-panel {
    width: 300px;
    background: #f8f9fa;
    border-left: 1px solid #dee2e6;
    padding: 20px;
    overflow-y: auto;
  }
  
  .actions button {
    display: block;
    width: 100%;
    margin-bottom: 10px;
  }
  
  .image-preview {
    margin-top: 20px;
    padding: 15px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .image-preview img {
    max-width: 100%;
    border-radius: 4px;
  }
  
  /* Start Processing 버튼 - 우하단 절대 위치 */
  .processing-button {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 100;
  }
  
  .processing-button button {
    padding: 12px 20px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    transition: all 0.3s;
  }
  
  .processing-button button:hover {
    background-color: #45a049;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  }

  .node-settings-panel {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    padding: 20px;
    margin-bottom: 20px;
  }

  .setting-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .node-type {
    font-weight: bold;
    font-size: 1.1em;
  }

  .delete-btn {
    padding: 5px 10px;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .delete-btn:hover {
    background-color: #c82333;
  }

  .settings-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .setting-group label {
    font-weight: 500;
    color: #495057;
  }

  .description {
    color: #6c757d;
    font-size: 0.9em;
    margin: 5px 0;
  }

  .setting-group input,
  .setting-group select {
    padding: 8px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    width: 100%;
  }

  .setting-group input:focus,
  .setting-group select:focus {
    border-color: #80bdff;
    outline: none;
    box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
  }

  .no-selection {
    text-align: center;
    color: #6c757d;
    padding: 20px;
  }
  </style>