import React, { useState, useRef, useEffect, useCallback } from 'react';
import imglyRemoveBackground from "@imgly/background-removal"; // 引入去背庫

/**
 * 台灣證件照規格定義 (300 DPI)
 * faceRatio: { top, bottom, ellipseW, ellipseH } 用於調整輔助線比例
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
  },
  MIXED_4_4: { // 4張2吋 + 4張1吋
    id: 'mixed',
    label: '4+4 混合排版',
    subLabel: '一次滿足兩種需求',
    mmW: { '2inch': 35, '1inch': 28 },
    mmH: { '2inch': 45, '1inch': 35 },
    guideColor: 'rgba(100, 100, 100, 0.7)', // 混合排版用灰色輔助線
    faceRatio: { top: 0.12, bottom: 0.82, ellipseW: 0.29, ellipseH: 0.36 } // 取中間值
  }
};

const PAPER_4X6 = { mmW: 101.6, mmH: 152.4 };
const DPI = 300;
const mmToPx = (mm) => Math.round((mm * DPI) / 25.4);

// 背景顏色選項
const BACKGROUND_COLORS = [
  { id: 'white', label: '白色', hex: '#FFFFFF' },
  { id: 'lightgray', label: '淺灰', hex: '#F0F0F0' },
  { id: 'blue', label: '藍色', hex: '#ADD8E6' } // 護照常見藍色
];

const EzIDApp = () => {
  const [image, setImage] = useState(null); // 原始照片
  const [bgRemovedImage, setBgRemovedImage] = useState(null); // 去背後的照片
  const [currentSpec, setCurrentSpec] = useState(SPECS.TWO_INCH);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBgColor, setSelectedBgColor] = useState(BACKGROUND_COLORS[0].hex); // 預設白色
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const canvasRef = useRef(null);
  const exportCanvasRef = useRef(null);
  const uploadedFileRef = useRef(null); // 用於去背時傳遞原始檔案

  // 檔案讀取
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadedFileRef.current = file; // 儲存原始檔案以備去背使用
      const reader = new FileReader();
      reader.onload = (f) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setBgRemovedImage(null); // 重置去背圖
          setScale(0.5);
          setOffset({ x: 0, y: 0 });
        };
        img.src = f.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // 一鍵去背功能
  const removeBackground = useCallback(async () => {
    if (!uploadedFileRef.current) return;

    setIsRemovingBg(true);
    try {
      const blob = await imglyRemoveBackground(uploadedFileRef.current);
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        setBgRemovedImage(img);
        setIsRemovingBg(false);
        URL.revokeObjectURL(url); // 釋放 URL 物件
      };
      img.src = url;
    } catch (error) {
      console.error("去背失敗:", error);
      alert("去背失敗，請檢查網路或重試！");
      setIsRemovingBg(false);
    }
  }, []);

  // 繪製預覽與輔助線
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // 清空並繪製背景顏色
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, width, height);

    // 繪製照片 (優先使用去背後的照片)
    const displayImage = bgRemovedImage || image;
    ctx.save();
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(displayImage, -displayImage.width / 2, -displayImage.height / 2);
    ctx.restore();

    // 繪製動態輔助線 (混合排版時顯示中性輔助線)
    const { guideColor, faceRatio } = currentSpec.id === 'mixed' ? SPECS.TWO_INCH : currentSpec; // 混合模式使用2吋導引
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
  }, [image, bgRemovedImage, scale, offset, currentSpec, selectedBgColor]);

  // 生成 ibon 4x6 拼板 (包含多尺寸與混合排版邏輯)
  const generateIbonPrint = useCallback(() => {
    setIsProcessing(true);
    const exportCanvas = exportCanvasRef.current;
    const ctx = exportCanvas.getContext('2d');
    const paperW = mmToPx(PAPER_4X6.mmW);
    const paperH = mmToPx(PAPER_4X6.mmH);
    const displayImage = bgRemovedImage || image;

    exportCanvas.width = paperW;
    exportCanvas.height = paperH;
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, paperW, paperH);

    // 準備單張照片的繪製函數
    const drawSinglePhoto = (targetCtx, photoSpec, x, y) => {
      const singlePhotoW = mmToPx(photoSpec.mmW);
      const singlePhotoH = mmToPx(photoSpec.mmH);

      targetCtx.save();
      targetCtx.translate(x + singlePhotoW / 2 + (offset.x * (singlePhotoW / 350)), y + singlePhotoH / 2 + (offset.y * (singlePhotoH / 450)));
      targetCtx.scale(scale * (singlePhotoW / 350), scale * (singlePhotoH / 450));
      targetCtx.drawImage(displayImage, -displayImage.width / 2, -displayImage.height / 2);
      targetCtx.restore();

      ctx.strokeStyle = '#EEEEEE'; // 極細邊框利於裁切
      ctx.strokeRect(x, y, singlePhotoW, singlePhotoH);
    };

    if (currentSpec.id === 'mixed') {
      // 4+4 混合排版邏輯 (假設左邊4張2吋，右邊4張1吋)
      const photo2inchW = mmToPx(SPECS.TWO_INCH.mmW);
      const photo2inchH = mmToPx(SPECS.TWO_INCH.mmH);
      const photo1inchW = mmToPx(SPECS.ONE_INCH.mmW);
      const photo1inchH = mmToPx(SPECS.ONE_INCH.mmH);

      // 計算左右兩側照片的總寬度
      const totalWidthLeft = photo2inchW;
      const totalWidthRight = photo1inchW;
      
      // 計算垂直間距
      const gapY2inch = (paperH - (photo2inchH * 4)) / 5;
      const gapY1inch = (paperH - (photo1inchH * 4)) / 5;

      // 放置2吋照片 (左側4張)
      const startX2inch = (paperW / 2 - totalWidthLeft) / 2; // 讓左側4張居中
      for (let j = 0; j < 4; j++) {
        const x = startX2inch;
        const y = gapY2inch + j * (photo2inchH + gapY2inch);
        drawSinglePhoto(ctx, SPECS.TWO_INCH, x, y);
      }

      // 放置1吋照片 (右側4張)
      const startX1inch = paperW / 2 + (paperW / 2 - totalWidthRight) / 2; // 讓右側4張居中
      for (let j = 0; j < 4; j++) {
        const x = startX1inch;
        const y = gapY1inch + j * (photo1inchH + gapY1inch);
        drawSinglePhoto(ctx, SPECS.ONE_INCH, x, y);
      }

    } else {
      // 單一尺寸排版邏輯
      const photoW = mmToPx(currentSpec.mmW);
      const photoH = mmToPx(currentSpec.mmH);
      const gapX = (paperW - (photoW * currentSpec.cols)) / (currentSpec.cols + 1);
      const gapY = (paperH - (photoH * currentSpec.rows)) / (currentSpec.rows + 1);

      for (let i = 0; i < currentSpec.cols; i++) {
        for (let j = 0; j < currentSpec.rows; j++) {
          const x = gapX + i * (photoW + gapX);
          const y = gapY + j * (photoH + gapY);
          drawSinglePhoto(ctx, currentSpec, x, y);
        }
      }
    }

    const link = document.createElement('a');
    link.download = `EzID_${currentSpec.id}_${Date.now()}.jpg`;
    link.href = exportCanvas.toDataURL('image/jpeg', 0.95);
    link.click();
    setIsProcessing(false);
  }, [image, bgRemovedImage, currentSpec, offset, scale, selectedBgColor]);


  // 重新選擇照片
  const resetApp = () => {
    setImage(null);
    setBgRemovedImage(null);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setSelectedBgColor(BACKGROUND_COLORS[0].hex);
    uploadedFileRef.current = null;
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
              {spec.id === '2inch' ? '2 吋' : (spec.id === '1inch' ? '1 吋' : '4+4 混合')}
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
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">背景顏色</span>
              </div>
              <div className="flex justify-around gap-2">
                {BACKGROUND_COLORS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedBgColor(color.hex)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      selectedBgColor === color.hex ? 'border-blue-600 shadow-md' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.label}
                  ></button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">調整縮放</span>
                <span className="text-xs font-mono text-blue-600 font-bold">{Math.round(scale * 100)}%</span>
              </div>
              <input 
                type="range" min="0.1" max="2" step="0.01" value={scale} 
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => setOffset(o => ({...o, y: o.y-10}))} 
                  className="py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold active:bg-gray-100 text-gray-700"
                >
                  上移
                </button>
                <button 
                  onClick={() => setOffset(o => ({...o, y: o.y+10}))} 
                  className="py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold active:bg-gray-100 text-gray-700"
                >
                  下移
                </button>
              </div>
            </div>

            {/* 功能按鈕 */}
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={removeBackground}
                disabled={isRemovingBg}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-100 active:scale-[0.98] transition-all disabled:bg-gray-400"
              >
                {isRemovingBg ? 'AI 去背中...' : '一鍵 AI 去背'}
              </button>
              <button 
                onClick={generateIbonPrint}
                disabled={isProcessing}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 active:scale-[0.98] transition-all disabled:bg-gray-400"
              >
                {isProcessing ? '正在處理...' : `輸出 ${currentSpec.total || ''} 張拼板檔`}
              </button>
            </div>
            <button onClick={resetApp} className="w-full text-sm text-gray-400 font-bold">重新選擇照片</button>
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
        <p className="text-xs text-gray-400 mt-2">© 2023 EzID-Taiwan. All rights reserved.</p>
      </footer>
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

export default EzIDApp;
