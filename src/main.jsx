const { useState, useRef, useEffect, useCallback } = React;

const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
};

const CLOTHES_DATA = {
  MALE: [1, 2, 3, 4, 5].map(i => ({ id: `m${i}`, url: `public/clothes/suit-m${i}.png` })),
  FEMALE: [1, 2, 3, 4, 5].map(i => ({ id: `f${i}`, url: `public/clothes/suit-f${i}.png` }))
};

const BACKGROUND_COLORS = [{ id: 'w', hex: '#FFFFFF' }, { id: 'b', hex: '#E6F3FF' }, { id: 'g', hex: '#F5F5F5' }];
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
  const suitImgRef = useRef(null);

  // 核心繪製函數
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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

    if (selectedSuit && suitImgRef.current && suitImgRef.current.complete) {
      ctx.save();
      ctx.translate((suitX / 100) * w, (suitY / 100) * h);
      ctx.scale(suitScale * 2.2, suitScale * 2.2);
      ctx.drawImage(suitImgRef.current, -suitImgRef.current.width / 2, -suitImgRef.current.height / 2);
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }, [image, bgRemovedImage, scale, posX, posY, selectedBgColor, selectedSuit, suitX, suitY, suitScale]);

  useEffect(() => {
    if (selectedSuit) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = selectedSuit.url;
      img.onload = () => { suitImgRef.current = img; draw(); };
    } else {
      suitImgRef.current = null;
      draw();
    }
  }, [selectedSuit, draw]);

  useEffect(() => { draw(); }, [posX, posY, scale, suitX, suitY, suitScale, selectedBgColor, draw]);

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
      // 自動偵測去背套件的名字，解決 ReferenceError
      const remover = window.imglyConfigurableBackgroundRemoval || window.imglyBackgroundRemoval;
      
      if (!remover) {
        throw new Error("找不到去背組件，請檢查 index.html 是否正確載入 bundle.js");
      }

      const blob = await remover.removeBackground(uploadedFileRef.current, {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.5.3/dist/"
      });
      
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { 
        setBgRemovedImage(img); 
        setIsRemovingBg(false); 
      };
      img.src = url;
    } catch (e) {
      console.error("去背報錯詳情:", e);
      alert("去背失敗: " + e.message);
      setIsRemovingBg(false);
    }
  };

  const addToQueue = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setPhotoList(prev => [...prev, dataUrl]);
    setImage(null); setBgRemovedImage(null); setSelectedSuit(null);
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
    <div className="max-w-2xl mx-auto p-4 bg-gray-100 min-h-screen font-sans">
      <header className="text-center mb-6"><h1 className="text-blue-700 font-black text-3xl">EzID 台灣證件照</h1></header>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => {setCurrentSpec(s); setPhotoList([]);}} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${currentSpec.id === s.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-500'}`}>{s.label}</button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto mb-6 bg-white p-4 rounded-2xl border shadow-inner min-h-[80px]">
        {photoList.map((img, i) => (<img key={i} src={img} className="h-16 w-12 rounded border-2 border-white shadow-md flex-shrink-0" />))}
      </div>
      {!image ? (
        <label className="block border-4 border-dashed border-gray-300 rounded-[2rem] p-16 text-center cursor-pointer bg-white group hover:border-blue-400">
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
          <span className="text-6xl block mb-4 group-hover:scale-110 transition-transform">📸</span>
          <span className="font-bold text-gray-500 text-lg">點擊上傳或拍照</span>
        </label>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-[2rem] shadow-2xl">
          <div className="space-y-4">
            <div className="relative w-full aspect-[35/45] rounded-xl overflow-hidden bg-white border">
              <canvas ref={canvasRef} width={350} height={450} className="w-full h-full" />
              {isRemovingBg && <div className="absolute inset-0 bg-blue-600/80 flex items-center justify-center font-bold text-white">AI 去背中...</div>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleRemoveBg} className="bg-purple-600 text-white p-4 rounded-xl font-bold shadow-md">✨ 一鍵去背</button>
              <button onClick={addToQueue} className="bg-blue-600 text-white p-4 rounded-xl font-bold shadow-md">✅ 確認加入</button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 p-6 rounded-2xl space-y-6">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-600">背景顏色</span>
                <div className="flex gap-3">
                  {BACKGROUND_COLORS.map(c => <button key={c.id} onClick={() => setSelectedBgColor(c.hex)} className={`w-8 h-8 rounded-full border-4 ${selectedBgColor === c.hex ? 'border-blue-500 scale-110' : 'border-white'}`} style={{backgroundColor: c.hex}} />)}
                </div>
              </div>
              <div className="space-y-4">
                <span className="font-bold text-gray-600 block">人像微調</span>
                <div className="grid grid-cols-4 gap-2">
                  {['上','下','左','右'].map((d,i) => (
                    <button key={d} onClick={() => {
                      if(i===0) setPosY(posY-5); if(i===1) setPosY(posY+5);
                      if(i===2) setPosX(posX-5); if(i===3) setPosX(posX+5);
                    }} className="bg-white border-2 p-3 rounded-xl font-bold text-gray-500 active:bg-blue-600 active:text-white transition-all"> {d} </button>
                  ))}
                </div>
                <input type="range" min="0.2" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
              <div className="space-y-4 border-t pt-4">
                <div className="flex gap-2">
                  <button onClick={()=>setGender('MALE')} className={`flex-1 p-2 rounded-lg font-bold ${gender==='MALE'?'bg-blue-600 text-white shadow-md':'bg-gray-200 text-gray-400'}`}>男裝</button>
                  <button onClick={()=>setGender('FEMALE')} className={`flex-1 p-2 rounded-lg font-bold ${gender==='FEMALE'?'bg-pink-500 text-white shadow-md':'bg-gray-200 text-gray-400'}`}>女裝</button>
                </div>
                <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                  <button onClick={()=>setSelectedSuit(null)} className="w-14 h-14 border-2 border-dashed rounded-xl flex-shrink-0 text-xs text-gray-400">原本</button>
                  {CLOTHES_DATA[gender].map(s => (
                    <img key={s.id} src={s.url} onClick={()=>setSelectedSuit(s)} className={`w-14 h-14 border-4 rounded-xl p-1 cursor-pointer transition-all ${selectedSuit?.id===s.id?'border-blue-600 bg-blue-50 shadow-md':'border-transparent bg-white shadow-sm'}`} />
                  ))}
                </div>
                {selectedSuit && (
                  <div className="grid grid-cols-3 gap-2">
                    {['衣上','衣下','衣服大','衣左','衣右','衣服小'].map((t,i) => (
                      <button key={t} onClick={() => {
                        if(i===0) setSuitY(suitY-1); if(i===1) setSuitY(suitY+1);
                        if(i===2) setSuitScale(suitScale+0.02); if(i===3) setSuitX(suitX-1);
                        if(i===4) setSuitX(suitX+1); if(i===5) setSuitScale(suitScale-0.02);
                      }} className="bg-white border-2 border-blue-100 p-2 rounded-xl text-xs font-bold text-blue-600 active:bg-blue-600 active:text-white transition-all">{t}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={()=>setImage(null)} className="w-full text-gray-400 font-bold py-2 hover:text-red-500 transition-colors">重新上傳</button>
          </div>
        </div>
      )}
      {photoList.length > 0 && !image && (
        <button onClick={downloadPrint} className="w-full mt-8 bg-green-600 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl active:scale-95 transition-all">💾 下載 4x6 拼板成品</button>
      )}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<EzIDApp />);
