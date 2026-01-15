const { useState, useRef, useEffect } = React;

// 1. 定義規格與數據
const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
};

const CLOTHES_DATA = {
  MALE: [1, 2, 3, 4, 5].map(i => ({ id: `m${i}`, url: `public/clothes/suit-m${i}.png` })),
  FEMALE: [1, 2, 3, 4, 5].map(i => ({ id: `f${i}`, url: `public/clothes/suit-f${i}.png` }))
};

const BACKGROUND_COLORS = [
  { id: 'white', hex: '#FFFFFF' },
  { id: 'blue', hex: '#E6F3FF' },
  { id: 'grey', hex: '#F5F5F5' }
];

const mmToPx = (mm) => Math.round((mm * 300) / 25.4);
const PAPER_4X6 = { mmW: 101.6, mmH: 152.4 };

const EzIDApp = () => {
  const [image, setImage] = useState(null);
  const [bgRemovedImage, setBgRemovedImage] = useState(null);
  const [currentSpec, setCurrentSpec] = useState(SPECS.TWO_INCH);
  const [scale, setScale] = useState(0.5);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [selectedBgColor, setSelectedBgColor] = useState('#FFFFFF');
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [photoList, setPhotoList] = useState([]);
  const [gender, setGender] = useState('MALE');
  const [selectedSuit, setSelectedSuit] = useState(null);
  const [suitX, setSuitX] = useState(50);
  const [suitY, setSuitY] = useState(55);
  const [suitScale, setSuitScale] = useState(0.6);

  const canvasRef = useRef(null);
  const exportCanvasRef = useRef(null);
  const uploadedFileRef = useRef(null);

  // 繪製邏輯
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, 350, 450);
    const activeImg = bgRemovedImage || image;
    ctx.save();
    ctx.translate(175 + posX, 225 + posY);
    ctx.scale(scale, scale);
    ctx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
    ctx.restore();
    
    // 輔助線
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.15)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2); ctx.stroke();
  }, [image, bgRemovedImage, scale, posX, posY, selectedBgColor]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadedFileRef.current = file;
      const reader = new FileReader();
      reader.onload = (f) => {
        const img = new Image();
        img.onload = () => { setImage(img); setBgRemovedImage(null); };
        img.src = f.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBg = async () => {
    if (!uploadedFileRef.current) return;
    setIsRemovingBg(true);
    try {
      const remover = window.imglyBackgroundRemoval || window.imglyConfigurableBackgroundRemoval;
      const blob = await remover.removeBackground(uploadedFileRef.current, {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.5.3/dist/"
      });
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
        tCtx.translate((suitX / 100) * 350, (suitY / 100) * 450);
        tCtx.scale(suitScale * 2.2, suitScale * 2.2);
        tCtx.drawImage(sImg, -sImg.width / 2, -sImg.height / 2);
        tCtx.restore();
        setPhotoList(prev => [...prev, tempCanvas.toDataURL('image/png')]);
        setImage(null); setSelectedSuit(null);
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
    <div className="max-w-md mx-auto p-4 bg-gray-100 min-h-screen font-sans">
      <header className="text-center mb-4"><h1 className="text-blue-700 font-black text-2xl">EzID 台灣證件照</h1></header>
      
      {/* 1. 規格切換器 */}
      <div className="flex gap-1 mb-4 bg-gray-200 p-1 rounded-xl shadow-inner">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => {setCurrentSpec(s); setPhotoList([]);}} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${currentSpec.id === s.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>{s.label}</button>
        ))}
      </div>

      {/* 2. 排版進度 */}
      <div className="flex gap-2 overflow-x-auto mb-4 bg-white p-3 rounded-2xl border min-h-[60px]">
        {photoList.map((img, i) => (<img key={i} src={img} className="h-12 w-9 rounded border flex-shrink-0" />))}
        {photoList.length === 0 && <div className="text-gray-300 w-full text-center py-2 text-xs">尚未加入照片</div>}
      </div>

      {!image ? (
        <label className="block border-4 border-dashed border-gray-300 rounded-[2rem] p-12 text-center cursor-pointer bg-white">
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
          <span className="text-5xl block mb-2">📸</span>
          <span className="font-bold text-gray-500">點擊上傳大頭照</span>
        </label>
      ) : (
        <div className="bg-white p-5 rounded-[2rem] shadow-xl border space-y-4">
          {/* 畫布與衣服 */}
          <div className="relative w-full aspect-[35/45] rounded-2xl overflow-hidden bg-gray-100 border">
            <canvas ref={canvasRef} width={350} height={450} className="w-full h-full" />
            {selectedSuit && (
              <img src={selectedSuit.url} className="absolute pointer-events-none" 
                style={{ left: `${suitX}%`, top: `${suitY}%`, transform: `translate(-50%, -50%) scale(${suitScale * 2.2})`, width: '100%' }} 
              />
            )}
            {isRemovingBg && <div className="absolute inset-0 bg-white/70 flex items-center justify-center font-bold text-blue-600 animate-pulse">AI 去背中...</div>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleRemoveBg} className="bg-purple-600 text-white p-3 rounded-xl font-bold shadow-lg">✨ 一鍵去背</button>
            <button onClick={addToQueue} className="bg-blue-600 text-white p-3 rounded-xl font-bold shadow-lg">✅ 加入排版</button>
          </div>

          <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border">
            {/* 顏色 */}
            <div className="flex gap-2 items-center border-b pb-2">
              <span className="text-[10px] font-bold text-gray-400">背景：</span>
              {BACKGROUND_COLORS.map(c => <button key={c.id} onClick={() => setSelectedBgColor(c.hex)} className={`w-6 h-6 rounded-full border-2 ${selectedBgColor === c.hex ? 'border-blue-500' : 'border-white'}`} style={{backgroundColor: c.hex}} />)}
            </div>
            
            {/* 人像調整 */}
            <div className="space-y-2 border-b pb-2">
              <div className="flex gap-1">
                {['上','下','左','右'].map((d,i) => (
                  <button key={d} onClick={() => {
                    if(i===0) setPosY(posY-2); if(i===1) setPosY(posY+2);
                    if(i===2) setPosX(posX-2); if(i===3) setPosX(posX+2);
                  }} className="bg-white border p-1 rounded-md flex-1 text-xs"> {d} </button>
                ))}
              </div>
              <input type="range" min="0.2" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>

            {/* 衣服選擇 */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <button onClick={()=>setGender('MALE')} className={`flex-1 p-1 text-xs rounded ${gender==='MALE'?'bg-blue-100 text-blue-700 font-bold':'bg-gray-200'}`}>男裝</button>
                <button onClick={()=>setGender('FEMALE')} className={`flex-1 p-1 text-xs rounded ${gender==='FEMALE'?'bg-pink-100 text-pink-700 font-bold':'bg-gray-200'}`}>女裝</button>
              </div>
              <div className="flex gap-2 overflow-x-auto py-1">
                {CLOTHES_DATA[gender].map(s => (
                  <img key={s.id} src={s.url} onClick={()=>setSelectedSuit(s)} className={`w-10 h-10 border-2 rounded p-1 cursor-pointer ${selectedSuit?.id===s.id?'border-blue-500':'border-transparent bg-white'}`} />
                ))}
              </div>
              {selectedSuit && (
                <div className="grid grid-cols-3 gap-1">
                  <button onClick={()=>setSuitY(suitY-0.5)} className="bg-gray-200 text-[10px] p-1 rounded">衣上</button>
                  <button onClick={()=>setSuitY(suitY+0.5)} className="bg-gray-200 text-[10px] p-1 rounded">衣下</button>
                  <button onClick={()=>setSuitScale(suitScale+0.01)} className="bg-gray-200 text-[10px] p-1 rounded">大</button>
                  <button onClick={()=>setSuitX(suitX-0.5)} className="bg-gray-200 text-[10px] p-1 rounded">衣左</button>
                  <button onClick={()=>setSuitX(suitX+0.5)} className="bg-gray-200 text-[10px] p-1 rounded">衣右</button>
                  <button onClick={()=>setSuitScale(suitScale-0.01)} className="bg-gray-200 text-[10px] p-1 rounded">小</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {photoList.length > 0 && !image && (
        <button onClick={downloadPrint} className="w-full mt-4 bg-green-600 text-white py-4 rounded-2xl font-black text-xl shadow-xl">💾 下載 4x6 拼板成品</button>
      )}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<EzIDApp />);
