import React, { useState, useRef, useEffect, useCallback } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
};

// 正式服裝素材 (建議使用去背的 PNG 檔案)
const CLOTHES = {
  MALE: [
    { id: 'm1', label: '男西裝 1', url: 'https://i.imgur.com/uX8D88i.png' },
    { id: 'm2', label: '男西裝 2', url: 'https://i.imgur.com/vHAnVlW.png' }
  ],
  FEMALE: [
    { id: 'f1', label: '女套裝 1', url: 'https://i.imgur.com/XF9r4uF.png' },
    { id: 'f2', label: '女套裝 2', url: 'https://i.imgur.com/kK3U88f.png' }
  ]
};

const BACKGROUND_COLORS = [
  { id: 'white', label: '白', hex: '#FFFFFF' },
  { id: 'blue', label: '藍', hex: '#E6F3FF' },
  { id: 'gray', label: '灰', hex: '#F5F5F5' }
];

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
  
  // 👔 服裝相關 State
  const [gender, setGender] = useState('MALE');
  const [selectedSuit, setSelectedSuit] = useState(null);
  const [suitConfig, setSuitConfig] = useState({ scale: 0.5, y: 150 });

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
        img.onload = () => { 
          setImage(img); setBgRemovedImage(null); setScale(0.5); 
          setOffset({ x: 0, y: 0 }); setSelectedSuit(null);
        };
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

  // 繪製預覽畫面
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, 350, 450);
    
    const activeImg = bgRemovedImage || image;
    
    // 1. 畫人像
    ctx.save();
    ctx.translate(175 + offset.x, 225 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
    ctx.restore();

    // 2. 畫衣服 (蓋在人像上面)
    if (selectedSuit) {
      const suitImg = new Image();
      suitImg.crossOrigin = "anonymous";
      suitImg.onload = () => {
        ctx.save();
        ctx.translate(175, 225 + suitConfig.y);
        ctx.scale(suitConfig.scale, suitConfig.scale);
        ctx.drawImage(suitImg, -suitImg.width / 2, -suitImg.height / 2);
        ctx.restore();
        drawGuide(ctx); // 重新畫輔助線在最上層
      };
      suitImg.src = selectedSuit.url;
    } else {
      drawGuide(ctx);
    }
  }, [image, bgRemovedImage, scale, offset, selectedBgColor, selectedSuit, suitConfig]);

  const drawGuide = (ctx) => {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2);
    ctx.stroke();
  };

  const addToQueue = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setPhotoList([...photoList, dataUrl]);
    setImage(null);
    setSelectedSuit(null);
  };

  const downloadFinalPrint = () => {
    if (photoList.length === 0) return;
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
            const isTwoInch = index < 4;
            w = mmToPx(isTwoInch ? 35 : 28);
            h = mmToPx(isTwoInch ? 45 : 35);
            const cellW = paperW / 4;
            x = (index % 4) * cellW + (cellW - w) / 2;
            y = isTwoInch ? (paperH / 2 - h) / 2 : paperH / 2 + (paperH / 2 - h) / 2;
          } else {
            w = mmToPx(currentSpec.mmW); h = mmToPx(currentSpec.mmH);
            const cellW = paperW / currentSpec.cols; const cellH = paperH / currentSpec.rows;
            x = (index % currentSpec.cols) * cellW + (cellW - w) / 2;
            y = Math.floor(index / currentSpec.cols) * cellH + (cellH - h) / 2;
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
      link.download = `EzID_Formal.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.98);
      link.click();
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen font-sans">
      <h1 className="text-xl font-black text-center mb-4 text-blue-600">EzID 智能證件照</h1>
      
      {/* 待印清單 */}
      <div className="mb-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-2 overflow-x-auto no-scrollbar min-h-[60px]">
        {photoList.map((img, i) => (
          <img key={i} src={img} className="h-14 w-11 border rounded shadow-sm object-cover bg-gray-50" />
        ))}
        {photoList.length === 0 && <p className="text-[10px] text-gray-300 self-center mx-auto">尚未加入照片</p>}
      </div>

      {!image ? (
        <label className="block border-2 border-dashed border-gray-200 rounded-[2rem] p-16 text-center cursor-pointer bg-white">
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
          <div className="text-3xl mb-2">👔</div>
          <p className="text-gray-500 font-bold">上傳照片開始製作</p>
          {photoList.length > 0 && (
            <button onClick={(e) => {e.preventDefault(); downloadFinalPrint();}} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-full text-sm">下載目前拼板</button>
          )}
        </label>
      ) : (
        <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
          <canvas ref={canvasRef} width={350} height={450} className="w-full border rounded-2xl shadow-lg bg-white" />
          
          {/* 編輯選單 */}
          <div className="bg-white p-4 rounded-3xl shadow-sm space-y-4 border border-gray-100">
            {/* 背景與去背 */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {BACKGROUND_COLORS.map(c => (
                  <button key={c.id} onClick={() => setSelectedBgColor(c.hex)} className={`w-6 h-6 rounded-full border-2 ${selectedBgColor === c.hex ? 'border-blue-500' : 'border-gray-200'}`} style={{backgroundColor: c.hex}} />
                ))}
              </div>
              <button onClick={handleRemoveBackground} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${isRemovingBg ? 'bg-gray-200' : 'bg-purple-600 text-white'}`}>
                {isRemovingBg ? 'AI 處理中...' : '一鍵去背'}
              </button>
            </div>

            {/* 換裝功能 */}
            <div className="border-t pt-3">
              <div className="flex gap-2 mb-3">
                <button onClick={() => setGender('MALE')} className={`flex-1 py-1 text-xs rounded-md ${gender === 'MALE' ? 'bg-blue-100 text-blue-600 font-bold' : 'bg-gray-50 text-gray-400'}`}>男士服裝</button>
                <button onClick={() => setGender('FEMALE')} className={`flex-1 py-1 text-xs rounded-md ${gender === 'FEMALE' ? 'bg-pink-100 text-pink-600 font-bold' : 'bg-gray-50 text-gray-400'}`}>女士服裝</button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <button onClick={() => setSelectedSuit(null)} className="flex-shrink-0 w-12 h-12 border-2 border-dashed border-gray-200 rounded-lg text-[10px] text-gray-400">原本</button>
                {CLOTHES[gender].map(suit => (
                  <button key={suit.id} onClick={() => setSelectedSuit(suit)} className={`flex-shrink-0 w-12 h-12 border-2 rounded-lg overflow-hidden ${selectedSuit?.id === suit.id ? 'border-blue-500' : 'border-gray-100'}`}>
                    <img src={suit.url} className="w-full h-full object-contain bg-gray-50" alt={suit.label} />
                  </button>
                ))}
              </div>
              {selectedSuit && (
                <div className="mt-3 flex gap-2 items-center">
                  <span className="text-[10px] text-gray-400 font-bold">衣服微調:</span>
                  <button onClick={() => setSuitConfig(prev => ({...prev, y: prev.y - 5}))} className="bg-gray-100 px-2 py-1 rounded text-[10px]">↑</button>
                  <button onClick={() => setSuitConfig(prev => ({...prev, y: prev.y + 5}))} className="bg-gray-100 px-2 py-1 rounded text-[10px]">↓</button>
                  <button onClick={() => setSuitConfig(prev => ({...prev, scale: prev.scale + 0.05}))} className="bg-gray-100 px-2 py-1 rounded text-[10px]">＋</button>
                  <button onClick={() => setSuitConfig(prev => ({...prev, scale: prev.scale - 0.05}))} className="bg-gray-100 px-2 py-1 rounded text-[10px]">－</button>
                </div>
              )}
            </div>

            {/* 縮放人像 */}
            <div className="flex gap-4 items-center border-t pt-3">
              <span className="text-[10px] text-gray-400 font-bold">人像縮放</span>
              <input type="range" min="0.1" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="flex-1 accent-blue-600 h-1.5 bg-gray-100 rounded-lg appearance-none" />
            </div>

            <button onClick={addToQueue} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">
              確認此人並加入清單
            </button>
          </div>
        </div>
      )}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

export default EzIDApp;
