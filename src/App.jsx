import React, { useState, useRef, useEffect } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
};

// --- 更新為男 5 女 5 配置 ---
const CLOTHES_DATA = {
  MALE: [
    { id: 'm1', label: '男西裝1', url: '/clothes/suit-m1.png' },
    { id: 'm2', label: '男西裝2', url: '/clothes/suit-m2.png' },
    { id: 'm3', label: '男西裝3', url: '/clothes/suit-m3.png' },
    { id: 'm4', label: '男西裝4', url: '/clothes/suit-m4.png' },
    { id: 'm5', label: '男西裝5', url: '/clothes/suit-m5.png' }
  ],
  FEMALE: [
    { id: 'f1', label: '女套裝1', url: '/clothes/suit-f1.png' },
    { id: 'f2', label: '女套裝2', url: '/clothes/suit-f2.png' },
    { id: 'f3', label: '女套裝3', url: '/clothes/suit-f3.png' },
    { id: 'f4', label: '女套裝4', url: '/clothes/suit-f4.png' },
    { id: 'f5', label: '女套裝5', url: '/clothes/suit-f5.png' }
  ]
};

const BACKGROUND_COLORS = [
  { id: 'w', hex: '#FFFFFF' }, { id: 'b', hex: '#E6F3FF' }, { id: 'g', hex: '#F5F5F5' }
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
  const [gender, setGender] = useState('MALE');
  const [selectedSuit, setSelectedSuit] = useState(null);
  const [suitConfig, setSuitConfig] = useState({ scale: 0.6, y: 55 });

  const canvasRef = useRef(null);
  const exportCanvasRef = useRef(null);
  const uploadedFileRef = useRef(null);

  // 預覽畫布繪製
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
      sImg.src = selectedSuit.url;
      sImg.onload = () => {
        tCtx.save();
        tCtx.translate(175, 225 + (suitConfig.y - 55) * 4.5);
        tCtx.scale(suitConfig.scale * 2.2, suitConfig.scale * 2.2);
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

  const downloadPrint = () => {
    const canvas = exportCanvasRef.current;
    if (!canvas) return;
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

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen font-sans text-sm">
      <h1 className="text-center font-black text-blue-600 text-xl mb-4 tracking-tighter">EzID 台灣證件照 V2.7</h1>
      
      <div className="flex gap-1 mb-4 bg-gray-200 p-1 rounded-xl">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => {setCurrentSpec(s); setPhotoList([]);}} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg ${currentSpec.id === s.id ? 'bg-white text-blue-600' : 'text-gray-500'}`}>{s.label}</button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto mb-4 bg-white p-3 rounded-2xl border min-h-[60px] no-scrollbar">
        {photoList.map((img, i) => (
          <img key={i} src={img} className="h-12 w-9 rounded border object-cover shadow-sm" />
        ))}
      </div>

      {!image ? (
        <label className="block border-2 border-dashed border-gray-300 rounded-[2.5rem] p-16 text-center cursor-pointer bg-white">
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
          <span className="text-3xl block mb-2">📸</span>
          <span className="font-bold text-gray-500">點擊上傳</span>
          {photoList.length > 0 && <button onClick={(e) => {e.preventDefault(); downloadPrint();}} className="mt-4 block w-full bg-blue-600 text-white py-3 rounded-xl font-bold">下載 4x6 拼板</button>}
        </label>
      ) : (
        <div className="bg-white p-4 rounded-[2.5rem] shadow-xl border space-y-4">
          <div className="relative w-full aspect-[35/45] rounded-2xl overflow-hidden bg-gray-200">
            <canvas ref={canvasRef} width={350} height={450} className="w-full h-full" />
            {selectedSuit && (
              <img src={selectedSuit.url} className="absolute pointer-events-none" style={{
                left: '50%', top: `${suitConfig.y}%`, transform: `translate(-50%, -50%) scale(${suitConfig.scale * 2.2})`, width: '100%'
              }} />
            )}
            {isRemovingBg && <div className="absolute inset-0 bg-white/70 flex items-center justify-center font-bold text-blue-600">去背處理中...</div>}
          </div>

          <div className="space-y-3 bg-gray-50 p-4 rounded-2xl">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {BACKGROUND_COLORS.map(c => <button key={c.id} onClick={() => setSelectedBgColor(c.hex)} className={`w-6 h-6 rounded-full border-2 ${selectedBgColor === c.hex ? 'border-blue-500' : 'border-white'}`} style={{backgroundColor: c.hex}} />)}
              </div>
              <button onClick={handleRemoveBg} className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold">一鍵去背</button>
            </div>

            <div className="border-t pt-3">
              <div className="flex gap-2 mb-2">
                <button onClick={() => setGender('MALE')} className={`flex-1 py-1 rounded-lg font-bold ${gender === 'MALE' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>男西裝</button>
                <button onClick={() => setGender('FEMALE')} className={`flex-1 py-1 rounded-lg font-bold ${gender === 'FEMALE' ? 'bg-pink-600 text-white' : 'bg-gray-200'}`}>女套裝</button>
              </div>
              {/* 這裡滾動區塊會自動容納 5 套衣服 */}
              <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                <button onClick={() => setSelectedSuit(null)} className="w-12 h-12 border-2 border-dashed rounded flex-shrink-0 text-[10px] text-gray-400">原本</button>
                {CLOTHES_DATA[gender].map(s => (
                  <button key={s.id} onClick={() => setSelectedSuit(s)} className={`w-12 h-12 border-2 rounded flex-shrink-0 overflow-hidden ${selectedSuit?.id === s.id ? 'border-blue-500 bg-white' : 'border-transparent bg-white'}`}>
                    <img src={s.url} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
              {selectedSuit && (
                <div className="flex gap-1 mt-2">
                  <button onClick={() => setSuitConfig(p => ({...p, y: p.y-1}))} className="flex-1 bg-white border py-1 rounded">↑</button>
                  <button onClick={() => setSuitConfig(p => ({...p, y: p.y+1}))} className="flex-1 bg-white border py-1 rounded">↓</button>
                  <button onClick={() => setSuitConfig(p => ({...p, scale: p.scale+0.02}))} className="flex-1 bg-white border py-1 rounded">＋</button>
                  <button onClick={() => setSuitConfig(p => ({...p, scale: p.scale-0.02}))} className="flex-1 bg-white border py-1 rounded">－</button>
                </div>
              )}
            </div>

            <div className="border-t pt-2 flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">人像縮放</span>
              <input type="range" min="0.1" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="flex-1 accent-blue-600 h-1 bg-gray-200 rounded-lg appearance-none" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setImage(null)} className="flex-1 bg-gray-200 text-gray-600 py-3 rounded-2xl font-bold">取消</button>
            <button onClick={addToQueue} className="flex-[2] bg-blue-600 text-white py-3 rounded-2xl font-black text-lg shadow-lg">確認加入排版</button>
          </div>
        </div>
      )}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

export default EzIDApp;
