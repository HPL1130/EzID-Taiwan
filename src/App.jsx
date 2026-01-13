import React, { useState, useRef, useEffect, useCallback } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

const SPECS = {
  TWO_INCH: { id: '2inch', label: '2 吋', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: '1inch', label: '1 吋', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 }
};

const PAPER_4X6 = { mmW: 101.6, mmH: 152.4 };
const mmToPx = (mm) => Math.round((mm * 300) / 25.4);

const EzIDApp = () => {
  const [image, setImage] = useState(null);
  const [bgRemovedImage, setBgRemovedImage] = useState(null);
  const [currentSpec, setCurrentSpec] = useState(SPECS.TWO_INCH);
  const [scale, setScale] = useState(0.5);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedBgColor, setSelectedBgColor] = useState('#FFFFFF');
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  
  // 📸 多人照片暫存清單
  const [photoList, setPhotoList] = useState([]);

  const canvasRef = useRef(null);
  const exportCanvasRef = useRef(null);
  const uploadedFileRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadedFileRef.current = file;
      const reader = new FileReader();
      reader.onload = (f) => {
        const img = new Image();
        img.onload = () => { setImage(img); setBgRemovedImage(null); setScale(0.5); setOffset({ x: 0, y: 0 }); };
        img.src = f.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = useCallback(async () => {
    if (!uploadedFileRef.current) return;
    setIsRemovingBg(true);
    try {
      const blob = await removeBackground(uploadedFileRef.current);
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { setBgRemovedImage(img); setIsRemovingBg(false); URL.revokeObjectURL(url); };
      img.src = url;
    } catch (e) { alert("去背失敗"); setIsRemovingBg(false); }
  }, []);

  // 📥 將當前處理好的照片「加入清單」
  const addToQueue = () => {
    if (photoList.length >= currentSpec.max) {
      alert(`此規格最多只能放 ${currentSpec.max} 張照片！`);
      return;
    }
    
    // 建立一個臨時畫布來捕捉當前預覽框的樣子
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 350;
    tempCanvas.height = 450;
    const tCtx = tempCanvas.getContext('2d');
    
    tCtx.fillStyle = selectedBgColor;
    tCtx.fillRect(0, 0, 350, 450);
    const activeImg = bgRemovedImage || image;
    tCtx.save();
    tCtx.translate(175 + offset.x, 225 + offset.y);
    tCtx.scale(scale, scale);
    tCtx.drawImage(activeImg, -activeImg.width/2, -activeImg.height/2);
    tCtx.restore();

    setPhotoList([...photoList, tempCanvas.toDataURL('image/png')]);
    setImage(null); // 清除目前照片，準備選下一個人
  };

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, 350, 450);
    const activeImg = bgRemovedImage || image;
    ctx.save();
    ctx.translate(175 + offset.x, 225 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(activeImg, -activeImg.width/2, -activeImg.height/2);
    ctx.restore();
    // 繪製紅色的臉部參考線
    ctx.strokeStyle = 'red'; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI*2); ctx.stroke();
  }, [image, bgRemovedImage, scale, offset, selectedBgColor]);

  // 📤 最終拼板下載
  const downloadFinalPrint = () => {
    const canvas = exportCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const paperW = mmToPx(PAPER_4X6.mmH); // 橫式 152.4
    const paperH = mmToPx(PAPER_4X6.mmW); // 橫式 101.6
    canvas.width = paperW; canvas.height = paperH;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, paperW, paperH);

    const w = mmToPx(currentSpec.mmW);
    const h = mmToPx(currentSpec.mmH);
    const gX = (paperW - w * currentSpec.cols) / (currentSpec.cols + 1);
    const gY = (paperH - h * currentSpec.rows) / (currentSpec.rows + 1);

    photoList.forEach((dataUrl, index) => {
      const col = index % currentSpec.cols;
      const row = Math.floor(index / currentSpec.cols);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, gX + col * (w + gX), gY + row * (h + gY), w, h);
        ctx.strokeStyle = '#CCC'; ctx.strokeRect(gX + col * (w + gX), gY + row * (h + gY), w, h);
        if (index === photoList.length - 1) {
          const link = document.createElement('a');
          link.download = `Multi_EzID_${currentSpec.id}.jpg`;
          link.href = canvas.toDataURL('image/jpeg', 0.95);
          link.click();
        }
      };
      img.src = dataUrl;
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen font-sans">
      <h1 className="text-xl font-bold text-center mb-4 text-blue-700">多人照片拼板 (橫式 4x6)</h1>
      
      {/* 步驟顯示 */}
      <div className="mb-4 bg-white p-3 rounded-xl shadow-sm border border-blue-100">
        <p className="text-xs font-bold text-blue-600">目前已加入清單: {photoList.length} / {currentSpec.max} 張</p>
        <div className="flex gap-1 mt-2 overflow-x-auto pb-2">
          {photoList.map((img, i) => (
            <img key={i} src={img} className="h-12 w-10 border object-cover rounded shadow-sm" />
          ))}
          {photoList.length === 0 && <span className="text-gray-300 text-[10px]">清單空空如也...</span>}
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => {setCurrentSpec(s); setPhotoList([]);}} className={`flex-1 py-2 text-xs font-bold rounded-lg ${currentSpec.id === s.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {s.label} ({s.max}張)
          </button>
        ))}
      </div>

      {!image ? (
        <div className="space-y-4">
          <label className="block border-2 border-dashed border-gray-300 rounded-3xl p-16 text-center cursor-pointer bg-white">
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            <p className="text-gray-500 font-bold">選取第 {photoList.length + 1} 位照片</p>
          </label>
          {photoList.length > 0 && (
            <button onClick={downloadFinalPrint} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg animate-pulse">
              立即下載目前的拼板 (共 {photoList.length} 人)
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 bg-white p-4 rounded-3xl shadow-xl">
          <div className="relative">
            <canvas ref={canvasRef} width={350} height={450} className="w-full border rounded-lg bg-white" />
            {isRemovingBg && <div className="absolute inset-0 bg-white/80 flex items-center justify-center font-bold">AI 去背中...</div>}
          </div>
          <input type="range" min="0.1" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full" />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleRemoveBackground} className="bg-purple-600 text-white py-2 rounded-lg text-xs font-bold">一鍵去背</button>
            <button onClick={() => setSelectedBgColor(selectedBgColor === '#FFFFFF' ? '#ADD8E6' : '#FFFFFF')} className="bg-gray-100 py-2 rounded-lg text-xs font-bold">切換白/藍底</button>
          </div>
          <button onClick={addToQueue} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">確認此人，加入拼板</button>
          <button onClick={() => setImage(null)} className="w-full text-gray-400 text-xs">取消重選</button>
        </div>
      )}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

export default EzIDApp;
