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
      // 使用全域 imgly 變數
      const blob = await imglyConfigurableBackgroundRemoval.removeBackground(uploadedFileRef.current, {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.5.0/dist/"
      });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { setBgRemovedImage(img); setIsRemovingBg(false); };
      img.src = url;
    } catch (e) {
      console.error(e);
      alert("去背失敗");
      setIsRemovingBg(false);
    }
  };

  const addToQueue = () => {
    if (!canvasRef.current) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 350; tempCanvas.height = 450;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(canvasRef.current, 0, 0);
    setPhotoList(prev => [...prev, tempCanvas.toDataURL('image/png')]);
    setImage(null);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-100 min-h-screen">
      <h1 className="text-center text-blue-700 font-bold text-2xl mb-4">EzID 台灣證件照</h1>
      <div className="bg-white p-6 rounded-3xl shadow-lg text-center">
        {!image ? (
          <label className="cursor-pointer block p-10 border-2 border-dashed rounded-xl">
            <input type="file" className="hidden" onChange={handleUpload} />
            點擊上傳大頭照
          </label>
        ) : (
          <div className="space-y-4">
            <canvas ref={canvasRef} width={350} height={450} className="w-full border rounded shadow-inner" />
            <div className="flex gap-2">
              <button onClick={handleRemoveBg} className="bg-purple-600 text-white p-2 rounded flex-1">
                {isRemovingBg ? "處理中..." : "一鍵去背"}
              </button>
              <button onClick={addToQueue} className="bg-blue-600 text-white p-2 rounded flex-1">加入排版</button>
            </div>
            <div className="flex flex-wrap gap-2">
               {CLOTHES_DATA[gender].map(s => (
                 <img key={s.id} src={s.url} className="w-12 h-12 border cursor-pointer" onClick={() => setSelectedSuit(s)} />
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<EzIDApp />);
