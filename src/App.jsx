import React, { useState, useRef, useEffect } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
};

// --- 全部統一為小寫路徑，使用相對路徑避免跨域或大小寫問題 ---
const CLOTHES_DATA = {
  MALE: [1, 2, 3, 4, 5].map(i => ({ id: `m${i}`, url: `clothes/suit-m${i}.png` })),
  FEMALE: [1, 2, 3, 4, 5].map(i => ({ id: `f${i}`, url: `clothes/suit-f${i}.png` }))
};

const BACKGROUND_COLORS = [{ id: 'w', hex: '#FFFFFF' }, { id: 'b', hex: '#E6F3FF' }, { id: 'g', hex: '#F5F5F5' }];
const mmToPx = (mm) => Math.round((mm * 300) / 25.4);
const PAPER_4X6 = { mmW: 101.6, mmH: 152.4 };

const EzIDApp = () => {
  const [image, setImage] = useState(null);
  const [bgRemovedImage, setBgRemovedImage] = useState(null);
  const [currentSpec, setCurrentSpec] = useState(SPECS.TWO_INCH);
  
  // 人像調整
  const [scale, setScale] = useState(0.5);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  
  const [selectedBgColor, setSelectedBgColor] = useState('#FFFFFF');
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [photoList, setPhotoList] = useState([]);
  const [gender, setGender] = useState('MALE');
  const [selectedSuit, setSelectedSuit] = useState(null);
  
  // 衣服調整
  const [suitY, setSuitY] = useState(55);
  const [suitScale, setSuitScale] = useState(0.6);

  const canvasRef = useRef(null);
  const exportCanvasRef = useRef(null);
  const uploadedFileRef = useRef(null);

  // 渲染主預覽畫布
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    
    // 1. 背景顏色
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, 350, 450);
    
    // 2. 繪製人像 (包含位移與縮放)
    const activeImg = bgRemovedImage || image;
    ctx.save();
    ctx.translate(175 + posX, 225 + posY);
    ctx.scale(scale, scale);
    ctx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
    ctx.restore();
    
    // 3. 繪製輔助線 (橢圓範圍)
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2);
    ctx.stroke();
  }, [image, bgRemovedImage, scale, posX, posY, selectedBgColor]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadedFileRef.current = file;
      const reader = new FileReader();
      reader.onload = (f) => {
        const img = new Image();
        img.onload = () => { 
          setImage(img); 
          setBgRemovedImage(null); 
          setSelectedSuit(null); 
          setPosX(0); setPosY(0); setScale(0.5);
        };
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
    } catch (e) { 
      alert("去背失敗，請確認網路連線。"); 
      setIsRemovingBg(false); 
    }
  };

  const addToQueue = () => {
    if (!canvasRef.current) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 350; tempCanvas.height = 450;
    const tCtx = tempCanvas.getContext('2d');
    
    // 先畫底層（人像與背景）
    tCtx.drawImage(canvasRef.current, 0, 0);

    // 如果有選衣服，疊加上去
    if (selectedSuit) {
      const sImg = new Image();
      sImg.crossOrigin = "anonymous";
      // 強制使用小寫網址
      sImg.src = `./${selectedSuit.url}`; 
      
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
        alert("衣服圖片加載失敗，請檢查 clothes 資料夾是否為全小寫。");
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
      link.download = `EzID_Result.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-100 min-h-screen font-sans text-gray-800">
      <header className="text-center mb-4">
        <h1 className="text-blue-600 font-black text-2xl italic tracking-tighter">EzID V3.20</h1>
      </header>
      
      {/* 1. 尺寸選擇器 */}
      <div className="flex gap-1 mb-4 bg-gray-200 p-1 rounded-xl shadow-inner">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => {setCurrentSpec(s); setPhotoList([]);}} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${currentSpec.id === s.id ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}>{s.label}</button>
        ))}
      </div>

      {/* 2. 待下載清單 */}
      <div className="flex gap-2 overflow-x-auto mb-4 bg-white p-3 rounded-2xl border min-h-[70px] no-scrollbar">
        {photoList.length === 0 && <div className="text-gray-300 w-full text-center py-2 text-xs font-bold">待加入照片預覽...</div>}
        {photoList.map((img, i) => (<img key={i} src={img} className="h-14 w-11 rounded border shadow-sm flex-shrink-0" />))}
      </div>

      {!image ? (
        <label className="block border-4 border-dashed border-gray-300 rounded-[2.5rem] p-16 text-center cursor-pointer bg-white hover:bg-gray-50 transition-colors">
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
          <span className="text-5xl block mb-4">📷</span>
          <span className="font-black text-gray-400 text-lg uppercase">點擊上傳人像</span>
        </label>
      ) : (
        <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl border space-y-4">
          {/* 預覽區域 */}
          <div className="relative w-full aspect-[35/45] rounded-3xl overflow-hidden bg-gray-200 shadow-inner border-4 border-white">
            <canvas ref={canvasRef} width={350} height={450} className="w-full h-full" />
            {selectedSuit && (
              <img 
                src={selectedSuit.url} 
                className="absolute pointer-events-none" 
                style={{ left: '50%', top: `${suitY}%`, transform: `translate(-50%, -50%) scale(${suitScale * 2.2})`, width: '100%' }}
              />
            )}
            {isRemovingBg && (
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                <span className="font-bold text-blue-600 animate-pulse">AI 正在去背...</span>
              </div>
            )}
          </div>

          {/* 調整面板 */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-3xl border">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {BACKGROUND_COLORS.map(c => <button key={c.id} onClick={() => setSelectedBgColor(c.hex)} className={`w-7 h-7 rounded-full border-2 ${selectedBgColor === c.hex ? 'border-blue-500' : 'border-white'}`} style={{backgroundColor: c.hex}} />)}
              </div>
              <button onClick={handleRemoveBg} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-transform">一鍵去背</button>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <span className="text-[10px] font-black text-gray-400 block mb-2 uppercase tracking-widest text-center">人像位置調整</span>
              <div className="grid grid-cols-4 gap-1">
                <button onClick={() => setPosY(posY - 3)} className="bg-white border py-2 rounded-lg text-[10px] font-bold active:bg-blue-50">上移</button>
                <button onClick={() => setPosY(posY + 3)} className="bg-white border py-2 rounded-lg text-[10px] font-bold active:bg-blue-50">下移</button>
                <button onClick={() => setPosX(posX - 3)} className="bg-white border py-2 rounded-lg text-[10px] font-bold active:bg-blue-50">左移</button>
                <button onClick={() => setPosX(posX + 3)} className="bg-white border py-2 rounded-lg text-[10px] font-bold active:bg-blue-50">右移</button>
              </div>
              <input type="range" min="0.1" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full mt-3 accent-blue-600" />
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex gap-2 mb-3">
                <button onClick={() => setGender('MALE')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${gender === 'MALE' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>男西裝</button>
                <button onClick={() => setGender('FEMALE')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${gender === 'FEMALE' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-400'}`}>女套裝</button>
              </div>
              <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar mb-2">
                <button onClick={() => setSelectedSuit(null)} className="w-12 h-12 border-2 border-dashed rounded-lg flex-shrink-0 text-[10px] text-gray-400 bg-white">原本</button>
                {CLOTHES_DATA[gender].map(s => (
                  <button key={s.id} onClick={() => setSelectedSuit(s)} className={`w-12 h-12 border-2 rounded-lg flex-shrink-0 overflow-hidden transition-all ${selectedSuit?.id === s.id ? 'border-blue-500 bg-blue-50 scale-105' : 'border-transparent bg-white shadow-sm'}`}>
                    <img src={s.url} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
              {selectedSuit && (
                <div className="grid grid-cols-4 gap-1">
                  <button onClick={() => setSuitY(suitY - 1)} className="bg-blue-50 text-blue-600 border border-blue-100 py-1.5 rounded text-[10px] font-bold">衣上</button>
                  <button onClick={() => setSuitY(suitY + 1)} className="bg-blue-50 text-blue-600 border border-blue-100 py-1.5 rounded text-[10px] font-bold">衣下</button>
                  <button onClick={() => setSuitScale(suitScale + 0.01)} className="bg-blue-50 text-blue-600 border border-blue-100 py-1.5 rounded text-[10px] font-bold">衣大</button>
                  <button onClick={() => setSuitScale(suitScale - 0.01)} className="bg-blue-50 text-blue-600 border border-blue-100 py-1.5 rounded text-[10px] font-bold">衣小</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setImage(null)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-bold text-gray-500">取消</button>
            <button onClick={addToQueue} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg active:scale-[0.98] transition-all">確認加入</button>
          </div>
        </div>
      )}

      {photoList.length > 0 && !image && (
        <button onClick={downloadPrint} className="w-full mt-4 bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg animate-pulse">
          下載 4x6 拼板照片
        </button>
      )}
      
      <canvas ref={exportCanvasRef} className="hidden" />
      <footer className="mt-8 text-center text-[10px] text-gray-400 font-medium">EzID Taiwan - 證件照自動排版系統</footer>
    </div>
  );
};

export default EzIDApp;
