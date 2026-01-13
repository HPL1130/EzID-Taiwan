import React, { useState, useRef, useEffect } from 'react';

/**
 * 台灣證件照規格定義 (300 DPI)
 */
const SPECS = {
  TWO_INCH: { 
    id: '2inch',
    label: '2 吋大頭照',
    subLabel: '護照、身分證、健保卡',
    mmW: 35, 
    mmH: 45, 
    cols: 2, 
    rows: 4, 
    total: 8,
    guideColor: 'rgba(255, 59, 48, 0.7)', // 護照紅
    faceRatio: { top: 0.1, bottom: 0.85, ellipseW: 0.3, ellipseH: 0.38 }
  },
  ONE_INCH: { 
    id: '1inch',
    label: '1 吋照片',
    subLabel: '一般證照、履歷、學生證',
    mmW: 28, 
    mmH: 35, 
    cols: 3, 
    rows: 4, 
    total: 12,
    guideColor: 'rgba(0, 122, 255, 0.7)', // 證照藍
    faceRatio: { top: 0.15, bottom: 0.8, ellipseW: 0.28, ellipseH: 0.35 }
  }
};

const PAPER_4X6 = { mmW: 101.6, mmH: 152.4 };
const mmToPx = (mm) => Math.round((mm * 300) / 25.4);

const EzIDApp = () => {
  const [image, setImage] = useState(null);
  const [currentSpec, setCurrentSpec] = useState(SPECS.TWO_INCH);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef(null);
  const exportCanvasRef = useRef(null);

  // 檔案讀取
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (f) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setScale(0.5);
          setOffset({ x: 0, y: 0 });
        };
        img.src = f.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // 繪製預覽與輔助線
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // 繪製照片
    ctx.save();
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();

    // 繪製動態輔助線
    const { guideColor, faceRatio } = currentSpec;
    ctx.strokeStyle = guideColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    // 橢圓參考線
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.45, width * faceRatio.ellipseW, height * faceRatio.ellipseH, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 頭頂與下顎線
    ctx.beginPath();
    ctx.moveTo(0, height * faceRatio.top); ctx.lineTo(width, height * faceRatio.top);
    ctx.moveTo(0, height * faceRatio.bottom); ctx.lineTo(width, height * faceRatio.bottom);
    ctx.stroke();
  }, [image, scale, offset, currentSpec]);

  // 生成 ibon 4x6 拼板
  const generateIbonPrint = () => {
    setIsProcessing(true);
    const exportCanvas = exportCanvasRef.current;
    const ctx = exportCanvas.getContext('2d');
    const paperW = mmToPx(PAPER_4X6.mmW);
    const paperH = mmToPx(PAPER_4X6.mmH);
    const photoW = mmToPx(currentSpec.mmW);
    const photoH = mmToPx(currentSpec.mmH);

    exportCanvas.width = paperW;
    exportCanvas.height = paperH;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, paperW, paperH);

    // 擷取裁切後的單張
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = photoW;
    tempCanvas.height = photoH;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.save();
    tCtx.translate(photoW / 2 + (offset.x * (photoW/350)), photoH / 2 + (offset.y * (photoH/450)));
    tCtx.scale(scale * (photoW/350), scale * (photoH/450));
    tCtx.drawImage(image, -image.width / 2, -image.height / 2);
    tCtx.restore();

    // 自動排版邏輯
    const gapX = (paperW - (photoW * currentSpec.cols)) / (currentSpec.cols + 1);
    const gapY = (paperH - (photoH * currentSpec.rows)) / (currentSpec.rows + 1);

    for (let i = 0; i < currentSpec.cols; i++) {
      for (let j = 0; j < currentSpec.rows; j++) {
        const x = gapX + i * (photoW + gapX);
        const y = gapY + j * (photoH + gapY);
        ctx.drawImage(tempCanvas, x, y);
        ctx.strokeStyle = '#EEEEEE'; // 極細邊框利於裁切
        ctx.strokeRect(x, y, photoW, photoH);
      }
    }

    const link = document.createElement('a');
    link.download = `EzID_${currentSpec.id}_${Date.now()}.jpg`;
    link.href = exportCanvas.toDataURL('image/jpeg', 0.95);
    link.click();
    setIsProcessing(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col font-sans">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b">
        <div>
          <h1 className="text-xl font-bold text-gray-800">選擇照片來源</h1>
          <p className="text-xs text-gray-500 mt-1">建議單人、背景單純以提高品質</p>
        </div>
        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 font-bold">Ez</div>
      </div>

      <main className="flex-1 p-6 flex flex-col items-center">
        {/* 規格切換按鈕 */}
        <div className="w-full flex bg-gray-100 p-1 rounded-xl mb-6">
          {Object.values(SPECS).map((spec) => (
            <button
              key={spec.id}
              onClick={() => setCurrentSpec(spec)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                currentSpec.id === spec.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'
              }`}
            >
              {spec.id === '2inch' ? '2 吋' : '1 吋'}
            </button>
          ))}
        </div>

        {!image ? (
          <div className="w-full flex flex-col gap-4">
            <label className="w-full py-12 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors">
              <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl mb-3 shadow-lg shadow-blue-100">＋</div>
              <span className="text-blue-600 font-bold">從相簿選取</span>
            </label>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {/* 編輯區域 */}
            <div className="relative mx-auto bg-gray-100 rounded-2xl p-3 shadow-inner" style={{ width: '280px' }}>
              <canvas ref={canvasRef} width={350} height={450} className="w-full rounded-lg bg-white shadow-md" />
              <div className="absolute top-6 right-6 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-md">
                {currentSpec.label}
              </div>
            </div>

            {/* 控制器 */}
            <div className="bg-gray-50 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">縮放對齊</span>
                <span className="text-xs font-mono text-blue-600 font-bold">{Math.round(scale * 100)}%</span>
              </div>
              <input 
                type="range" min="0.1" max="2" step="0.01" value={scale} 
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => setOffset(o => ({...o, y: o.y-10}))} className="py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold active:bg-gray-100 text-gray-700">上移</button>
                <button onClick={() => setOffset(o => ({...o, y: o.y+10}))} className="py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold active:bg-gray-100 text-gray-700">下移</button>
              </div>
            </div>

            {/* 輸出按鈕 */}
            <button 
              onClick={generateIbonPrint}
              disabled={isProcessing}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 active:scale-[0.98] transition-all disabled:bg-gray-400"
            >
              {isProcessing ? '正在處理...' : `輸出 ${currentSpec.total} 張拼板檔`}
            </button>
            <button onClick={() => setImage(null)} className="w-full text-sm text-gray-400 font-bold">取消並重新挑選</button>
          </div>
        )}
      </main>

      <footer className="p-6 text-center">
        <div className="inline-block bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
          <p className="text-[10px] text-orange-600 font-medium leading-tight">
            💡 ibon 列印提示：選擇「4x6 相片紙列印」<br />
            並確認比例為「原始大小」
          </p>
        </div>
      </footer>
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

export default EzIDApp;
