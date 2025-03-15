<!-- components/NodeSettings.vue -->
<template>
    <div class="node-settings">
      <h3>노드 설정</h3>
      <div v-if="selectedNode">
        <p><strong>선택된 노드:</strong> {{ selectedNode.label }}</p>
        <div v-if="selectedNode.options">
          <p><strong>Description:</strong> {{ selectedNode.options.description }}</p>
          <div v-for="(value, key) in selectedNode.options" :key="key">
            <template v-if="key !== 'description'">
              <label>{{ formatLabel(key) }}:</label>
              <input 
                v-if="typeof value === 'number'" 
                type="number" 
                v-model.number="localOptions[key]"
                @change="emitOptionsUpdate"
              >
              <select 
                v-else-if="Array.isArray(value)"
                v-model="localOptions[key]"
                @change="emitOptionsUpdate"
              >
                <option v-for="opt in value" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
              <input 
                v-else
                type="text" 
                v-model="localOptions[key]"
                @change="emitOptionsUpdate"
              >
            </template>
          </div>
        </div>
        <button 
          @click="deleteNode" 
          class="delete-btn"
          v-if="selectedNode.type !== 'start' && selectedNode.type !== 'end'"
        >
          노드 삭제
        </button>
      </div>
      <div v-else>
        <p>노드를 선택하세요.</p>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: "NodeSettings",
    props: {
      selectedNode: { type: Object, default: null }
    },
    data() {
      return {
        localOptions: {
          dropdown1Value: null,
          dropdown2Value: null,
          value1: 0,
          value2: 0
        }
      };
    },
    watch: {
      selectedNode: {
        immediate: true,
        handler(newVal) {
          console.log('NodeSettings - selectedNode changed:', newVal);
          if (!newVal || !newVal.options) {
            console.log('NodeSettings - Resetting localOptions');
            this.localOptions = { 
              dropdown1Value: null, 
              dropdown2Value: null, 
              value1: 0, 
              value2: 0 
            };
          } else {
            console.log('NodeSettings - Updating localOptions with:', newVal.options);
            this.localOptions = {
              ...newVal.options
            };
          }
        }
      }
    },
    methods: {
      deleteNode() {
        this.$emit("delete-node", this.selectedNode);
      },
      emitOptionsUpdate() {
        console.log('NodeSettings - emitOptionsUpdate:', this.localOptions);
        if (!this.selectedNode) return;
        
        const newOptions = {};
        for (const [key, value] of Object.entries(this.localOptions)) {
          if (key !== 'description') {
            newOptions[key] = value;
          }
        }
        
        console.log('NodeSettings - Emitting update-node-options:', newOptions);
        this.$emit('update-node-options', {
          node: this.selectedNode,
          options: {
            ...this.selectedNode.options,
            ...newOptions
          }
        });
      },
      
      formatLabel(key) {
        return key
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
  };
  </script>
  
  <style scoped>
  .node-settings {
    padding: 15px;
  }
  
  .node-settings label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  
  .node-settings input,
  .node-settings select {
    width: 100%;
    padding: 8px;
    margin-bottom: 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .delete-btn {
    margin-top: 15px;
    padding: 8px 15px;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .delete-btn:hover {
    background-color: #c82333;
  }
  </style>
  