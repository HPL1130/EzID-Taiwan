import React, { useState, useRef, useEffect } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
};

// 修正後的路徑邏輯：確保 BASE_URL 正確結尾
const BASE_URL = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

const CLOTHES_DATA = {
  MALE: Array.from({ length: 5 }, (_, i) => ({ 
    id: `m${i+1}`, label: `男裝 ${i+1}`, url: `${BASE_URL}clothes/suit-m${i+1}.png` 
  })),
  FEMALE: Array.from({ length: 5 }, (_, i) => ({ 
    id: `f${i+1}`, label: `女裝 ${i+1}`, url: `${BASE_URL}clothes/suit-f${i+1}.png` 
  }))
};

const BACKGROUND_COLORS = [{ id: 'w', hex: '#FFFFFF' }, { id: 'b', hex: '#E6F3FF' }, { id: 'g', hex: '#F5F5F5' }];
const mmToPx = (mm) => Math.round((mm * 300) / 25.4);
const PAPER_4X6 = { mmW: 101.6, mmH: 152.4 };

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
  
  // 移動按鈕變數
  const [suitY, setSuitY] = useState(55);
  const [suitScale, setSuitScale] = useState(0.6);

  const canvasRef = useRef(null);
  const exportCanvasRef = useRef(null);
  const uploadedFileRef = useRef(null);

  // 渲染畫布 (人像部分)
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
    
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2);
    ctx.stroke();
  }, [image, bgRemovedImage, scale, offset, selectedBgColor]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadedFileRef.current = file;
      const reader = new FileReader();
      reader.onload = (f) => {
        const img = new Image();
        img.onload = () => { setImage(img); setBgRemovedImage(null); setSelectedSuit(null); setSuitY(55); setSuitScale(0.6); };
        img.src = f.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBg = async () => {
    if (!uploadedFileRef.current) return;
    setIsRemovingBg(true);
    try {
      const blob = await removeBackground(uploadedFileRef.current);
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { setBgRemovedImage(img); setIsRemovingBg(false); };
      img.src = url;
    } catch (e) { alert("去背失敗"); setIsRemovingBg(false); }
  };

  const addToQueue = () => {
    if (!canvasRef.current) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 350; tempCanvas.height = 450;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(canvasRef.current, 0, 0);

    if (selectedSuit) {
      const sImg = new Image();
      sImg.crossOrigin = "anonymous";
      sImg.src = selectedSuit.url;
      sImg.onload = () => {
        tCtx.save();
        tCtx.translate(175, (suitY / 100) * 450);
        tCtx.scale(suitScale * 2.2, suitScale * 2.2);
        tCtx.drawImage(sImg, -sImg.width / 2, -sImg.height / 2);
        tCtx.restore();
        setPhotoList(prev => [...prev, tempCanvas.toDataURL('image/png')]);
        setImage(null);
      };
      sImg.onerror = () => {
        alert("存檔失敗：衣服路徑不正確");
        setPhotoList(prev => [...prev, tempCanvas.toDataURL('image/png')]);
        setImage(null);
      };
    } else {
      setPhotoList(prev => [...prev, tempCanvas.toDataURL('image/png')]);
      setImage(null);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-100 min-h-screen font-sans">
      <header className="text-center mb-4">
        <h1 className="text-blue-600 font-black text-2xl">EzID V3.11</h1>
      </header>

      {/* 照片預覽與清單 */}
      <div className="flex gap-2 overflow-x-auto mb-4 bg-white p-3 rounded-2xl border min-h-[70px]">
        {photoList.length === 0 && <div className="text-gray-300 w-full text-center py-2 text-xs">尚未加入照片</div>}
        {photoList.map((img, i) => (
          <img key={i} src={img} className="h-14 w-11 rounded border object-cover shadow-sm flex-shrink-0" />
        ))}
      </div>

      {!image ? (
        <div className="space-y-4">
          <label className="block border-4 border-dashed border-gray-300 rounded-[2.5rem] p-16 text-center cursor-pointer bg-white">
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            <span className="text-5xl block mb-4">📸</span>
            <span className="font-bold text-gray-500 text-lg">點我開始上傳</span>
          </label>
        </div>
      ) : (
        <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl border space-y-4">
          {/* 畫布區域 */}
          <div className="relative w-full aspect-[35/45] rounded-3xl overflow-hidden bg-gray-200">
            <canvas ref={canvasRef} width={350} height={450} className="w-full h-full" />
            {selectedSuit && (
              <img 
                src={selectedSuit.url} 
                className="absolute pointer-events-none" 
                style={{
                  left: '50%', 
                  top: `${suitY}%`, 
                  transform: `translate(-50%, -50%) scale(${suitScale * 2.2})`, 
                  width: '100%'
                }}
                onError={(e) => {
                  console.log("嘗試修補路徑...");
                  // 如果抓不到，嘗試去掉 clothes/ 層級
                  if (e.target.src.includes('clothes/')) {
                    e.target.src = e.target.src.replace('clothes/', '');
                  }
                }}
              />
            )}
            {isRemovingBg && <div className="absolute inset-0 bg-white/70 flex items-center justify-center font-bold">AI 去背中...</div>}
          </div>

          <div className="space-y-4 bg-gray-50 p-4 rounded-3xl border">
            {/* 衣服選擇與控制 */}
            <div className="border-t pt-4">
              <div className="flex gap-2 mb-3">
                <button onClick={() => setGender('MALE')} className={`flex-1 py-2 rounded-xl font-bold ${gender === 'MALE' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>男裝</button>
                <button onClick={() => setGender('FEMALE')} className={`flex-1 py-2 rounded-xl font-bold ${gender === 'FEMALE' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-400'}`}>女裝</button>
              </div>
              
              <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                <button onClick={() => setSelectedSuit(null)} className="w-14 h-14 border-2 border-dashed rounded-xl flex-shrink-0 text-xs text-gray-400 bg-white">原本</button>
                {CLOTHES_DATA[gender].map(s => (
                  <button key={s.id} onClick={() => setSelectedSuit(s)} className={`w-14 h-14 border-2 rounded-xl flex-shrink-0 overflow-hidden ${selectedSuit?.id === s.id ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-white'}`}>
                    <img src={s.url} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>

              {/* 移動按鈕區 */}
              {selectedSuit && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <button onClick={() => setSuitY(suitY - 1)} className="bg-white border py-2 rounded-lg text-xs font-bold active:bg-gray-100">上移</button>
                  <button onClick={() => setSuitY(suitY + 1)} className="bg-white border py-2 rounded-lg text-xs font-bold active:bg-gray-100">下移</button>
                  <button onClick={() => setSuitScale(suitScale + 0.02)} className="bg-white border py-2 rounded-lg text-xs font-bold active:bg-gray-100">放大</button>
                  <button onClick={() => setSuitScale(suitScale - 0.02)} className="bg-white border py-2 rounded-lg text-xs font-bold active:bg-gray-100">縮小</button>
                </div>
              )}
            </div>

            {/* 人像控制區 */}
            <div className="border-t pt-4 flex items-center gap-4">
               <button onClick={handleRemoveBg} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold">一鍵去背</button>
               <input type="range" min="0.1" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="flex-1" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setImage(null)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-bold">取消</button>
            <button onClick={addToQueue} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg">確認加入</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EzIDApp;
