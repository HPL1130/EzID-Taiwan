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
  const suitImgRef = useRef(null); // 預載入衣服圖片用

  // 繪製函數：這部分是解決移動卡頓的關鍵
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = 350, h = 450;

    // 1. 畫背景
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, w, h);

    // 2. 畫人像
    const activeImg = bgRemovedImage || image;
    if (activeImg) {
      ctx.save();
      ctx.translate(w / 2 + posX, h / 2 + posY);
      ctx.scale(scale, scale);
      ctx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
      ctx.restore();
    }

    // 3. 畫衣服 (使用 ref 確保圖片已載入)
    if (selectedSuit && suitImgRef.current && suitImgRef.current.complete) {
      ctx.save();
      ctx.translate((suitX / 100) * w, (suitY / 100) * h);
      ctx.scale(suitScale * 2.2, suitScale * 2.2);
      ctx.drawImage(suitImgRef.current, -suitImgRef.current.width / 2, -suitImgRef.current.height / 2);
      ctx.restore();
    }

    // 4. 畫輔助線
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }, [image, bgRemovedImage, scale, posX, posY, selectedBgColor, selectedSuit, suitX, suitY, suitScale]);

  // 當選擇衣服時，先載入圖片再啟動繪製
  useEffect(() => {
    if (selectedSuit) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = selectedSuit.url;
      img.onload = () => {
        suitImgRef.current = img;
        draw();
      };
    } else {
      suitImgRef.current = null;
      draw();
    }
  }, [selectedSuit, draw]);

  // 監聽位移數值，即時重繪
  useEffect(() => {
    draw();
  }, [posX, posY, scale, suitX, suitY, suitScale, selectedBgColor, draw]);

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
      // 使用最初成功的調用方式
      const blob = await imglyConfigurableBackgroundRemoval.removeBackground(uploadedFileRef.current, {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.5.3/dist/"
      });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { setBgRemovedImage(img); setIsRemovingBg(false); };
      img.src = url;
    } catch (e) {
      console.error(e);
      alert("去背失敗，請檢查網路。");
      setIsRemovingBg(false);
    }
  };

  const addToQueue = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setPhotoList(prev => [...prev, dataUrl]);
    setImage(null); setBgRemovedImage(null); setSelectedSuit(null);
  };

  // 下載邏輯與 UI 結構保持 V3.4 規格 (此處省略部分重複 UI 確保長度適中)
  // ... 請接續 V3.4 的 return 內容 ...
