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
          @update-node="handleNodeUpdate"
          @update-links="handleLinksUpdate"
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
  import { processImage } from "@/services/ImageProcessingService";
  
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
            x: 150,        // 왼쪽 위 위치
            y: 100,
            image: null,
            ports: [
              { 
                id: "start-port-out", 
                x: 180,     // start 노드의 x + 30
                y: 100,
                type: 'output'
              }
            ],
          },
          {
            id: "end_back",
            label: "END_BACK",
            type: "process",
            x: 600,
            y: 200,
            ports: [
              { 
                id: "end-back-port-in", 
                x: 570,
                y: 200,
                type: 'input'
              },
              { 
                id: "end-back-port-out", 
                x: 630,
                y: 200,
                type: 'output'
              }
            ],
          },
          {
            id: "end_draw",
            label: "END_DRAW",
            type: "process",
            x: 600,
            y: 300,
            ports: [
              { 
                id: "end-draw-port-in", 
                x: 570,
                y: 300,
                type: 'input'
              },
              { 
                id: "end-draw-port-out", 
                x: 630,
                y: 300,
                type: 'output'
              }
            ],
          },
          {
            id: "end_image",
            label: "END_IMAGE",
            type: "process",
            x: 600,
            y: 400,
            ports: [
              { 
                id: "end-image-port-in", 
                x: 570,
                y: 400,
                type: 'input'
              },
              { 
                id: "end-image-port-out", 
                x: 630,
                y: 400,
                type: 'output'
              }
            ],
          },
          {
            id: "end_data",
            label: "END_DATA",
            type: "end",
            x: 600,
            y: 500,
            ports: [
              { 
                id: "end-data-port-in", 
                x: 570,
                y: 500,
                type: 'input'
              }
            ],
          }
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
        // 일반 노드 생성 시 정확한 위치에 생성 (스케일 및 패닝 고려)
        const newNode = {
          ...nodeData,
          id: `node-${Date.now()}`,
          x: offsetX,
          y: offsetY,
          type: "normal",
          ports: [
            { 
              id: `port-in-${Date.now()}`, 
              x: offsetX - 20, 
              y: offsetY,
              type: 'input'
            },
            { 
              id: `port-out-${Date.now()}`, 
              x: offsetX + 20, 
              y: offsetY,
              type: 'output'
            }
          ],
          image: null
        };
        this.nodes.push(newNode);
        
        // 새 노드를 선택 상태로 설정
        this.selectedNode = newNode;
        this.selectedNodes = [newNode];
      },
      handleNodeUpdate(updatedNode) {
        const index = this.nodes.findIndex(n => n.id === updatedNode.id);
        if (index !== -1) {
          // 노드 업데이트 시 포트 정보도 완전히 복사
          const newNode = {
            ...updatedNode,
            ports: updatedNode.ports.map(port => ({
              id: port.id,
              x: port.x,
              y: port.y,
              type: port.type
            }))
          };
          this.nodes.splice(index, 1, newNode);

          // 관련된 연결들의 포트 정보도 업데이트
          this.links = this.links.map(link => {
            const newLink = { ...link };
            updatedNode.ports.forEach(port => {
              if (link.source.id === port.id) {
                newLink.source = {
                  id: port.id,
                  x: port.x,
                  y: port.y,
                  type: port.type
                };
              }
              if (link.target.id === port.id) {
                newLink.target = {
                  id: port.id,
                  x: port.x,
                  y: port.y,
                  type: port.type
                };
              }
            });
            return newLink;
          });
        }
      },
      handleLinksUpdate(updatedLinks) {
        this.links = [...updatedLinks];
      },
      updateTempLink(newTempLink) {
        this.tempLink = newTempLink;
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
      completeLinkDrag({ source, target }) {
        // 깊은 복사로 연결 정보 저장
        const newLink = {
          source: { 
            id: source.id,
            x: source.x,
            y: source.y,
            type: source.type
          },
          target: { 
            id: target.id,
            x: target.x,
            y: target.y,
            type: target.type
          }
        };
        console.log('연결 추가:', newLink);
        this.links.push(newLink);
      },
      deleteLink(index) {
        this.links.splice(index, 1);
      },
      handleFileUpload({ file }) {
        if (!file) return;
        const startNode = this.nodes.find(n => n.type === "start");
        if (startNode) {
          startNode.image = URL.createObjectURL(file);
          this.handleNodeUpdate(startNode);
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
      async startProcessing() {
        console.log('처리 시작');
        const startNode = this.nodes.find(n => n.type === 'start');
        
        if (!startNode) {
          alert('시작 노드가 없습니다.');
          return;
        }

        console.log('시작 노드 상태:', startNode);
        if (!startNode.image) {
          alert('시작 노드에 이미지를 먼저 업로드하세요.');
          return;
        }

        try {
          // 모든 노드의 processedImage 초기화
          this.nodes.forEach(node => {
            if (node.type !== 'start') {
              this.handleNodeUpdate({
                ...node,
                processedImage: null
              });
            }
          });

          // 시작 노드의 다음 노드들부터 처리 시작
          const nextNodes = this.getNextNodes(startNode);
          console.log('처리할 다음 노드들:', nextNodes);
          
          for (const nextNode of nextNodes) {
            await this.processNode(nextNode, startNode.image);
          }
          
          console.log('처리 완료');
        } catch (error) {
          console.error('처리 중 오류:', error);
          alert('이미지 처리 중 오류가 발생했습니다.');
        }
      },
      async processNode(node, inputImage) {
        console.log('노드 처리 시작:', node.id, node.type, '입력 이미지:', inputImage ? '있음' : '없음');

        if (node.type === 'end') {
          console.log('종료 노드 도달');
          return;
        }

        try {
          // 이미지 처리
          console.log('이미지 처리 중:', node.label);
          const result = await processImage(inputImage, node.options.type, node.options);
          
          // 결과 저장
          this.handleNodeUpdate({
            ...node,
            processedImage: result
          });

          // 다음 노드들 처리
          const nextNodes = this.getNextNodes(node);
          console.log('다음 노드들:', nextNodes);
          
          for (const nextNode of nextNodes) {
            await this.processNode(nextNode, result);
          }
        } catch (error) {
          console.error(`노드 처리 중 오류 (${node.label}):`, error);
          throw error;
        }
      },
      getNextNodes(node) {
        const outgoingLinks = this.links.filter(link => 
          node.ports.some(p => p.id === link.source.id)
        );
        console.log('발견된 연결:', outgoingLinks);
        
        return outgoingLinks.map(link => 
          this.nodes.find(n => 
            n.ports.some(p => p.id === link.target.id)
          )
        ).filter(Boolean); // null/undefined 제거
      },
      validateFlow() {
        // 시작 노드가 있는지 확인
        const startNode = this.nodes.find(n => n.type === 'start');
        if (!startNode) return false;

        // 모든 노드가 연결되어 있는지 확인
        const visited = new Set();
        const traverse = (node) => {
          if (visited.has(node.id)) return true;
          visited.add(node.id);
          
          const nextNodes = this.getNextNodes(node);
          if (nextNodes.length === 0 && node.type !== 'end') return false;
          
          return nextNodes.every(traverse);
        };
        
        return traverse(startNode);
      },
      groupSelectedNodes() {
        if (this.selectedNodes.length < 2) {
          alert("두 개 이상의 노드를 선택해야 그룹화할 수 있습니다.");
          return;
        }
        const groupId = `group-${Date.now()}`;
        this.selectedNodes.forEach(n => {
          n.groupId = groupId;
          this.handleNodeUpdate(n);
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