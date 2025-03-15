<!-- components/NodeList.vue -->
<template>
    <div class="sidebar">
      <h3>이미지 처리 노드</h3>
      <p v-if="loading">노드 불러오는 중...</p>
      <p v-else-if="error">{{ error }}</p>
      <p v-else>드래그하여 캔버스에 추가하세요</p>
      <div
        v-for="candidate in nodeCandidates"
        :key="candidate.id"
        class="node-candidate"
        draggable="true"
        @dragstart="onDragStart($event, candidate)"
      >
        {{ candidate.label }}
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: "NodeList",
    props: {
      nodeCandidates: {
        type: Array,
        required: true
      },
      loading: Boolean,
      error: String
    },
    methods: {
      onDragStart(event, candidate) {
        event.dataTransfer.setData("nodeCandidate", JSON.stringify(candidate));
        event.dataTransfer.effectAllowed = "copy";
      }
    }
  };
  </script>
  
  <style>
  .sidebar {
    width: 400px !important;
    background: #f4f4f4;
    padding: 20px;
    height: 100vh;
    overflow-y: auto;
    border-right: 1px solid #ddd;
  }
  
  .node-candidate {
    padding: 15px;
    margin: 10px 0;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: grab;
    transition: all 0.2s;
    font-size: 14px;
  }
  
  .node-candidate:hover {
    background: #f8f9fa;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  h3 {
    margin-bottom: 20px;
    color: #333;
  }
  </style>
  