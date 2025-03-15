// services/imageProcessingService.js
export function processImage(file) {
  // 이미지 처리 기능 구현 (예: 리사이즈, 필터 적용 등)
  return new Promise((resolve) => {
    // 임시: 파일 URL 반환
    resolve(URL.createObjectURL(file));
  });
}
