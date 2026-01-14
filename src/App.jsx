import React, { useState, useRef, useEffect } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
};

// 這是最保險的路徑處理法
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
  const [suitY, setSuitY] = useState(55);
  const [suitScale, setSuitScale] = useState(0.6);

  const canvasRef = useRef(null);
  const exportCanvasRef = useRef(null);
  const uploadedFileRef = useRef(null);

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
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)'; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2); ctx.stroke();
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
        // 如果衣服載入失敗，報錯但繼續存檔，不讓程式崩潰
        console.error("衣服載入失敗，路徑:", selectedSuit.url);
        setPhotoList(prev => [...prev, tempCanvas.toDataURL('image/png')]);
        setImage(null);
      };
    } else {
      setPhotoList(prev => [...prev, tempCanvas.toDataURL('image/png')]);
      setImage(null);
    }
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
          ctx.drawImage(img, x, y, w, h); resolve();
        };
        img.src = dataUrl;
      });
    });
    Promise.all(promises).then(() => {
      const link = document.createElement('a');
      link.download = `EzID_Print.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-100 min-h-screen font-sans">
      <header className="text-center mb-4"><h1 className="text-blue-600 font-black text-2xl tracking-tighter">EzID V3.14</h1></header>
      
      {/* 尺寸選擇 */}
      <div className="flex gap-1 mb-4 bg-gray-200 p-1 rounded-xl shadow-inner">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => {setCurrentSpec(s); setPhotoList([]);}} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg ${currentSpec.id === s.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>{s.label}</button>
        ))}
      </div>

      {/* 照片預覽列 */}
      <div className="flex gap-2 overflow-x-auto mb-4 bg-white p-3 rounded-2xl border min-h-[70px]">
        {photoList.length === 0 && <div className="text-gray-300 w-full text-center py-2 text-xs">尚未加入照片</div>}
        {photoList.map((img, i) => (<img key={i} src={img} className="h-14 w-11 rounded border shadow-sm flex-shrink-0" />))}
      </div>

      {!image ? (
        <label className="block border-4 border-dashed border-gray-300 rounded-[2.5rem] p-16 text-center cursor-pointer bg-white">
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
          <span className="text-5xl block mb-4">📸</span>
          <span className="font-bold text-gray-500">上傳人像照</span>
        </label>
      ) : (
        <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl border space-y-4">
          <div className="relative w-full aspect-[35/45] rounded-3xl overflow-hidden bg-gray-200">
            <canvas ref={canvasRef} width={350} height={450} className="w-full h-full" />
            {selectedSuit && (
              <img 
                src={selectedSuit.url} 
                className="absolute pointer-events-none" 
                style={{
                  left: '50%', top: `${suitY}%`, 
                  transform: `translate(-50%, -50%) scale(${suitScale * 2.2})`, 
                  width: '100%'
                }}
                onError={(e) => {
                    // 保險機制：如果 /clothes/suit-m1.png 抓不到，嘗試去掉 /clothes/
                    if (e.target.src.includes('clothes/')) {
                      e.target.src = e.target.src.replace('clothes/', '');
                    }
                }}
              />
            )}
            {isRemovingBg && <div className="absolute inset-0 bg-white/70 flex items-center justify-center font-bold">AI 去背中...</div>}
          </div>

          <div className="space-y-4 bg-gray-50 p-4 rounded-3xl border">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {BACKGROUND_COLORS.map(c => <button key={c.id} onClick={() => setSelectedBgColor(c.hex)} className={`w-7 h-7 rounded-full border-2 ${selectedBgColor === c.hex ? 'border-blue-500' : 'border-white'}`} style={{backgroundColor: c.hex}} />)}
              </div>
              <button onClick={handleRemoveBg} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">一鍵去背</button>
            </div>

            <div className="border-t pt-4">
              <div className="flex gap-2 mb-3">
                <button onClick={() => setGender('MALE')} className={`flex-1 py-2 rounded-xl font-bold ${gender === 'MALE' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>男裝</button>
                <button onClick={() => setGender('FEMALE')} className={`flex-1 py-2 rounded-xl font-bold ${gender === 'FEMALE' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-400'}`}>女裝</button>
              </div>
              <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                <button onClick={() => setSelectedSuit(null)} className="w-14 h-14 border-2 border-dashed rounded-xl flex-shrink-0 text-[10px] text-gray-400">原本</button>
                {CLOTHES_DATA[gender].map(s => (
                  <button key={s.id} onClick={() => setSelectedSuit(s)} className={`w-14 h-14 border-2 rounded-xl flex-shrink-0 overflow-hidden ${selectedSuit?.id === s.id ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-white'}`}>
                    <img src={s.url} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>

              {/* 調整按鈕區域 */}
              {selectedSuit && (
                <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-dashed">
                  <button onClick={() => setSuitY(suitY - 1)} className="bg-white border py-2 rounded-lg text-xs font-bold active:bg-gray-100">上移</button>
                  <button onClick={() => setSuitY(suitY + 1)} className="bg-white border py-2 rounded-lg text-xs font-bold active:bg-gray-100">下移</button>
                  <button onClick={() => setSuitScale(suitScale + 0.01)} className="bg-white border py-2 rounded-lg text-xs font-bold active:bg-gray-100">放大</button>
                  <button onClick={() => setSuitScale(suitScale - 0.01)} className="bg-white border py-2 rounded-lg text-xs font-bold active:bg-gray-100">縮小</button>
                </div>
              )}
            </div>
            
            <div className="border-t pt-2 flex items-center gap-4">
              <span className="text-xs font-bold text-gray-400 whitespace-nowrap">人像縮放</span>
              <input type="range" min="0.1" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="flex-1" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setImage(null)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-bold">取消</button>
            <button onClick={addToQueue} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg">確認加入</button>
          </div>
        </div>
      )}
      {photoList.length > 0 && !image && <button onClick={downloadPrint} className="w-full mt-4 bg-green-600 text-white py-4 rounded-2xl font-black text-lg">下載拼板</button>}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

export default EzIDApp;
