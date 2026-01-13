import React, { useState, useRef, useEffect } from 'react';

/**
 * 台灣證件照標準參數 (300 DPI)
 * 1英吋 = 25.4mm
 */
const CONFIG = {
  DPI: 300,
  PHOTO_2INCH: { mmW: 35, mmH: 45 },      // 2吋照片 (大頭)
  PAPER_4X6: { mmW: 101.6, mmH: 152.4 }, // 4x6 相片紙
  FACE_MIN_PERCENT: 0.7,                 // 臉部佔比下限 (70%)
  FACE_MAX_PERCENT: 0.8,                 // 臉部佔比上限 (80%)
};

// 單位轉換工具
const mmToPx = (mm) => Math.round((mm * CONFIG.DPI) / 25.4);

const TaiwanIDMaker = () => {
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef(null);       // 用於預覽與裁切
  const exportCanvasRef = useRef(null); // 用於拼板生成

  // 1. 處理圖片上傳
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setScale(0.5); // 初始縮放
          setOffset({ x: 0, y: 0 });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. 繪製預覽畫布與對齊輔助線
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // 清空畫布
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 繪製用戶照片
    ctx.save();
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();

    // --- 繪製台灣護照標準輔助線 ---
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);

    // 臉部參考橢圓 (頭頂到下顎需在 3.2~3.6cm 之間)
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.45, width * 0.3, height * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 頭頂輔助線
    ctx.beginPath();
    ctx.moveTo(0, height * 0.1); ctx.lineTo(width, height * 0.1);
    ctx.stroke();

    // 下顎輔助線
    ctx.beginPath();
    ctx.moveTo(0, height * 0.85); ctx.lineTo(width, height * 0.85);
    ctx.stroke();
    
  }, [image, scale, offset]);

  // 3. 生成 4x6 拼板 (ibon 格式)
  const generatePrintSheet = () => {
    setIsProcessing(true);
    const exportCanvas = exportCanvasRef.current;
    const ctx = exportCanvas.getContext('2d');

    const paperW = mmToPx(CONFIG.PAPER_4X6.mmW);
    const paperH = mmToPx(CONFIG.PAPER_4X6.mmH);
    const photoW = mmToPx(CONFIG.PHOTO_2INCH.mmW);
    const photoH = mmToPx(CONFIG.PHOTO_2INCH.mmH);

    exportCanvas.width = paperW;
    exportCanvas.height = paperH;

    // 背景填白
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, paperW, paperH);

    // 擷取目前預覽窗中的裁切結果
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = photoW;
    tempCanvas.height = photoH;
    const tCtx = tempCanvas.getContext('2d');
    
    // 繪製裁切後的圖 (移除輔助線，只抓照片)
    tCtx.save();
    tCtx.translate(photoW / 2 + (offset.x * (photoW/350)), photoH / 2 + (offset.y * (photoH/450)));
    tCtx.scale(scale * (photoW/350), scale * (photoH/450));
    tCtx.drawImage(image, -image.width / 2, -image.height / 2);
    tCtx.restore();

    // 拼板邏輯: 2x4 (8張)
    const gapX = (paperW - photoW * 2) / 3;
    const gapY = (paperH - photoH * 4) / 5;

    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 4; j++) {
        const x = gapX + i * (photoW + gapX);
        const y = gapY + j * (photoH + gapY);
        ctx.drawImage(tempCanvas, x, y);
        // 繪製淡灰色裁切參考線
        ctx.strokeStyle = '#EEEEEE';
        ctx.strokeRect(x, y, photoW, photoH);
      }
    }

    // 下載
    const link = document.createElement('a');
    link.download = `Taiwan_ID_Photo_${Date.now()}.jpg`;
    link.href = exportCanvas.toDataURL('image/jpeg', 0.95);
    link.click();
    setIsProcessing(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col p-4 shadow-lg">
      <header className="py-4 text-center border-b">
        <h1 className="text-xl font-bold">證件照自助製作</h1>
        <p className="text-xs text-gray-500">符合台灣身分證、護照規格</p>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center space-y-4 py-6">
        {!image ? (
          <div className="w-full h-80 border-2 border-dashed border-blue-300 rounded-xl flex flex-col items-center justify-center bg-white">
            <input 
              type="file" 
              id="upload" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <label htmlFor="upload" className="cursor-pointer text-center">
              <div className="text-4xl mb-2">📷</div>
              <div className="text-blue-600 font-medium">從相簿選取照片</div>
              <div className="text-xs text-gray-400 mt-1">建議背景單純、光線充足</div>
            </label>
          </div>
        ) : (
          <div className="w-full animate-fade-in">
            <div className="relative mx-auto bg-white p-2 shadow-md rounded-lg" style={{ width: '280px' }}>
              <canvas 
                ref={canvasRef} 
                width={350} 
                height={450} 
                className="w-full rounded border"
              />
              <p className="text-[10px] text-red-500 mt-2 text-center font-bold">請確保頭頂與下顎位於紅線之間</p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <label className="text-sm font-medium text-gray-700 flex justify-between">
                  調整縮放 <span>{Math.round(scale * 100)}%</span>
                </label>
                <input 
                  type="range" 
                  min="0.1" max="2" step="0.01" 
                  value={scale} 
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setImage(null)}
                  className="py-3 px-4 bg-gray-200 text-gray-700 rounded-xl font-medium"
                >
                  重新上傳
                </button>
                <button 
                  onClick={generatePrintSheet}
                  disabled={isProcessing}
                  className="py-3 px-4 bg-blue-600 text-white rounded-xl font-medium shadow-blue-200 shadow-lg active:scale-95 transition-transform"
                >
                  {isProcessing ? '處理中...' : '下載 ibon 拼板'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="text-[10px] text-gray-400 text-center leading-relaxed">
        ibon 列印提醒：<br />
        請選擇「4x6 相片紙列印」| 勿選「符合頁面大小」
      </footer>

      {/* 隱藏的導出畫布 */}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

export default TaiwanIDMaker;
