// services/imageProcessingService.js
export async function processImage(imageUrl, type, options) {
  // 실제 이미지 처리 로직은 백엔드에서 처리하거나 별도 라이브러리를 사용해야 합니다
  // 여기서는 예시로 간단한 처리만 구현
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // 노드 타입에 따른 이미지 처리
      switch (type) {
        case 'filter':
          applyFilter(ctx, canvas, options);
          break;
        case 'resize':
          applyResize(ctx, canvas, img, options);
          break;
        case 'transform':
          applyTransform(ctx, canvas, img, options);
          break;
        // 다른 처리 타입들 추가 가능
      }

      resolve(canvas.toDataURL());
    };
    img.src = imageUrl;
  });
}

function applyFilter(ctx, canvas, options) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  switch (options.dropdown1) {
    case 'Grayscale':
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
      }
      break;
    case 'Sepia':
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = (r * 0.393) + (g * 0.769) + (b * 0.189);
        data[i + 1] = (r * 0.349) + (g * 0.686) + (b * 0.168);
        data[i + 2] = (r * 0.272) + (g * 0.534) + (b * 0.131);
      }
      break;
    case 'Blur':
      // 간단한 블러 효과
      // 실제로는 더 복잡한 알고리즘을 사용해야 합니다
      break;
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyResize(ctx, canvas, img, options) {
  const scale = options.value1 / 100;
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function applyTransform(ctx, canvas, img, options) {
  const angle = parseInt(options.dropdown1) || 0;
  canvas.width = img.height;
  canvas.height = img.width;
  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.rotate(angle * Math.PI / 180);
  ctx.drawImage(img, -img.width/2, -img.height/2);
}
  