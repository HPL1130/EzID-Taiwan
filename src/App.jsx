import React, { useState, useRef, useEffect, useCallback } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
};

const CLOTHES_DATA = {
  MALE: [
    { id: 'm1', label: '黑西裝', url: 'https://i.imgur.com/GiswH8i.png' },
    { id: 'm2', label: '深藍西裝', url: 'https://i.imgur.com/vHAnVlW.png' }
  ],
  FEMALE: [
    { id: 'f1', label: '套裝', url: 'https://i.imgur.com/XF9r4uF.png' },
    { id: 'f2', label: '白襯衫', url: 'https://i.imgur.com/kK3U88f.png' }
  ]
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
  const [suitConfig, setSuitConfig] = useState({ scale: 0.6, y: 55 }); // CSS 用百分比定位

  const canvasRef = useRef(null);
  const exportCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const uploadedFileRef = useRef(null);

  // 繪製底層人像畫布
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
    // 輔助線
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2); ctx.stroke();
  }, [image, bgRemovedImage, scale, offset, selectedBgColor]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadedFileRef.current = file;
      const reader = new FileReader();
      reader.onload = (f) => {
        const img = new Image();
        img.onload = () => { setImage(img); setBgRemovedImage(null); setSelectedSuit(null); };
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
      const img = new Image();
      img.onload = () => { setBgRemovedImage(img); setIsRemovingBg(false); };
      img.src = URL.createObjectURL(blob);
    } catch (e) { alert("去背失敗"); setIsRemovingBg(false); }
  };

  // 核心修正：將衣服與畫布合併成一張圖
  const addToQueue = () => {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 350; finalCanvas.height = 450;
    const fCtx = finalCanvas.getContext('2d');

    // 1. 先畫人像畫布內容
    fCtx.drawImage(canvasRef.current, 0, 0);

    // 2. 如果有衣服，疊加畫上去
    if (selectedSuit) {
      const sImg = new Image();
      sImg.crossOrigin = "anonymous";
      sImg.src = selectedSuit.url;
      sImg.onload = () => {
        fCtx.save();
        fCtx.translate(175, 225 + (suitConfig.y - 50) * 4.5); // 座標轉換
        fCtx.scale(suitConfig.scale, suitConfig.scale);
        fCtx.drawImage(sImg, -sImg.width / 2, -sImg.height / 2);
        fCtx.restore();
        setPhotoList([...photoList, finalCanvas.toDataURL('image/png')]);
        setImage(null);
      };
    } else {
      setPhotoList([...photoList, finalCanvas.toDataURL('image/png')]);
      setImage(null);
    }
  };

  // 下載邏輯保持不變 (略...)
  const downloadPrint = () => {
    const canvas = exportCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const paperW = mmToPx(PAPER_4X6.mmH); const paperH = mmToPx(PAPER_4X6.mmW);
    canvas.width = paperW; canvas.height = paperH;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, paperW, paperH);
    const finalPhotos = Array.from({ length: currentSpec.max }, (_, i) => photoList[i % photoList.length]);
    const promises = finalPhotos.map((dataUrl, index) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          let x, y, w, h;
          if (currentSpec.id === 'MIXED') {
            const is2 = index < 4; w = mmToPx(is2 ? 35 : 28); h = mmToPx(is2 ? 45 : 35);
            x = (index % 4) * (paperW / 4) + (paperW / 4 - w) / 2;
            y = is2 ? (paperH / 2 - h) / 2 : paperH / 2 + (paperH / 2 - h) / 2;
          } else {
            w = mmToPx(currentSpec.mmW); h = mmToPx(currentSpec.mmH);
            x = (index % currentSpec.cols) * (paperW / currentSpec.cols) + (paperW / currentSpec.cols - w) / 2;
            y = Math.floor(index / currentSpec.cols) * (paperH / currentSpec.rows) + (paperH / currentSpec.rows - h) / 2;
          }
          ctx.drawImage(img, x, y, w, h);
          ctx.strokeStyle = '#EEEEEE'; ctx.strokeRect(x, y, w, h);
          resolve();
        };
        img.src = dataUrl;
      });
    });
    Promise.all(promises).then(() => {
      const link = document.createElement('a');
      link.download = `EzID_Print.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.98);
      link.click();
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen font-sans text-sm">
      <h1 className="text-center font-black text-blue-600 text-xl mb-4 uppercase tracking-widest">EzID Taiwan</h1>
      
      {/* 規格切換 */}
      <div className="flex gap-1 mb-4 bg-gray-200 p-1 rounded-xl">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => {setCurrentSpec(s); setPhotoList([]);}} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg ${currentSpec.id === s.id ? 'bg-white text-blue-600' : 'text-gray-500'}`}>{s.label}</button>
        ))}
      </div>

      {!image ? (
        <div className="space-y-4">
          <label className="block border-2 border-dashed border-gray-300 rounded-3xl p-16 text-center cursor-pointer bg-white">
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            <span className="text-4xl block mb-2">📸</span>
            <span className="font-bold text-gray-500">上傳照片</span>
          </label>
          {photoList.length > 0 && <button onClick={downloadPrint} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">下載 4x6 拼板 ({photoList.length})</button>}
        </div>
      ) : (
        <div className="bg-white p-4 rounded-3xl shadow-xl border space-y-4">
          {/* 核心編輯區：使用 CSS 堆疊確保衣服一定看得到 */}
          <div className="relative w-full aspect-[35/45] overflow-hidden rounded-xl bg-gray-100" ref={containerRef}>
            <canvas ref={canvasRef} width={350} height={450} className="w-full h-full block" />
            
            {/* 衣服圖層：直接用 <img> 確保不會被 Canvas 擋掉 */}
            {selectedSuit && (
              <img 
                src={selectedSuit.url} 
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: `${suitConfig.y}%`,
                  transform: `translate(-50%, -50%) scale(${suitConfig.scale * 2})`,
                  width: '100%',
                  pointerEvents: 'none'
                }} 
              />
            )}

            {isRemovingBg && <div className="absolute inset-0 bg-white/80 flex items-center justify-center font-bold text-blue-600">處理中...</div>}
          </div>

          {/* 控制面板 */}
          <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {BACKGROUND_COLORS.map(c => <button key={c.id} onClick={() => setSelectedBgColor(c.hex)} className={`w-7 h-7 rounded-full border-2 ${selectedBgColor === c.hex ? 'border-blue-500' : 'border-white'}`} style={{backgroundColor: c.hex}} />)}
              </div>
              <button onClick={handleRemoveBg} className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md">一鍵去背</button>
            </div>

            <div className="border-t pt-3">
              <div className="flex gap-2 mb-3">
                <button onClick={() => setGender('MALE')} className={`flex-1 py-1.5 rounded-lg font-bold ${gender === 'MALE' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>男西裝</button>
                <button onClick={() => setGender('FEMALE')} className={`flex-1 py-1.5 rounded-lg font-bold ${gender === 'FEMALE' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-400'}`}>女套裝</button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                <button onClick={() => setSelectedSuit(null)} className="flex-shrink-0 w-14 h-14 border-2 border-dashed rounded-xl text-gray-400">原本</button>
                {CLOTHES_DATA[gender].map(s => (
                  <button key={s.id} onClick={() => setSelectedSuit(s)} className={`flex-shrink-0 w-14 h-14 border-2 rounded-xl bg-white ${selectedSuit?.id === s.id ? 'border-blue-500' : 'border-transparent'}`}>
                    <img src={s.url} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
              {selectedSuit && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setSuitConfig(p => ({...p, y: p.y-2}))} className="flex-1 bg-white border py-2 rounded-lg shadow-sm">↑</button>
                  <button onClick={() => setSuitConfig(p => ({...p, y: p.y+2}))} className="flex-1 bg-white border py-2 rounded-lg shadow-sm">↓</button>
                  <button onClick={() => setSuitConfig(p => ({...p, scale: p.scale+0.05}))} className="flex-1 bg-white border py-2 rounded-lg shadow-sm">＋</button>
                  <button onClick={() => setSuitConfig(p => ({...p, scale: p.scale-0.05}))} className="flex-1 bg-white border py-2 rounded-lg shadow-sm">－</button>
                </div>
              )}
            </div>
          </div>

          <button onClick={addToQueue} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg">確認加入排版</button>
        </div>
      )}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

export default EzIDApp;
