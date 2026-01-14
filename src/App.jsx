import React, { useState, useRef, useEffect } from 'react';
// 注意：環境中需已安裝 @imgly/background-removal
import { removeBackground } from "@imgly/background-removal"; 

// --- 1. 規格定義 ---
const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
};

// --- 2. 內嵌透明服飾數據 (V2.7 修正版) ---
const CLOTHES_DATA = {
  MALE: [
    { id: 'm1', label: '黑西裝', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAL8SURBVHhe7d0xTsNAEEDRshInoOQA9DQUuP85p6HkAAnReAtI9mYnS7L/S6SgpXm79mY2S9u2LQC8u9vdfv86vX8fXm7fDvfHh+P9A8D7uX8/fPr++Xh+vD+eLp/7A8D7uX0/fO6f3u/vh/P98Hh6eX16fO4PAO/n9v3wuX96v78fzre3t+Pj7f3++vT+8vbxXQEAnun2/fC5f3p/vB7O9/f34+X94/769O399fP8A8D7uX0/fO6f3h+vh/P9/f14fXp9en95/fS5PwD8mPv3w+f+6f3xeji/vb0dr0+vT+8vb0+f+wPAj7l/P3zun94fr4fzzc3NeH16fXp/eXv++Pk/APyY+/fD5/7p/fF6OH97ezte396e3l/enp77A8CPuX8/fO6f3h+vh/Pt7e14fXt7en95fXp/7g8AP+b+/fC5f3p/vB7ONzc34/Xp9en95fXz8/8A8D7uX0/fO6f3h+vh/nm5ma8Pr0+vb+8Pn9+AHg/t++Hz/3T++P1cL65uRmvT69P7y+vn58fAN7P7fvhc//0/ng9nO/v78fr0+vT+8vr5+cHgPdz+3743D+9P14P57u7u/H69Pr0/vL66fN3AIAn9++Hz/3T++P1cL6/vx+vT69P7y+vn58fAH7M/fvhc//0/ng9nO/v78fr0+vT+8vr0+vT5/4A8GPu3w+f+6f3x+vhfHt7O16fXp/eX96f3p87AIAn9++Hz/3T++P1cL6/vx+vT69P7y+vn5+fAyA8f57+9fB6f3x+vhfH9/P16fXp/eX14/Pz8A/Jj798Pn/un98Xo439zcjNen16f3l9fPzw8AP+b+/fC5f3p/vB7ONzc34/Xp9en95fXz8wPAj7l/P3zun94fr4fzzc3NeH16fXp/ef38/ADwY+7fD5/7p/fH6+F8c3MzXp9en95fXj8/PwD8mPv3w+f+6f3xejjf3NyM16fXp/eX18/PDwA/5v798Pn/un98Xo439zcjNen16f3l9fPzw8AP+b+/fC5f3p/vB7ONzc34/Xp9en95fXz8wPAj7l/P3zun94fr4fzzc3NeH16fXp/ef38/ADwY+7fD5/7p/fH6+F8c3MzXp9en95fXj8/PwD8mPv3w+f+6f3xejjf3NyM16fXp/eX18/PDwA/5v798Pn/un98Xo439zcjNen16f3l9fPzw8AgKf7AyY6WAsYVax2AAAAAElFTkSuQmCC' },
  ],
  FEMALE: [
    { id: 'f1', label: '套裝', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAMdSURBVHhe7d0hTsNAFAbRshInoOQA9DQUuP85p6HkAAnReAtI9mYnS7L/S6SgpXm79mY2S9u2LQC8u9vdfv86vX8fXm7fDvfHh+P9A8D7uX8/fPr++Xh+vD+eLp/7A8D7uX0/fO6f3u/vh/P98Hh6eX16fO4PAO/n9v3wuX96v78fzre3t+Pj7f3++vT+8vbxXQEAnun2/fC5f3p/vB7O9/f34+X94/769O399fP8A8D7uX0/fO6f3h+vh/P9/f14fXp9en95/fS5PwD8mPv3w+f+6f3xeji/vb0dr0+vT+8vb0+f+wPAj7l/P3zun94fr4fzzc3NeH16fXp/eXv++Pk/APyY+/fD5/7p/fF6OH97ezte396e3l/enp77A8CPuX8/fO6f3h+vh/Pt7e14fXt7en95fXp/7g8AP+b+/fC5f3p/vB7ONzc34/Xp9en95fXz8/8A8D7uX0/fO6f3h+vh/nm5ma8Pr0+vb+8Pn9+AHg/t++Hz/3T++P1cL65uRmvT69P7y+vn58fAN7P7fvhc//0/ng9nG9ubsbr0+vT+8vr5+cHgPdz+3743D+9P14P57u7u/H69Pr0/vL66fN3AIAn9++Hz/3T++P1cL6/vx+vT69P7y+vn58fAH7M/fvhc//0/ng9nO/v78fr0+vT+8vr0+vT5/4A8GPu3w+f+6f3x+vhfHt7O16fXp/eX18/PDwA/5v798Pn/un98Xo439zcjNen16f3l9fPzw8AP+b+/fC5f3p/vB7ONzc34/Xp9en95fXz8wPAj7l/P3zun94fr4fzzc3NeH16fXp/ef38/ADwY+7fD5/7p/fH6+F8c3MzXp9en95fXj8/PwD8mPv3w+f+6f3xejjf3NyM16fXp/eX18/PDwA/5v798Pn/un98Xo439zcjNen16f3l9fPzw8AP+b+/fC5f3p/vB7ONzc34/Xp9en95fXz8wPAj7l/P3zun94fr4fzzc3NeH16fXp/ef38/ADwY+7fD5/7p/fH6+F8c3MzXp9en95fXj8/PwD8mPv3w+f+6f3xejjf3NyM16fXp/eX18/PDwA/5v798Pn/un98Xo439zcjNen16f3l9fPzw8AgKf7AyY6WAsYVax2AAAAAElFTkSuQmCC' }
  ]
};

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

  // --- 繪製邏輯 ---
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    
    // 清除並畫背景
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, 350, 450);

    const activeImg = bgRemovedImage || image;
    
    // 畫人像
    ctx.save();
    ctx.translate(175 + offset.x, 225 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
    ctx.restore();

    // 畫輔助線
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [image, bgRemovedImage, scale, offset, selectedBgColor]);

  // --- 動作處理 ---
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
    } catch (e) { 
      alert("去背失敗"); 
      setIsRemovingBg(false); 
    }
  };

  const addToQueue = () => {
    if (!canvasRef.current) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 350; tempCanvas.height = 450;
    const tCtx = tempCanvas.getContext('2d');
    
    // 1. 畫當前畫布內容 (背景+人像)
    tCtx.drawImage(canvasRef.current, 0, 0);

    // 2. 如果有衣服，疊加衣服
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
    if (!canvas || photoList.length === 0) return;
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
            const is2 = index < 4; 
            w = mmToPx(is2 ? 35 : 28); 
            h = mmToPx(is2 ? 45 : 35);
            x = (index % 4) * (paperW / 4) + (paperW / 4 - w) / 2;
            y = is2 ? (paperH / 4 - h / 2) : (paperH * 0.75 - h / 2);
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
      <h1 className="text-center font-black text-blue-600 text-xl mb-4">EzID 台灣證件照 V2.7</h1>
      
      {/* 規格選擇 */}
      <div className="flex gap-1 mb-4 bg-gray-200 p-1 rounded-xl">
        {Object.values(SPECS).map(s => (
          <button 
            key={s.id} 
            onClick={() => {setCurrentSpec(s); setPhotoList([]);}} 
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg ${currentSpec.id === s.id ? 'bg-white text-blue-600' : 'text-gray-500'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 已加入的清單 */}
      <div className="flex gap-2 overflow-x-auto mb-4 bg-white p-3 rounded-2xl border min-h-[60px]">
        {photoList.length === 0 && <span className="text-gray-400 text-xs m-auto">尚未加入照片</span>}
        {photoList.map((img, i) => (
          <img key={i} src={img} alt="" className="h-12 w-9 rounded border object-cover shadow-sm" />
        ))}
      </div>

      {!image ? (
        <div className="space-y-4">
          <label className="block border-2 border-dashed border-gray-300 rounded-[2.5rem] p-16 text-center cursor-pointer bg-white hover:bg-gray-50 transition">
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            <span className="text-3xl block mb-2">📸</span>
            <span className="font-bold text-gray-500">點擊上傳照片</span>
          </label>
          
          {photoList.length > 0 && (
            <button onClick={downloadPrint} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg">
              下載 4x6 拼板
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white p-4 rounded-[2.5rem] shadow-xl border space-y-4">
          <div className="relative w-full aspect-[35/45] rounded-2xl overflow-hidden bg-gray-100">
            <canvas ref={canvasRef} width={350} height={450} className="w-full h-full" />
            {selectedSuit && (
              <img src={selectedSuit.url} alt="" className="absolute pointer-events-none" style={{
                left: '50%', top: `${suitConfig.y}%`, transform: `translate(-50%, -50%) scale(${suitConfig.scale * 2.2})`, width: '100%'
              }} />
            )}
            {isRemovingBg && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">
                去背處理中...
              </div>
            )}
          </div>

          <div className="space-y-3 bg-gray-50 p-4 rounded-2xl">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {['#FFFFFF', '#E6F3FF', '#F5F5F5'].map(color => (
                  <button 
                    key={color} 
                    onClick={() => setSelectedBgColor(color)} 
                    className={`w-6 h-6 rounded-full border-2 ${selectedBgColor === color ? 'border-blue-500' : 'border-white'}`} 
                    style={{backgroundColor: color}} 
                  />
                ))}
              </div>
              <button onClick={handleRemoveBg} className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold">一鍵去背</button>
            </div>

            <div className="border-t pt-3">
              <div className="flex gap-2 mb-2">
                <button onClick={() => setGender('MALE')} className={`flex-1 py-1 rounded ${gender === 'MALE' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>男西裝</button>
                <button onClick={() => setGender('FEMALE')} className={`flex-1 py-1 rounded ${gender === 'FEMALE' ? 'bg-pink-600 text-white' : 'bg-gray-200'}`}>女套裝</button>
              </div>
              <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                <button onClick={() => setSelectedSuit(null)} className="w-12 h-12 border-2 border-dashed rounded flex-shrink-0 text-[10px] text-gray-400">原本</button>
                {CLOTHES_DATA[gender].map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setSelectedSuit(s)} 
                    className={`w-12 h-12 border-2 rounded flex-shrink-0 overflow-hidden ${selectedSuit?.id === s.id ? 'border-blue-500' : ''}`}
                  >
                    <img src={s.url} alt={s.label} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t pt-2 flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-bold">人像縮放</span>
              <input type="range" min="0.1" max="1.5" step="0.01" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="flex-1 accent-blue-600" />
            </div>
          </div>

          <div className="flex gap-2">
             <button onClick={() => setImage(null)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-2xl font-bold">重新上傳</button>
             <button onClick={addToQueue} className="flex-[2] bg-blue-600 text-white py-3 rounded-2xl font-bold">確認加入</button>
          </div>
        </div>
      )}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
};

export default EzIDApp;
