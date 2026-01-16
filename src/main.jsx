const { useState, useRef, useEffect } = React;

const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 }
};

const CLOTHES_DATA = {
  MALE: [1, 2, 3, 4, 5].map(i => ({ id: `m${i}`, url: `public/clothes/suit-m${i}.png` })),
  FEMALE: [1, 2, 3, 4, 5].map(i => ({ id: `f${i}`, url: `public/clothes/suit-f${i}.png` }))
};

const EzIDApp = () => {
  const [image, setImage] = useState(null);
  const [bgRemovedImage, setBgRemovedImage] = useState(null);
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
  const uploadedFileRef = useRef(null);

  // 【核心機制】監視所有數值，數值一變，立刻重新繪製畫布
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || (!image && !bgRemovedImage)) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // 1. 繪製背景顏色
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, w, h);

    // 2. 繪製人像
    const activeImg = bgRemovedImage || image;
    if (activeImg) {
      ctx.save();
      ctx.translate(w / 2 + posX, h / 2 + posY);
      ctx.scale(scale, scale);
      ctx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
      ctx.restore();
    }

    // 3. 繪製衣服 (確保衣服隨時跟著 suitX, suitY 變動)
    if (selectedSuit) {
      const sImg = new Image();
      sImg.crossOrigin = "anonymous";
      sImg.src = selectedSuit.url;
      sImg.onload = () => {
        // 這邊再畫一次是為了確保圖片加載完畢後顯示
        ctx.save();
        ctx.translate((suitX / 100) * w, (suitY / 100) * h);
        ctx.scale(suitScale * 2.2, suitScale * 2.2);
        ctx.drawImage(sImg, -sImg.width / 2, -sImg.height / 2);
        ctx.restore();
        
        // 畫紅色頭頂線（放在最上層）
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.ellipse(w/2, h*0.45, w*0.3, h*0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
      };
    }
  }, [image, bgRemovedImage, scale, posX, posY, selectedBgColor, selectedSuit, suitX, suitY, suitScale]);

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
      // 修正：增加對 window 物件的深度掃描
      const lib = window.imglyConfigurableBackgroundRemoval || 
                  window.imglyBackgroundRemoval || 
                  (window.imgly && window.imgly.backgroundRemoval);
                  
      if (!lib) throw new Error("去背套件還在加載，請稍等 5 秒後再試。");

      const blob = await lib.removeBackground(uploadedFileRef.current, {
        publicPath: "https://unpkg.com/@imgly/background-removal-data@1.5.3/dist/"
      });
      
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { setBgRemovedImage(img); setIsRemovingBg(false); };
      img.src = url;
    } catch (e) {
      alert("去背失敗: " + e.message);
      setIsRemovingBg(false);
    }
  };

  const addToQueue = () => {
    if (!canvasRef.current) return;
    setPhotoList(prev => [...prev, canvasRef.current.toDataURL('image/png')]);
    setImage(null); setBgRemovedImage(null); setSelectedSuit(null);
  };

  return (
    <div className="max-w-xl mx-auto p-4 bg-gray-50 min-h-screen border shadow-xl">
      <header className="text-center py-4 mb-4 border-b">
        <h1 className="text-2xl font-black text-blue-900">EzID 台灣證件照</h1>
      </header>

      {/* 已加入的照片隊列 */}
      <div className="flex gap-2 overflow-x-auto mb-4 bg-white p-2 rounded shadow-inner min-h-[60px]">
        {photoList.map((img, i) => <img key={i} src={img} className="h-16 border rounded" />)}
      </div>

      {!image ? (
        <label className="block border-4 border-dashed border-blue-200 p-20 text-center rounded-3xl cursor-pointer bg-white hover:bg-blue-50 transition-colors">
          <input type="file" className="hidden" onChange={handleUpload} />
          <div className="text-5xl mb-2">📷</div>
          <p className="font-bold text-blue-600">上傳您的正面照片</p>
        </label>
      ) : (
        <div className="space-y-4">
          <div className="relative border-4 border-white shadow-lg rounded-xl overflow-hidden bg-white">
            <canvas ref={canvasRef} width={350} height={450} className="w-full h-auto" />
            {isRemovingBg && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center font-bold text-blue-600">
                AI 正在去背中... (首次執行需下載模型)
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleRemoveBg} className="bg-purple-600 text-white font-bold p-3 rounded-lg shadow">✨ 一鍵去背</button>
            <button onClick={addToQueue} className="bg-blue-600 text-white font-bold p-3 rounded-lg shadow">✅ 確認加入</button>
          </div>

          <div className="bg-white p-4 rounded-xl shadow border space-y-4">
            {/* 衣服選擇區 */}
            <div className="flex gap-2 border-b pb-4 overflow-x-auto">
              {CLOTHES_DATA[gender].map(s => (
                <img key={s.id} src={s.url} onClick={() => setSelectedSuit(s)} className={`w-14 h-14 border-2 rounded p-1 cursor-pointer ${selectedSuit?.id === s.id ? 'border-blue-600' : 'border-gray-100'}`} />
              ))}
            </div>

            {/* 控制區 */}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setSuitY(suitY - 1)} className="bg-gray-100 p-2 rounded font-bold hover:bg-blue-500 hover:text-white transition-colors">↑ 衣上</button>
              <button onClick={() => setSuitY(suitY + 1)} className="bg-gray-100 p-2 rounded font-bold hover:bg-blue-500 hover:text-white transition-colors">↓ 衣下</button>
              <button onClick={() => setSuitScale(suitScale + 0.01)} className="bg-gray-100 p-2 rounded font-bold hover:bg-blue-500 hover:text-white">＋ 大</button>
              <button onClick={() => setSuitX(suitX - 1)} className="bg-gray-100 p-2 rounded font-bold hover:bg-blue-500 hover:text-white transition-colors">← 衣左</button>
              <button onClick={() => setSuitX(suitX + 1)} className="bg-gray-100 p-2 rounded font-bold hover:bg-blue-500 hover:text-white transition-colors">→ 衣右</button>
              <button onClick={() => setSuitScale(suitScale - 0.01)} className="bg-gray-100 p-2 rounded font-bold hover:bg-blue-500 hover:text-white">－ 小</button>
            </div>
            
            <button onClick={() => setImage(null)} className="w-full text-sm text-gray-400 mt-2 italic">重新上傳</button>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<EzIDApp />);
