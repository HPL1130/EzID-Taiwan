import React, { useState, useRef, useEffect, useCallback } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
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

  const addToQueue = () => {
    if (photoList.length >= currentSpec.max) {
      alert(`此規格已滿！請先下載或清空清單。`);
      return;
    }
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 350; tempCanvas.height = 450;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.fillStyle = selectedBgColor; tCtx.fillRect(0, 0, 350, 450);
    const activeImg = bgRemovedImage || image;
    tCtx.save();
    tCtx.translate(175 + offset.x, 225 + offset.y);
    tCtx.scale(scale, scale);
    tCtx.drawImage(activeImg, -activeImg.width/2, -activeImg.height/2);
    tCtx.restore();
    setPhotoList([...photoList, tempCanvas.toDataURL('image/png')]);
    setImage(null);
  };

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = selectedBgColor; ctx.fillRect(0, 0, 350, 450);
    const activeImg = bgRemovedImage || image;
    ctx.save();
    ctx.translate(175 + offset.x, 225 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(activeImg, -activeImg.width/2, -activeImg.height/2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)'; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI*2); ctx.stroke();
  }, [image, bgRemovedImage, scale, offset, selectedBgColor]);

  const downloadFinalPrint = () => {
    if (photoList.length === 0) return;
    const canvas = exportCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const paperW = mmToPx(PAPER_4X6.mmH); 
    const paperH = mmToPx(PAPER_4X6.mmW);
    canvas.width = paperW; canvas.height = paperH;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, paperW, paperH);

    // 【依序循環填滿核心邏輯】
    const finalPhotos = [];
    for (let i = 0; i < currentSpec.max; i++) {
      // 使用 modulo (%) 運算子達成依序循環 A -> B -> C -> A...
      finalPhotos.push(photoList[i % photoList.length]);
    }

    const promises = finalPhotos.map((dataUrl, index) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          let x, y, w, h;
          if (currentSpec.id === 'MIXED') {
            const isTwoInch = index < 4;
            w = mmToPx(isTwoInch ? 35 : 28);
            h = mmToPx(isTwoInch ? 45 : 35);
            const sectionW = paperW / 2;
            const startY = (paperH - (h * 4 + mmToPx(3) * 3)) / 2;
            x = isTwoInch ? (sectionW - w) / 2 + mmToPx(5) : sectionW + (sectionW - w) / 2 - mmToPx(5);
            y = startY + (index % 4) * (h + mmToPx(3));
          } else {
            w = mmToPx(currentSpec.mmW);
            h = mmToPx(currentSpec.mmH);
            const gX = (paperW - w * currentSpec.cols) / (currentSpec.cols + 1);
            const gY = (paperH - h * currentSpec.rows) / (currentSpec.rows + 1);
            x = gX + (index % currentSpec.cols) * (w + gX);
            y = gY + Math.floor(index / currentSpec.cols) * (h + gY);
          }
          ctx.drawImage(img, x, y, w, h);
          ctx.strokeStyle = '#EAEAEA'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
          resolve();
        };
        img.src = dataUrl;
      });
    });

    Promise.all(promises).then(() => {
      const link = document.createElement('a');
      link.download = `EzID_Layout_${currentSpec.id}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen font-sans">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-black text-blue-600 tracking-tight">EzID 台灣版</h1>
        <div className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">V1.8 LIVE</div>
      </header>
      
      <div className="mb-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">排版清單 ({photoList.length}/{currentSpec.max})</span>
          {photoList.length > 0 && <button onClick={() => setPhotoList([])} className="text-[10px] text-red-400 font-bold hover:underline">全部清空</button>}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 min-h-[60px] items-center no-scrollbar">
          {photoList.map((img, i) => (
            <div key={i} className="relative flex-shrink-0 animate-in fade-in zoom-in duration-300">
              <img src={img} className="h-16 w-12 border-2 border-white rounded-lg shadow-md object-cover bg-gray-50" />
              <button onClick={() => setPhotoList(photoList.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center border-2 border-white shadow">×</button>
            </div>
          ))}
          {photoList.length === 0 && <p className="text-[11px] text-gray-300 italic py-4">請選取照片並加入，下載時會自動循環填滿空格</p>}
        </div>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-200 p-1.5 rounded-2xl">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => {setCurrentSpec(s); setPhotoList([]);}} className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all ${currentSpec.id === s.id ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {!image ? (
        <div className="space-y-4">
          <label className="block border-2 border-dashed border-gray-200 rounded-[2.5rem] p-20 text-center cursor-pointer bg-white hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 group">
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🖼️</div>
            <p className="text-gray-500 font-bold">上傳第 {photoList.length + 1} 位照片</p>
            <p className="text-[10px] text-gray-300 mt-1 uppercase font-medium">Supports JPG, PNG</p>
          </label>
          {photoList.length > 0 && (
            <button onClick={downloadFinalPrint} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all text-lg tracking-wide">
              立即下載 4x6 拼板
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 bg-white p-5 rounded-[2.5rem] shadow-xl border border-gray-100 animate-in slide-in-from-bottom duration-500">
          <div className="relative">
            <canvas ref={canvasRef} width={350} height={450} className="w-full border rounded-2xl bg-white shadow-inner" />
            {isRemovingBg && <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bold text-blue-600 animate-pulse">AI 去背中...</p>
            </div>}
          </div>
          
          <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">縮放放大</p>
                <input type="range" min="0.1" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none accent-blue-600" />
              </div>
              <button onClick={handleRemoveBackground} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-purple-100 active:scale-90 transition-all">AI 去背</button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setOffset(o => ({...o, y: o.y-10}))} className="bg-white border-2 border-gray-100 py-3 rounded-xl text-xs font-bold text-gray-600 active:bg-gray-200 transition-colors">↑ 上移</button>
              <button onClick={() => setOffset(o => ({...o, y: o.y+10}))} className="bg-white border-2 border-gray-100 py-3 rounded-xl text-xs font-bold text-gray-600 active:bg-gray-200 transition-colors">↓ 下移</button>
            </div>
          </div>

          <button onClick={addToQueue} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-lg hover:shadow-2xl transition-all">
            確認並加入排版
          </button>
          <button onClick={() => setImage(null)} className="w-full text-gray-400 text-xs font-bold tracking-widest uppercase py-2">放棄重選</button>
        </div>
      )}
      
      <canvas ref={exportCanvasRef} className="hidden" />
      
      <footer className="mt-8 text-center pb-8">
        <p className="text-[10px] text-gray-300 font-medium tracking-tighter">本工具僅供個人沖印使用，請確保照片符合身分證/護照規範</p>
      </footer>
    </div>
  );
};

export default EzIDApp;
