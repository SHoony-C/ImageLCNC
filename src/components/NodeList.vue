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
  
  <style scoped>
  .node-candidate {
    padding: 10px;
    margin: 5px;
    background: #ddd;
    cursor: grab;
  }
  </style>
  