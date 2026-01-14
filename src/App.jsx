import React, { useState, useRef, useEffect } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

// --- 1. 原始規格與資料（保持不變） ---
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

const BACKGROUND_COLORS = [{ id: 'w', hex: '#FFFFFF' }, { id: 'b', hex: '#E6F3FF' }, { id: 'g', hex: '#F5F5F5' }];
const mmToPx = (mm) => Math.round((mm * 300) / 25.4);
const PAPER_4X6 = { mmW: 101.6, mmH: 152.4 };

const EzIDApp = () => {
  // --- 狀態保持 ---
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
  const [suitConfig, setSuitConfig] = useState({ scale: 0.6, y: 55 });

  const canvasRef = useRef(null);
  const exportCanvasRef = useRef(null);
  const uploadedFileRef = useRef(null);

  // --- 2. 核心修復：Canvas 繪製邏輯（加入衣服即時調整） ---
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    
    // 背景
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, 350, 450);

    // 畫人像
    const activeImg = bgRemovedImage || image;
    ctx.save();
    ctx.translate(175 + offset.x, 225 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
    ctx.restore();

    // 畫衣服
    if (selectedSuit) {
      const sImg = new Image();
      sImg.crossOrigin = "anonymous";
      sImg.src = selectedSuit.url;
      sImg.onload = () => {
        ctx.save();
        ctx.translate(175, (suitConfig.y / 100) * 450);
        ctx.scale(suitConfig.scale * 2.2, suitConfig.scale * 2.2);
        ctx.drawImage(sImg, -sImg.width / 2, -sImg.height / 2);
        ctx.restore();
        drawOverlay(ctx); // 畫紅輔助線
      };
    } else {
      drawOverlay(ctx);
    }
  }, [image, bgRemovedImage, scale, offset, selectedBgColor, selectedSuit, suitConfig]);

  const drawOverlay = (ctx) => {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2);
    ctx.stroke();
  };

  // --- 3. 原始功能函數（全數保留） ---
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadedFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (f) => {
      const img = new Image();
      img.onload = () => { setImage(img); setBgRemovedImage(null); setSelectedSuit(null); };
      img.src = f.target.result;
    };
    reader.readAsDataURL(file);
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
    setPhotoList(prev => [...prev, canvasRef.current.toDataURL('image/png')]);
    setImage(null);
  };

  const downloadPrint = () => {
    const canvas = exportCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const paperW = mmToPx(PAPER_4X6.mmH); 
    const paperH = mmToPx(PAPER_4X6.mmW);
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
      link.download = `EzID_Layout.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    });
  };

  // --- 4. 介面渲染（回復所有尺寸選擇元件） ---
  return (
    <div className="max-w-md mx-auto p-4 bg-gray-100 min-h-screen font-sans">
      <header className="text-center mb-4"><h1 className="text-blue-600 font-black text-2xl tracking-tighter">EzID 智慧證件 V3.2</h1></header>

      {/* 規格選擇元件 (回復) */}
      <div className="flex gap-1 mb-4 bg-gray-200 p-1 rounded-xl shadow-inner">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => {setCurrentSpec(s); setPhotoList([]);}} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition ${currentSpec.id === s.id ? 'bg-white text-blue-600 shadow' : 'text-gray-500'}`}>{s.label}</button>
        ))}
      </div>

      {/* 待下載清單 (回復) */}
      <div className="flex gap-2 overflow-x-auto mb-4 bg-white p-3 rounded-2xl border min-h-[70px] no-scrollbar">
        {photoList.length === 0 && <span className="text-gray-300 text-xs w-full text-center">清單為空</span>}
        {photoList.map((img, i) => (<img key={i} src={img} className="h-14 w-11 rounded border shadow-sm flex-shrink-0" />))}
      </div>

      {!image ? (
        <div className="space-y-4">
          <label className="block border-4 border-dashed border-gray-300 rounded-[2.5rem] p-16 text-center cursor-pointer bg-white">
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            <span className="text-5xl block mb-4">📸</span>
            <span className="font-bold text-gray-500 text-lg">點擊上傳大頭照</span>
          </label>
          {photoList.length > 0 && (
            <button onClick={downloadPrint} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg">下載 4x6 拼板 ({photoList.length})</button>
          )}
        </div>
      ) : (
        <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl border space-y-4">
          {/* 畫布區域 */}
          <div className="relative aspect-[35/45] rounded-3xl overflow-hidden bg-gray-200">
            <canvas ref={canvasRef} width={350} height={450} className="w-full h-full" />
            {isRemovingBg && <div className="absolute inset-0 bg-white/70 flex items-center justify-center font-bold text-blue-600">AI 去背中...</div>}
          </div>

          {/* 控制面板 */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-3xl border">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {BACKGROUND_COLORS.map(c => <button key={c.id} onClick={() => setSelectedBgColor(c.hex)} className={`w-7 h-7 rounded-full border-2 ${selectedBgColor === c.hex ? 'border-blue-500' : 'border-white'}`} style={{backgroundColor: c.hex}} />)}
              </div>
              <button onClick={handleRemoveBg} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold">AI 去背</button>
            </div>

            <div className="border-t pt-4">
              <div className="flex gap-2 mb-3">
                <button onClick={() => setGender('MALE')} className={`flex-1 py-2 rounded-xl font-bold ${gender === 'MALE' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>男西裝</button>
                <button onClick={() => setGender('FEMALE')} className={`flex-1 py-2 rounded-xl font-bold ${gender === 'FEMALE' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-400'}`}>女套裝</button>
              </div>
              <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                <button onClick={() => setSelectedSuit(null)} className="w-14 h-14 border-2 border-dashed rounded-xl flex-shrink-0 text-xs text-gray-300">原本</button>
                {CLOTHES_DATA[gender].map(s => (
                  <button key={s.id} onClick={() => setSelectedSuit(s)} className={`w-14 h-14 border-2 rounded-xl flex-shrink-0 overflow-hidden ${selectedSuit?.id === s.id ? 'border-blue-500' : 'border-transparent'}`}>
                    <img src={s.url} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
              
              {/* 衣服調整按鈕 (核心修正) */}
              {selectedSuit && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  <button onClick={() => setSuitConfig(p => ({...p, y: p.y-1}))} className="bg-white border py-2 rounded-lg font-bold shadow-sm active:bg-gray-100">上移</button>
                  <button onClick={() => setSuitConfig(p => ({...p, y: p.y+1}))} className="bg-white border py-2 rounded-lg font-bold shadow-sm active:bg-gray-100">下移</button>
                  <button onClick={() => setSuitConfig(p => ({...p, scale: p.scale+0.01}))} className="bg-white border py-2 rounded-lg font-bold shadow-sm active:bg-gray-100">放大</button>
                  <button onClick={() => setSuitConfig(p => ({...p, scale: p.scale-0.01}))} className="bg-white border py-2 rounded-lg font-bold shadow-sm active:bg-gray-100">縮小</button>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <span className="text-[10px] font-bold text-gray-400">人像縮放</span>
              <input type="range" min="0.1" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full accent-blue-600" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => {setImage(null); setSelectedSuit(null);}} className="flex-1 bg-gray-200 text-gray-500 py-4 rounded-2xl font-bold">重新上傳</button>
            <button onClick={addToQueue} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg">確認加入</button>
          </div>
        </div>
      )}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

export default EzIDApp;
