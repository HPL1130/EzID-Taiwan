import React, { useState, useRef, useEffect, useCallback } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

const SPECS = {
  TWO_INCH: { 
    id: '2inch', label: '2 吋 (8張)', subLabel: '橫式排版', mmW: 35, mmH: 45,
    guideColor: 'rgba(255, 59, 48, 0.7)',
    faceRatio: { top: 0.1, bottom: 0.85, ellipseW: 0.3, ellipseH: 0.38 }
  },
  ONE_INCH: { 
    id: '1inch', label: '1 吋 (10張)', subLabel: '橫式排版', mmW: 28, mmH: 35,
    guideColor: 'rgba(0, 122, 255, 0.7)',
    faceRatio: { top: 0.15, bottom: 0.8, ellipseW: 0.28, ellipseH: 0.35 }
  },
  MIXED_4_4: { 
    id: 'mixed', label: '4+4 混合', subLabel: '2吋x4 + 1吋x4', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 },
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

  const handleRemoveBackground = useCallback(async () => {
    if (!uploadedFileRef.current) return;
    setIsRemovingBg(true);
    try {
      const blob = await removeBackground(uploadedFileRef.current);
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { setBgRemovedImage(img); setIsRemovingBg(false); URL.revokeObjectURL(url); };
      img.src = url;
    } catch (e) { console.error(e); alert("去背失敗"); setIsRemovingBg(false); }
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
    ctx.strokeStyle = guideColor; ctx.setLineDash([6, 4]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(width/2, height*0.45, width*faceRatio.ellipseW, height*faceRatio.ellipseH, 0, 0, Math.PI*2); ctx.stroke();
  }, [image, bgRemovedImage, scale, offset, currentSpec, selectedBgColor]);

  const generateIbonPrint = () => {
    setIsProcessing(true);
    const canvas = exportCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const paperW = mmToPx(PAPER_4X6.mmH); // 橫式
    const paperH = mmToPx(PAPER_4X6.mmW);
    canvas.width = paperW; canvas.height = paperH;
    ctx.fillStyle = selectedBgColor; ctx.fillRect(0, 0, paperW, paperH);

    const drawPhoto = (spec, x, y) => {
      const w = mmToPx(spec.mmW); const h = mmToPx(spec.mmH);
      const activeImg = bgRemovedImage || image;
      ctx.save();
      ctx.translate(x + w/2 + (offset.x * (w/350)), y + h/2 + (offset.y * (h/450)));
      ctx.scale(scale * (w/350), scale * (h/450));
      ctx.drawImage(activeImg, -activeImg.width/2, -activeImg.height/2);
      ctx.restore();
      ctx.strokeStyle = '#CCC'; ctx.setLineDash([]); ctx.strokeRect(x, y, w, h);
    };

    if (currentSpec.id === 'mixed') {
      const w2 = mmToPx(35); const h2 = mmToPx(45);
      const w1 = mmToPx(28); const h1 = mmToPx(35);
      for (let i=0; i<4; i++) drawPhoto(SPECS.TWO_INCH, 150 + i * (w2+20), 80);
      for (let i=0; i<4; i++) drawPhoto(SPECS.ONE_INCH, 150 + i * (w1+30), 80 + h2 + 80);
    } else if (currentSpec.id === '2inch') {
      const w = mmToPx(35); const h = mmToPx(45);
      const gX = (paperW - w*4)/5; const gY = (paperH - h*2)/3;
      for (let i=0; i<4; i++) for (let j=0; j<2; j++) drawPhoto(currentSpec, gX+i*(w+gX), gY+j*(h+gY));
    } else if (currentSpec.id === '1inch') {
      const w = mmToPx(28); const h = mmToPx(35);
      const gX = (paperW - w*5)/6; const gY = (paperH - h*2)/3;
      for (let i=0; i<5; i++) for (let j=0; j<2; j++) drawPhoto(currentSpec, gX+i*(w+gX), gY+j*(h+gY));
    }
    const link = document.createElement('a'); link.download = `EzID_橫式_${currentSpec.id}.jpg`; link.href = canvas.toDataURL('image/jpeg', 0.95); link.click();
    setIsProcessing(false);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white min-h-screen font-sans">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">EzID 橫式排版版</h1>
        <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded">V1.4</span>
      </div>
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        {Object.values(SPECS).map(s => (
          <button key={s.id} onClick={() => setCurrentSpec(s)} className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${currentSpec.id === s.id ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>{s.label}</button>
        ))}
      </div>
      {!image ? (
        <label className="block border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center cursor-pointer"><input type="file" className="hidden" accept="image/*" onChange={handleUpload} /><p className="text-gray-500">點擊上傳照片</p></label>
      ) : (
        <div className="space-y-6">
          <div className="relative"><canvas ref={canvasRef} width={350} height={450} className="w-full border-4 border-white shadow-2xl rounded-lg mx-auto bg-gray-50" />{isRemovingBg && <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center font-bold text-blue-600">AI 去背中...</div>}</div>
          <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
            <div className="flex justify-center gap-3">{BACKGROUND_COLORS.map(c => <button key={c.id} onClick={() => setSelectedBgColor(c.hex)} className={`w-8 h-8 rounded-full border-2 ${selectedBgColor === c.hex ? 'border-blue-600 scale-110' : 'border-white'}`} style={{backgroundColor: c.hex}} />)}</div>
            <input type="range" min="0.1" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg accent-blue-600" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setOffset(o => ({...o, y: o.y-10}))} className="bg-white border py-2 rounded-lg text-sm">↑ 上移</button>
              <button onClick={() => setOffset(o => ({...o, y: o.y+10}))} className="bg-white border py-2 rounded-lg text-sm">↓ 下移</button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button onClick={handleRemoveBackground} disabled={isRemovingBg} className="bg-purple-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50">一鍵 AI 去背</button>
            <button onClick={generateIbonPrint} disabled={isProcessing || isRemovingBg} className="bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg">下載 4x6 橫式拼板</button>
          </div>
        </div>
      )}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

export default EzIDApp;
