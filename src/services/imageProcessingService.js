// services/imageProcessingService.js
export function processImage(imageUrl, operation) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 예시: 원본 이미지 URL에 처리 옵션을 쿼리 파라미터로 추가
        resolve(`${imageUrl}?processed=${operation}`);
      }, 500);
    });
  }
  