const { useState, useRef, useEffect } = React;

// 數據定義保持不變
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

  // 繪製核心：確保衣服跟隨數值即時更新
  const drawAll = (ctx, isExport = false) => {
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
        sImg.src = selectedSuit.url;
        sImg.onload = () => {
          ctx.save();
          ctx.translate((suitX / 100) * w, (suitY / 100) * h);
          ctx.scale(suitScale * 2.2, suitScale * 2.2);
          ctx.drawImage(sImg, -sImg.width / 2, -sImg.height / 2);
          ctx.restore();
          if (!isExport) drawGuide(ctx);
          resolve();
        };
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

  // 監聽所有數值，只要一變就重畫
  useEffect(() => {
    if (image && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      drawAll(ctx, false);
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
      const remover = window.imglyBackgroundRemoval;
      const blob = await remover.removeBackground(uploadedFileRef.current, {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.5.3/dist/"
      });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { setBgRemovedImage(img); setIsRemovingBg(false); };
      img.src = url;
    } catch (e) {
      console.error(e);
      alert("去背模組載入失敗。請確認是否按過 Ctrl+F5，或網路是否穩定。");
      setIsRemovingBg(false);
    }
  };

  const addToQueue = async () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 350; tempCanvas.height = 450;
    await drawAll(tempCanvas.getContext('2d'), true);
    setPhotoList(prev => [...prev, tempCanvas.toDataURL('image/png')]);
    setImage(null); setBgRemovedImage(null); setSelectedSuit(null);
  };

  // 下載邏輯保持不變 ... (其餘 UI 代碼省略，請使用之前的 V3.4 完整佈局)
  // 記得在 return 之前補上 downloadPrint 函數與 render 結構
