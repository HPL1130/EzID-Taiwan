import React, { useState, useRef, useEffect, useCallback } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
};

const BACKGROUND_COLORS = [
  { id: 'white', label: '白色', hex: '#FFFFFF' },
  { id: 'lightgray', label: '淺灰', hex: '#F5F5F5' },
  { id: 'blue', label: '淺藍', hex: '#E6F3FF' }
];

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
      alert(`此規格已滿 (${currentSpec.max}張)`);
      return;
    }
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 350; tempCanvas.height = 450;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.fillStyle = selectedBgColor;
    tCtx.fillRect(0, 0, 350, 450);
    const activeImg = bgRemovedImage || image;
    tCtx.save();
    tCtx.translate(175 + offset.x, 225 + offset.y);
    tCtx.scale(scale, scale);
    tCtx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
    tCtx.restore();
    setPhotoList([...photoList, tempCanvas.toDataURL('image/png')]);
    setImage(null);
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
    ctx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)'; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2); ctx.stroke();
  }, [image, bgRemovedImage, scale, offset, selectedBgColor]);

  const downloadFinalPrint = () => {
    if (photoList.length === 0) return;
    const canvas = exportCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const paperW = mmToPx(PAPER_4X6.mmH); 
    const paperH = mmToPx(PAPER_4X6.mmW);
    canvas.width = paperW; canvas.height = paperH;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, paperW, paperH);

    const finalPhotos = [];
    for (let i = 0; i < currentSpec.max; i++) {
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
            const cellW = paperW / 4;
            const col = index % 4;
            x = col * cellW + (cellW - w) / 2;
            y = isTwoInch ? (paperH / 2 - h) / 2 : paperH / 2 + (paperH / 2 - h) / 2;
          } else {
            w = mmToPx(currentSpec.mmW);
            h = mmToPx(currentSpec.mmH);
            const cellW = paperW / currentSpec.cols;
            const cellH = paperH / currentSpec.rows;
            x = (index % currentSpec.cols) * cellW + (cellW - w) / 2;
            y = Math.floor(index / currentSpec.cols) * cellH + (cellH - h) / 2;
          }
          ctx.drawImage(img, x, y, w, h);
          ctx.strokeStyle = '#EEEEEE'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
          resolve();
        };
        img.src = dataUrl;
      });
    });

    Promise.all(promises).then(() => {
      const link = document.createElement('a');
      link.download = `EzID_Layout_${currentSpec.id}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.98);
      link.click();
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen font-sans">
      <h1 className="text-xl font-black text-center mb-4 text-blue-600 tracking-tighter uppercase">EzID Taiwan</h1>
      
      <div className="mb-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">已選照片 ({photoList.length}/{currentSpec.max})</span>
          {photoList.length > 0 && <button onClick={() => setPhotoList([])} className="text-[10px] text-red-400 font-bold">清空全部</button>}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar min-h-[70px]">
          {photoList.map((img, i) => (
            <div key={i} className="relative flex-shrink-0">
              <img src={img} className="h-16 w-12 border rounded-lg shadow-sm object-cover bg-gray-50" />
              <button onClick={() => setPhotoList(photoList.filter((_, idx) => idx !== i))} className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button>
            </div>
          ))}
          {photoList.length === 0 && <p className="text-[11px] text-gray-300 italic self-center">照片將依序循環填滿格子</p>}
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-200 p-1 rounded-2xl">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => {setCurrentSpec(s); setPhotoList([]);}} className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all ${currentSpec.id === s.id ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {!image ? (
        <div className="space-y-4">
          <label className="block border-2 border-dashed border-gray-200 rounded-[2.5rem] p-20 text-center cursor-pointer bg-white">
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            <div className="text-4xl mb-3">📸</div>
            <p className="text-gray-500 font-bold">點擊上傳新人物</p>
          </label>
          {photoList.length > 0 && (
            <button onClick={downloadFinalPrint} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-xl hover:bg-blue-700 active:scale-95 transition-all text-lg tracking-wide">
              下載 4x6 橫式拼板
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 bg-white p-5 rounded-[2.5rem] shadow-xl border border-gray-100">
          <div className="relative">
            <canvas ref={canvasRef} width={350} height={450} className="w-full border rounded-2xl bg-white" />
            {isRemovingBg && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl font-bold text-blue-600 animate-pulse">AI 去背中...</div>
            )}
          </div>
          
          <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
            {/* 背景顏色選擇 */}
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase">背景底色</span>
              <div className="flex gap-2">
                {BACKGROUND_COLORS.map(c => (
                  <button key={c.id} onClick={() => setSelectedBgColor(c.hex)} className={`w-8 h-8 rounded-full border-2 transition-all ${selectedBgColor === c.hex ? 'border-blue-600 scale-110' : 'border-white'}`} style={{backgroundColor: c.hex}} title={c.label} />
                ))}
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <input type="range" min="0.1" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none accent-blue-600" />
              <button onClick={handleRemoveBackground} className="bg-purple-600 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-purple-100">AI 去背</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setOffset(o => ({...o, y: o.y-10}))} className="bg-white border py-3 rounded-xl text-xs font-bold text-gray-600">↑ 上移</button>
              <button onClick={() => setOffset(o => ({...o, y: o.y+10}))} className="bg-white border py-3 rounded-xl text-xs font-bold text-gray-600">↓ 下移</button>
            </div>
          </div>

          <button onClick={addToQueue} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-lg hover:bg-blue-700 transition-all">
            確認加入排版
          </button>
          <button onClick={() => setImage(null)} className="w-full text-gray-300 text-[10px] font-bold py-2">放棄並返回</button>
        </div>
      )}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

export default EzIDApp;
