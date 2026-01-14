import React, { useState, useRef, useEffect } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
};

const BASE_URL = import.meta.env.BASE_URL;
const CLOTHES_DATA = {
  MALE: Array.from({ length: 5 }, (_, i) => ({ id: `m${i+1}`, label: `男裝${i+1}`, url: `${BASE_URL}clothes/suit-m${i+1}.png` })),
  FEMALE: Array.from({ length: 5 }, (_, i) => ({ id: `f${i+1}`, label: `女裝${i+1}`, url: `${BASE_URL}clothes/suit-f${i+1}.png` }))
};

const EzIDApp = () => {
  const [image, setImage] = useState(null);
  const [bgRemovedImage, setBgRemovedImage] = useState(null);
  const [currentSpec, setCurrentSpec] = useState(SPECS.TWO_INCH);
  const [scale, setScale] = useState(0.5);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedBgColor, setSelectedBgColor] = useState('#FFFFFF');
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [photoList, setPhotoList] = useState([]);
  const [gender, setGender] = useState('MALE');
  const [selectedSuit, setSelectedSuit] = useState(null);
  const [suitConfig, setSuitConfig] = useState({ scale: 0.6, y: 55 }); // 衣服控制狀態

  const canvasRef = useRef(null);
  const exportCanvasRef = useRef(null);

  // 1. 核心修正：將衣服繪製邏輯放入 Canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const draw = async () => {
      // 清空並畫背景
      ctx.fillStyle = selectedBgColor;
      ctx.fillRect(0, 0, 350, 450);

      // 畫人像
      const activeImg = bgRemovedImage || image;
      ctx.save();
      ctx.translate(175 + offset.x, 225 + offset.y);
      ctx.scale(scale, scale);
      ctx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
      ctx.restore();

      // 畫衣服 (如果選取了衣服)
      if (selectedSuit) {
        const sImg = new Image();
        sImg.crossOrigin = "anonymous";
        sImg.src = selectedSuit.url;
        sImg.onload = () => {
          ctx.save();
          // 根據 suitConfig 調整位置與大小
          // 這裡將 suitConfig.y (百分比) 轉換為像素
          ctx.translate(175, (suitConfig.y / 100) * 450); 
          ctx.scale(suitConfig.scale * 2.2, suitConfig.scale * 2.2);
          ctx.drawImage(sImg, -sImg.width / 2, -sImg.height / 2);
          ctx.restore();
          
          // 最後畫輔助線 (確保在最上層)
          drawGuideLines(ctx);
        };
      } else {
        drawGuideLines(ctx);
      }
    };
    draw();
  }, [image, bgRemovedImage, scale, offset, selectedBgColor, selectedSuit, suitConfig]);

  const drawGuideLines = (ctx) => {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      const img = new Image();
      img.onload = () => { setImage(img); setBgRemovedImage(null); setSelectedSuit(null); };
      img.src = f.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBg = async () => {
    // ...保持原有的去背邏輯...
    setIsRemovingBg(true);
    // 假設 removeBackground 已正確導入
    try {
      const blob = await removeBackground(image.src); // 簡化示範
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { setBgRemovedImage(img); setIsRemovingBg(false); };
      img.src = url;
    } catch(e) { setIsRemovingBg(false); }
  };

  // 2. 修正 addToQueue，確保儲存的是當前 Canvas 的最終結果
  const addToQueue = () => {
    if (!canvasRef.current) return;
    setPhotoList(prev => [...prev, canvasRef.current.toDataURL('image/png')]);
    setImage(null);
    setSelectedSuit(null);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-100 min-h-screen">
      <header className="text-center mb-4"><h1 className="text-blue-600 font-black text-2xl">EzID V3.1</h1></header>

      {!image ? (
        <div className="text-center p-10 bg-white rounded-3xl border-4 border-dashed border-gray-200">
          <input type="file" onChange={handleUpload} className="hidden" id="file-up" />
          <label htmlFor="file-up" className="cursor-pointer text-gray-500 font-bold">📸 點擊上傳照片</label>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-3xl shadow-xl space-y-4">
          <div className="relative aspect-[35/45] rounded-2xl overflow-hidden bg-gray-200">
            <canvas ref={canvasRef} width={350} height={450} className="w-full h-full" />
          </div>

          <div className="space-y-4 bg-gray-50 p-4 rounded-2xl">
            <div className="flex gap-2 mb-3">
              <button onClick={() => setGender('MALE')} className={`flex-1 py-2 rounded-xl font-bold ${gender === 'MALE' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>男西裝</button>
              <button onClick={() => setGender('FEMALE')} className={`flex-1 py-2 rounded-xl font-bold ${gender === 'FEMALE' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-400'}`}>女套裝</button>
            </div>

            {/* 衣服選取器 */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {CLOTHES_DATA[gender].map(s => (
                <button key={s.id} onClick={() => setSelectedSuit(s)} className={`w-14 h-14 border-2 rounded-xl flex-shrink-0 ${selectedSuit?.id === s.id ? 'border-blue-500' : 'border-transparent'}`}>
                  <img src={s.url} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>

            {/* 控制面板：調整衣服 */}
            {selectedSuit && (
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => setSuitConfig(p => ({...p, y: p.y-1}))} className="bg-white border py-2 rounded-lg font-bold">上移</button>
                <button onClick={() => setSuitConfig(p => ({...p, y: p.y+1}))} className="bg-white border py-2 rounded-lg font-bold">下移</button>
                <button onClick={() => setSuitConfig(p => ({...p, scale: p.scale+0.02}))} className="bg-white border py-2 rounded-lg font-bold">放大</button>
                <button onClick={() => setSuitConfig(p => ({...p, scale: p.scale-0.02}))} className="bg-white border py-2 rounded-lg font-bold">縮小</button>
              </div>
            )}

            <div className="border-t pt-4">
               <p className="text-xs text-gray-400 mb-1">人像縮放</p>
               <input type="range" min="0.1" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full accent-blue-600" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setImage(null)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-bold text-gray-500">取消</button>
            <button onClick={addToQueue} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">加入排版</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EzIDApp;
