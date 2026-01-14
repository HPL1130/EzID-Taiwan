import React, { useState, useRef, useEffect } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
};

// --- 路徑維持原狀 ---
const CLOTHES_DATA = {
  MALE: Array.from({ length: 5 }, (_, i) => ({ id: `m${i+1}`, url: `/clothes/suit-m${i+1}.png` })),
  FEMALE: Array.from({ length: 5 }, (_, i) => ({ id: `f${i+1}`, url: `/clothes/suit-f${i+1}.png` }))
};

const EzIDApp = () => {
  const [image, setImage] = useState(null);
  const [bgRemovedImage, setBgRemovedImage] = useState(null);
  const [currentSpec, setCurrentSpec] = useState(SPECS.TWO_INCH);
  const [scale, setScale] = useState(0.5);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedBgColor, setSelectedBgColor] = useState('#FFFFFF');
  const [photoList, setPhotoList] = useState([]);
  const [gender, setGender] = useState('MALE');
  const [selectedSuit, setSelectedSuit] = useState(null);
  
  // --- 衣服圖檔控制數值 ---
  const [suitScale, setSuitScale] = useState(100); // 百分比
  const [suitY, setSuitY] = useState(55); // 垂直位置百分比

  const canvasRef = useRef(null);

  // 繪製底層（背景 + 人像）
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, 350, 450);

    const activeImg = bgRemovedImage || image;
    ctx.save();
    ctx.translate(175 + offset.x, 225 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
    ctx.restore();
  }, [image, bgRemovedImage, scale, offset, selectedBgColor]);

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

  // 合併下載邏輯：將人像與「衣服圖檔」重疊後存入清單
  const addToQueue = () => {
    if (!canvasRef.current) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 350; tempCanvas.height = 450;
    const tCtx = tempCanvas.getContext('2d');
    
    // 1. 畫底層
    tCtx.drawImage(canvasRef.current, 0, 0);

    // 2. 畫衣服圖檔
    if (selectedSuit) {
      const sImg = new Image();
      sImg.src = selectedSuit.url;
      sImg.onload = () => {
        tCtx.save();
        tCtx.translate(175, (suitY / 100) * 450);
        const finalScale = (suitScale / 100) * 1.5; // 放大係數修正
        tCtx.scale(finalScale, finalScale);
        tCtx.drawImage(sImg, -sImg.width / 2, -sImg.height / 2);
        tCtx.restore();
        setPhotoList(prev => [...prev, tempCanvas.toDataURL('image/png')]);
        setImage(null);
      };
    } else {
      setPhotoList(prev => [...prev, tempCanvas.toDataURL('image/png')]);
      setImage(null);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-100 min-h-screen">
      <header className="text-center mb-4"><h1 className="text-blue-600 font-bold text-xl">EzID V3.5</h1></header>

      {/* 規格選擇 */}
      <div className="flex gap-1 mb-4 bg-white p-1 rounded-lg shadow-sm">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => setCurrentSpec(s)} className={`flex-1 py-1 text-xs rounded ${currentSpec.id === s.id ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>{s.label}</button>
        ))}
      </div>

      {!image ? (
        <label className="block border-2 border-dashed border-gray-400 p-20 text-center bg-white rounded-xl cursor-pointer">
          <input type="file" className="hidden" onChange={handleUpload} />
          <span>點擊上傳</span>
        </label>
      ) : (
        <div className="bg-white p-4 rounded-xl shadow space-y-4">
          {/* 衣服圖檔疊加區 */}
          <div className="relative aspect-[35/45] bg-gray-200 overflow-hidden rounded-lg">
            <canvas ref={canvasRef} width={350} height={450} className="w-full h-full" />
            {selectedSuit && (
              <img 
                src={selectedSuit.url} 
                className="absolute pointer-events-none"
                style={{
                  left: '50%',
                  top: `${suitY}%`,
                  transform: `translate(-50%, -50%) scale(${suitScale / 100})`,
                  width: '100%', // 這是重點，讓圖檔寬度撐滿
                  zIndex: 10
                }}
              />
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setGender('MALE')} className="flex-1 py-1 bg-blue-500 text-white rounded">男</button>
              <button onClick={() => setGender('FEMALE')} className="flex-1 py-1 bg-pink-500 text-white rounded">女</button>
            </div>
            
            <div className="flex gap-2 overflow-x-auto py-2">
              {CLOTHES_DATA[gender].map(s => (
                <img key={s.id} src={s.url} onClick={() => setSelectedSuit(s)} className={`w-12 h-12 border-2 rounded ${selectedSuit?.id === s.id ? 'border-blue-500' : 'border-gray-200'}`} />
              ))}
            </div>

            {/* 衣服縮放位移按鈕 */}
            {selectedSuit && (
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => setSuitY(y => y - 1)} className="bg-white border p-2 rounded">上移</button>
                <button onClick={() => setSuitY(y => y + 1)} className="bg-white border p-2 rounded">下移</button>
                <button onClick={() => setSuitScale(s => s + 2)} className="bg-white border p-2 rounded">放大</button>
                <button onClick={() => setSuitScale(s => s - 2)} className="bg-white border p-2 rounded">縮小</button>
              </div>
            )}
          </div>

          <button onClick={addToQueue} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">確認加入</button>
        </div>
      )}

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {photoList.map((p, i) => <img key={i} src={p} className="h-20 border" />)}
      </div>
    </div>
  );
};

export default EzIDApp;
