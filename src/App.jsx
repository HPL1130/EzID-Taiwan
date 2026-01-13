import React, { useState, useRef, useEffect, useCallback } from 'react';
import imglyRemoveBackground from "@imgly/background-removal";

const SPECS = {
  TWO_INCH: { 
    id: '2inch', label: '2 吋大頭照', subLabel: '護照、身分證', mmW: 35, mmH: 45, cols: 2, rows: 4, total: 8,
    guideColor: 'rgba(255, 59, 48, 0.7)',
    faceRatio: { top: 0.1, bottom: 0.85, ellipseW: 0.3, ellipseH: 0.38 }
  },
  ONE_INCH: { 
    id: '1inch', label: '1 吋照片', subLabel: '一般證照、履歷', mmW: 28, mmH: 35, cols: 3, rows: 4, total: 12,
    guideColor: 'rgba(0, 122, 255, 0.7)',
    faceRatio: { top: 0.15, bottom: 0.8, ellipseW: 0.28, ellipseH: 0.35 }
  },
  MIXED_4_4: { 
    id: 'mixed', label: '4+4 混合排版', subLabel: '2吋x4 + 1吋x4', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 },
    guideColor: 'rgba(100, 100, 100, 0.7)',
    faceRatio: { top: 0.12, bottom: 0.82, ellipseW: 0.29, ellipseH: 0.36 }
  }
};

const PAPER_4X6 = { mmW: 101.6, mmH: 152.4 };
const mmToPx = (mm) => Math.round((mm * 300) / 25.4);
const BACKGROUND_COLORS = [
  { id: 'white', label: '白色', hex: '#FFFFFF' },
  { id: 'lightgray', label: '淺灰', hex: '#F0F0F0' },
  { id: 'blue', label: '藍色', hex: '#ADD8E6' }
];

const EzIDApp = () => {
  const [image, setImage] = useState(null);
  const [bgRemovedImage, setBgRemovedImage] = useState(null);
  const [currentSpec, setCurrentSpec] = useState(SPECS.TWO_INCH);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBgColor, setSelectedBgColor] = useState('#FFFFFF');
  const [isRemovingBg, setIsRemovingBg] = useState(false);

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
        img.onload = () => { setImage(img); setBgRemovedImage(null); setScale(0.5); setOffset({ x: 0, y: 0 }); };
        img.src = f.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBackground = useCallback(async () => {
    if (!uploadedFileRef.current) return;
    setIsRemovingBg(true);
    try {
      const blob = await imglyRemoveBackground(uploadedFileRef.current);
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { setBgRemovedImage(img); setIsRemovingBg(false); URL.revokeObjectURL(url); };
      img.src = url;
    } catch (e) { alert("去背失敗"); setIsRemovingBg(false); }
  }, []);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const { width, height } = canvasRef.current;
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, width, height);
    const displayImage = bgRemovedImage || image;
    ctx.save();
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(displayImage, -displayImage.width / 2, -displayImage.height / 2);
    ctx.restore();
    const { guideColor, faceRatio } = currentSpec.id === 'mixed' ? SPECS.TWO_INCH : currentSpec;
    ctx.strokeStyle = guideColor; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.ellipse(width/2, height*0.45, width*faceRatio.ellipseW, height*faceRatio.ellipseH, 0, 0, Math.PI*2); ctx.stroke();
  }, [image, bgRemovedImage, scale, offset, currentSpec, selectedBgColor]);

  const generateIbonPrint = () => {
    setIsProcessing(true);
    const canvas = exportCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const paperW = mmToPx(PAPER_4X6.mmW);
    const paperH = mmToPx(PAPER_4X6.mmH);
    canvas.width = paperW; canvas.height = paperH;
    ctx.fillStyle = selectedBgColor; ctx.fillRect(0, 0, paperW, paperH);

    const drawPhoto = (spec, x, y) => {
      const w = mmToPx(spec.mmW); const h = mmToPx(spec.mmH);
      ctx.save();
      ctx.translate(x + w/2 + (offset.x * (w/350)), y + h/2 + (offset.y * (h/450)));
      ctx.scale(scale * (w/350), scale * (h/450));
      ctx.drawImage(bgRemovedImage || image, -(bgRemovedImage || image).width/2, -(bgRemovedImage || image).height/2);
      ctx.restore();
      ctx.strokeStyle = '#EEE'; ctx.strokeRect(x, y, w, h);
    };

    if (currentSpec.id === 'mixed') {
      for (let j=0; j<4; j++) drawPhoto(SPECS.TWO_INCH, 50, 50 + j * mmToPx(48));
      for (let j=0; j<4; j++) drawPhoto(SPECS.ONE_INCH, paperW - mmToPx(28) - 50, 50 + j * mmToPx(38));
    } else {
      const w = mmToPx(currentSpec.mmW); const h = mmToPx(currentSpec.mmH);
      for (let i=0; i<currentSpec.cols; i++) for (let j=0; j<currentSpec.rows; j++) 
        drawPhoto(currentSpec, 50 + i * (w+20), 50 + j * (h+20));
    }
    const link = document.createElement('a'); link.download = 'ezid.jpg'; link.href = canvas.toDataURL('image/jpeg'); link.click();
    setIsProcessing(false);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">EzID 台灣證件照</h1>
      <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => setCurrentSpec(s)} className={`flex-1 py-2 rounded ${currentSpec.id === s.id ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>{s.label}</button>
        ))}
      </div>
      {!image ? (
        <label className="block border-2 border-dashed p-10 text-center cursor-pointer">
          <input type="file" className="hidden" onChange={handleUpload} /> 點此選取照片
        </label>
      ) : (
        <div className="space-y-4">
          <canvas ref={canvasRef} width={350} height={450} className="w-full border shadow-lg mx-auto" />
          <div className="flex justify-center gap-4">
            {BACKGROUND_COLORS.map(c => <button key={c.id} onClick={() => setSelectedBgColor(c.hex)} className="w-8 h-8 rounded-full border" style={{backgroundColor: c.hex}} />)}
          </div>
          <input type="range" min="0.1" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full" />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={removeBackground} className="bg-purple-600 text-white py-3 rounded-xl font-bold">{isRemovingBg ? '處理中...' : '一鍵去背'}</button>
            <button onClick={generateIbonPrint} className="bg-blue-600 text-white py-3 rounded-xl font-bold">下載拼板</button>
          </div>
          <button onClick={() => setImage(null)} className="w-full text-gray-400">重新選取</button>
        </div>
      )}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

export default EzIDApp; // 👈 確保有這一行
