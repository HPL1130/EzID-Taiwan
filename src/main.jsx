const { useState, useRef, useEffect } = React;

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
  { id: 'white', hex: '#FFFFFF' }, { id: 'blue', hex: '#E6F3FF' }, { id: 'grey', hex: '#F5F5F5' }
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

  const renderToCanvas = (ctx, isExport = false) => {
    return new Promise((resolve) => {
      const w = 350, h = 450;
      ctx.fillStyle = selectedBgColor;
      ctx.fillRect(0, 0, w, h);
      const activeImg = bgRemovedImage || image;
      if (activeImg) {
        ctx.save();
        ctx.translate(w / 2 + posX, h / 2 + posY);
        ctx.scale(scale, scale);
        ctx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
        ctx.restore();
      }
      if (selectedSuit) {
        const sImg = new Image();
        sImg.crossOrigin = "anonymous";
        sImg.onload = () => {
          ctx.save();
          ctx.translate((suitX / 100) * w, (suitY / 100) * h);
          ctx.scale(suitScale * 2.2, suitScale * 2.2);
          ctx.drawImage(sImg, -sImg.width / 2, -sImg.height / 2);
          ctx.restore();
          if (!isExport) drawGuide(ctx);
          resolve();
        };
        sImg.src = selectedSuit.url;
      } else {
        if (!isExport) drawGuide(ctx);
        resolve();
      }
    });
  };

  const drawGuide = (ctx) => {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  };

  useEffect(() => {
    if (image && canvasRef.current) renderToCanvas(canvasRef.current.getContext('2d'), false);
  }, [image, bgRemovedImage, scale, posX, posY, selectedBgColor, selectedSuit, suitX, suitY, suitScale]);

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
      const remover = window.imglyBackgroundRemoval || window.imglyConfigurableBackgroundRemoval;
      const blob = await remover.removeBackground(uploadedFileRef.current, {
        publicPath: "https://unpkg.com/@imgly/background-removal-data@1.5.3/dist/"
      });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { setBgRemovedImage(img); setIsRemovingBg(false); };
      img.src = url;
    } catch (e) { 
      alert("去背失敗，請確認網路或嘗試重新整理。"); 
      setIsRemovingBg(false); 
    }
  };

  const addToQueue = async () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 350; tempCanvas.height = 450;
    await renderToCanvas(tempCanvas.getContext('2d'), true);
    setPhotoList(prev => [...prev, tempCanvas.toDataURL('image/png')]);
    setImage(null);
  };

  const downloadPrint = () => {
    const canvas = exportCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const paperW = mmToPx(PAPER_4X6.mmH), paperH = mmToPx(PAPER_4X6.mmW);
    canvas.width = paperW; canvas.height = paperH;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, paperW, paperH);
    const photos = Array.from({ length: currentSpec.max }, (_, i) => photoList[i % photoList.length]);
    const promises = photos.map((dataUrl, index) => {
      return new Promise((res) => {
        const img = new Image();
        img.onload = () => {
          let x, y, w, h;
          if (currentSpec.id === 'MIXED') {
            const is2 = index < 4; w = mmToPx(is2 ? 35 : 28); h = mmToPx(is2 ? 45 : 35);
            x = (index % 4) * (paperW / 4) + (paperW / 4 - w) / 2;
            y = is2 ? (paperH / 4 - h / 2) : (paperH * 0.75 - h / 2);
          } else {
            w = mmToPx(currentSpec.mmW); h = mmToPx(currentSpec.mmH);
            x = (index % currentSpec.cols) * (paperW / currentSpec.cols) + (paperW / currentSpec.cols - w) / 2;
            y = Math.floor(index / currentSpec.cols) * (paperH / currentSpec.rows) + (paperH / currentSpec.rows - h) / 2;
          }
          ctx.drawImage(img, x, y, w, h); res();
        };
        img.src = dataUrl;
      });
    });
    Promise.all(promises).then(() => {
      const link = document.createElement('a');
      link.download = `EzID_Print.jpg`; link.href = canvas.toDataURL('image/jpeg', 0.95); link.click();
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-gray-100 min-h-screen font-sans">
      <header className="text-center mb-6"><h1 className="text-blue-700 font-black text-3xl tracking-tighter">EzID 台灣證件照</h1></header>
      
      {/* 規格選擇 - 在手機上會自動橫向捲動 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => {setCurrentSpec(s); setPhotoList([]);}} className={`whitespace-nowrap px-4 py-3 text-sm font-bold rounded-2xl transition-all shadow-sm ${currentSpec.id === s.id ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>{s.label}</button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto mb-6 bg-white p-4 rounded-3xl border shadow-inner min-h-[80px]">
        {photoList.map((img, i) => (<img key={i} src={img} className="h-16 w-12 rounded-lg border-2 border-gray-100 shadow-sm flex-shrink-0" />))}
        {photoList.length === 0 && <div className="text-gray-300 w-full text-center py-4 font-medium italic">尚未加入照片...</div>}
      </div>

      {!image ? (
        <label className="block border-4 border-dashed border-gray-300 rounded-[3rem] p-16 text-center cursor-pointer bg-white hover:border-blue-400 hover:bg-blue-50 transition-all group">
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
          <span className="text-7xl block mb-4 group-hover:scale-110 transition-transform">📸</span>
          <span className="font-black text-gray-500 text-xl">點擊上傳或拍照</span>
        </label>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-[3rem] shadow-2xl border">
          {/* 左側：預覽區 */}
          <div className="space-y-4">
            <div className="relative w-full aspect-[35/45] rounded-[2rem] overflow-hidden bg-white border-8 border-gray-50 shadow-inner">
              <canvas ref={canvasRef} width={350} height={450} className="w-full h-full" />
              {isRemovingBg && (
                <div className="absolute inset-0 bg-blue-600/90 flex flex-col items-center justify-center text-white px-6 text-center">
                  <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                  <span className="font-black text-lg">AI 正在努力去背...</span>
                  <span className="text-xs mt-2 opacity-80">初次使用需載入模型，請稍候</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleRemoveBg} className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all text-lg">✨ 一鍵去背</button>
              <button onClick={addToQueue} className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all text-lg">✅ 確認加入</button>
            </div>
          </div>

          {/* 右側：控制區 */}
          <div className="space-y-6">
            <div className="space-y-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
              <div className="flex justify-between items-center">
                <span className="font-black text-gray-700">背景顏色</span>
                <div className="flex gap-3">
                  {BACKGROUND_COLORS.map(c => <button key={c.id} onClick={() => setSelectedBgColor(c.hex)} className={`w-10 h-10 rounded-full border-4 ${selectedBgColor === c.hex ? 'border-blue-600 scale-110 shadow-md' : 'border-white'}`} style={{backgroundColor: c.hex}} />)}
                </div>
              </div>

              <div className="space-y-3">
                <span className="font-black text-gray-700 block">人像微調</span>
                <div className="grid grid-cols-4 gap-2">
                  {['上','下','左','右'].map((d,i) => (
                    <button key={d} onClick={() => {
                      if(i===0) setPosY(posY-4); if(i===1) setPosY(posY+4);
                      if(i===2) setPosX(posX-4); if(i===3) setPosX(posX+4);
                    }} className="bg-white border-2 border-gray-200 p-3 rounded-xl font-bold text-gray-600 active:bg-blue-600 active:text-white transition-colors"> {d} </button>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-400">縮放</span>
                  <input type="range" min="0.2" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="flex-1 h-3 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <button onClick={()=>setGender('MALE')} className={`flex-1 p-3 rounded-xl font-black transition-all ${gender==='MALE'?'bg-blue-600 text-white shadow-md':'bg-gray-200 text-gray-400'}`}>男西裝</button>
                  <button onClick={()=>setGender('FEMALE')} className={`flex-1 p-3 rounded-xl font-black transition-all ${gender==='FEMALE'?'bg-pink-500 text-white shadow-md':'bg-gray-200 text-gray-400'}`}>女套裝</button>
                </div>
                <div className="flex gap-3 overflow-x-auto py-2 scrollbar-hide">
                  <button onClick={()=>setSelectedSuit(null)} className="w-14 h-14 border-4 border-dashed rounded-xl flex-shrink-0 font-bold text-gray-300">原本</button>
                  {CLOTHES_DATA[gender].map(s => (
                    <img key={s.id} src={s.url} onClick={()=>setSelectedSuit(s)} className={`w-14 h-14 border-4 rounded-xl p-1 cursor-pointer transition-all ${selectedSuit?.id===s.id?'border-blue-600 bg-blue-50 scale-105':'border-transparent bg-white shadow-sm'}`} />
                  ))}
                </div>
                {selectedSuit && (
                  <div className="grid grid-cols-3 gap-2 animate-in slide-in-from-top-2">
                    {['衣上','衣下','衣服大','衣左','衣右','衣服小'].map((t,i) => (
                      <button key={t} onClick={() => {
                        if(i===0) setSuitY(suitY-0.5); if(i===1) setSuitY(suitY+0.5);
                        if(i===2) setSuitScale(suitScale+0.01); if(i===3) setSuitX(suitX-0.5);
                        if(i===4) setSuitX(suitX+0.5); if(i===5) setSuitScale(suitScale-0.01);
                      }} className="bg-white border-2 border-blue-100 p-2 rounded-xl text-xs font-black text-blue-600 active:bg-blue-600 active:text-white transition-all">{t}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={()=>setImage(null)} className="w-full p-4 text-gray-400 font-bold hover:text-red-500 transition-colors">取消並重新上傳</button>
          </div>
        </div>
      )}

      {photoList.length > 0 && !image && (
        <button onClick={downloadPrint} className="w-full mt-8 bg-gradient-to-r from-green-500 to-green-600 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
          <span>💾 下載 4x6 拼板成品</span>
        </button>
      )}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<EzIDApp />);
