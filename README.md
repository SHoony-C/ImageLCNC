project-root/
├── components/
│   ├── ImageWorkflow.vue       # 메인 워크플로우 컴포넌트
│   ├── ImageCanvas.vue         # 캔버스 구현
│   ├── NodeList.vue            # 노드 후보 목록
│   ├── NodeSettings.vue        # 노드 설정 패널
│   ├── ImageNode.vue           # 이미지 처리 노드 컴포넌트
│   └── ConnectionLine.vue      # 연결선 컴포넌트
├── services/
│   ├── imageProcessingService.js  # 이미지 처리 기능 구현
│   └── workflowService.js        # 워크플로우 저장/불러오기 기능
├── utils/
│   └── canvasUtils.js           # 캔버스 관련 유틸리티 함수
├── config/
│   └── nodeTypes.js             # 이미지 처리 노드 유형 정의
└── App.vue                      # 앱 메인 파일