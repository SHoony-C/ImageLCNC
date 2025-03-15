// services/workflowService.js
export function saveWorkflow(workflow) {
  // 워크플로우 저장 (예: API 호출 또는 localStorage)
  localStorage.setItem('workflow', JSON.stringify(workflow));
}

export function loadWorkflow() {
  const data = localStorage.getItem('workflow');
  return data ? JSON.parse(data) : null;
}
