import React, { useState, useRef, useEffect } from 'react';

// --- 規格與資料 ---
const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10 }
};

const CLOTHES_DATA = {
  MALE: Array.from({ length: 5 }, (_, i) => ({ id: `m${i+1}`, url: `/clothes/suit-m${i+1}.png` })),
  FEMALE: Array.from({ length: 5 }, (_, i) => ({ id: `f${i+1}`, url: `/clothes/suit-f${i+1}.png` }))
};

const EzIDApp = () => {
  const [image, setImage] = useState(null);
  const [photoList, setPhotoList] = useState([]);
  const [currentSpec, setCurrentSpec] = useState(SPECS.TWO_INCH);
  
  // 核心控制：人像與衣服
  const [userScale, setUserScale] = useState(0.5);
  const [gender, setGender] = useState('MALE');
  const [selectedSuit, setSelectedSuit] = useState(null);
  const [suitY, setSuitY] = useState(55);    // 衣服上下位置
  const [suitScale, setSuitScale] = useState(100); // 衣服縮放百分比

  const canvasRef = useRef(null);

  // 渲染畫布 (僅處理人像與底色)
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 350, 450);

    ctx.save();
    ctx.translate(175, 225);
    ctx.scale(userScale, userScale);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();
  }, [image, userScale]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      const img = new Image();
      img.onload = () => setImage(img);
      img.src = f.target.result;
    };
    reader.readAsDataURL(file);
  };

  // 合併下載：將 Canvas(人) + Image(衣服) 結合
  const addToQueue = () => {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 350; finalCanvas.height = 450;
    const fCtx = finalCanvas.getContext('2d');
    
    // 1. 畫人
    fCtx.drawImage(canvasRef.current, 0, 0);

    // 2. 畫衣服 (如果有的話)
    if (selectedSuit) {
      const sImg = new Image();
      sImg.src = selectedSuit.url;
      sImg.onload = () => {
        fCtx.save();
        fCtx.translate(175, (suitY / 100) * 450);
        const scaleVal = (suitScale / 100) * 1.5; 
        fCtx.scale(scaleVal, scaleVal);
        fCtx.drawImage(sImg, -sImg.width / 2, -sImg.height / 2);
        fCtx.restore();
        setPhotoList(prev => [...prev, finalCanvas.toDataURL('image/png')]);
        setImage(null);
      };
    } else {
      setPhotoList(prev => [...prev, finalCanvas.toDataURL('image/png')]);
      setImage(null);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen font-sans text-gray-800">
      <header className="text-center mb-6">
        <h1 className="text-2xl font-black text-blue-600">EzID 修正版 V3.6</h1>
        <p className="text-xs text-gray-400 mt-1">穩定優先 / 衣服可調 / 路徑不變</p>
      </header>

      {/* 1. 規格選擇 */}
      <div className="flex gap-2 mb-4">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => setCurrentSpec(s)} className={`flex-1 py-2 rounded-xl font-bold border-2 transition ${currentSpec.id === s.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-400'}`}>{s.label}</button>
        ))}
      </div>

      {!image ? (
        <div className="bg-white border-4 border-dashed border-gray-200 rounded-[2rem] p-12 text-center">
          <input type="file" id="up" className="hidden" onChange={handleUpload} accept="image/*" />
          <label htmlFor="up" className="cursor-pointer block">
            <span className="text-5xl block mb-4">📷</span>
            <span className="text-lg font-bold text-gray-400">點擊上傳大頭照</span>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 2. 預覽區域 (衣服疊加控制) */}
          <div className="relative aspect-[35/45] bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-white">
            <canvas ref={canvasRef} width={350} height={450} className="w-full h-full" />
            {selectedSuit && (
              <img 
                src={selectedSuit.url} 
                className="absolute pointer-events-none"
                style={{
                  left: '50%',
                  top: `${suitY}%`,
                  transform: `translate(-50%, -50%) scale(${suitScale / 100})`,
                  width: '100%'
                }}
              />
            )}
          </div>

          {/* 3. 控制面板 */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            {/* 性別與衣服選取 */}
            <div className="flex gap-2">
              <button onClick={() => setGender('MALE')} className={`flex-1 py-2 rounded-lg font-bold ${gender === 'MALE' ? 'bg-blue-100 text-blue-600' : 'bg-gray-50'}`}>男裝</button>
              <button onClick={() => setGender('FEMALE')} className={`flex-1 py-2 rounded-lg font-bold ${gender === 'FEMALE' ? 'bg-pink-100 text-pink-600' : 'bg-gray-50'}`}>女裝</button>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button onClick={() => setSelectedSuit(null)} className="w-12 h-12 rounded-lg border-2 border-dashed flex-shrink-0 text-[10px] text-gray-300">原本</button>
              {CLOTHES_DATA[gender].map(s => (
                <img key={s.id} src={s.url} onClick={() => setSelectedSuit(s)} className={`w-12 h-12 rounded-lg border-2 flex-shrink-0 object-contain ${selectedSuit?.id === s.id ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-gray-50'}`} />
              ))}
            </div>

            {/* 衣服調整按鈕 */}
            {selectedSuit && (
              <div className="grid grid-cols-4 gap-2 border-t pt-4">
                <button onClick={() => setSuitY(y => y - 1)} className="bg-gray-100 py-2 rounded-lg text-sm font-bold">上移</button>
                <button onClick={() => setSuitY(y => y + 1)} className="bg-gray-100 py-2 rounded-lg text-sm font-bold">下移</button>
                <button onClick={() => setSuitScale(s => s + 2)} className="bg-gray-100 py-2 rounded-lg text-sm font-bold">放大</button>
                <button onClick={() => setSuitScale(s => s - 2)} className="bg-gray-100 py-2 rounded-lg text-sm font-bold">縮小</button>
              </div>
            )}

            {/* 人像縮放 */}
            <div className="border-t pt-2">
              <label className="text-[10px] font-bold text-gray-400">人像比例</label>
              <input type="range" min="0.1" max="1.5" step="0.01" value={userScale} onChange={e => setUserScale(parseFloat(e.target.value))} className="w-full accent-blue-600" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setImage(null)} className="flex-1 py-4 bg-gray-200 rounded-2xl font-bold text-gray-500">取消</button>
            <button onClick={addToQueue} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">確認加入</button>
          </div>
        </div>
      )}

      {/* 已加入的照片 */}
      <div className="mt-8 flex gap-2 overflow-x-auto p-2">
        {photoList.map((p, i) => <img key={i} src={p} className="h-24 rounded shadow-md border-2 border-white flex-shrink-0" />)}
      </div>
    </div>
  );
};

export default EzIDApp;
