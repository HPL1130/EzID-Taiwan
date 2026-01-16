const { useState, useRef, useEffect } = React;

const EzIDApp = () => {
    const [image, setImage] = useState(null);
    const [bgRemovedImage, setBgRemovedImage] = useState(null);
    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [scale, setScale] = useState(0.5);
    const [isRemovingBg, setIsRemovingBg] = useState(false);
    
    // 衣服相關狀態
    const [selectedSuit, setSelectedSuit] = useState(null);
    const [suitX, setSuitX] = useState(175);
    const [suitY, setSuitY] = useState(250);
    const [suitScale, setSuitScale] = useState(0.6);
    
    const canvasRef = useRef(null);
    const uploadedFileRef = useRef(null);

    // 【核心修正】這段 Effect 監控所有位移變數，只要數值變了，畫布一定會重畫
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || (!image && !bgRemovedImage)) return;
        const ctx = canvas.getContext('2d');
        
        // 1. 畫白色背景
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, 350, 450);

        // 2. 畫人像
        const activeImg = bgRemovedImage || image;
        if (activeImg) {
            ctx.save();
            ctx.translate(175 + posX, 225 + posY);
            ctx.scale(scale, scale);
            ctx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
            ctx.restore();
        }

        // 3. 畫衣服 (使用絕對路徑與即時重繪)
        if (selectedSuit) {
            const sImg = new Image();
            sImg.src = selectedSuit.url;
            sImg.onload = () => {
                ctx.save();
                ctx.translate(suitX, suitY);
                ctx.scale(suitScale * 2.2, suitScale * 2.2);
                ctx.drawImage(sImg, -sImg.width / 2, -sImg.height / 2);
                ctx.restore();
                
                // 輔助紅線
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
                ctx.setLineDash([5, 5]);
                ctx.beginPath(); 
                ctx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2); 
                ctx.stroke();
            };
        }
    }, [image, bgRemovedImage, posX, posY, scale, selectedSuit, suitX, suitY, suitScale]);

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
            const lib = window.imglyBackgroundRemoval;
            if (!lib) throw new Error("去背組件尚未就緒，請刷新網頁");

            const blob = await lib.removeBackground(uploadedFileRef.current, {
                publicPath: "https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.5.3/dist/"
            });
            const img = new Image();
            img.onload = () => { setBgRemovedImage(img); setIsRemovingBg(false); };
            img.src = URL.createObjectURL(blob);
        } catch (e) {
            alert("去背失敗: " + e.message);
            setIsRemovingBg(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white shadow-2xl mt-10 rounded-[2.5rem] border border-slate-100">
            <h1 className="text-2xl font-black text-center text-slate-800 mb-6 italic">EzID Taiwan</h1>
            
            {!image ? (
                <label className="block border-4 border-dashed border-slate-200 p-20 text-center rounded-[2rem] cursor-pointer hover:bg-slate-50 transition-all">
                    <input type="file" className="hidden" onChange={handleUpload} />
                    <div className="text-5xl mb-4">📸</div>
                    <p className="font-bold text-slate-400">點擊上傳大頭照</p>
                </label>
            ) : (
                <div className="space-y-6">
                    <div className="relative rounded-2xl overflow-hidden shadow-inner bg-slate-100">
                        <canvas ref={canvasRef} width={350} height={450} className="w-full h-auto" />
                        {isRemovingBg && <div className="absolute inset-0 bg-white/80 flex items-center justify-center font-bold text-blue-600">AI 正在去背...</div>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleRemoveBg} className="bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition">✨ 去背</button>
                        <button onClick={() => setImage(null)} className="bg-slate-100 text-slate-500 font-bold py-3 rounded-xl active:scale-95 transition">重選</button>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setSuitY(y => y - 3)} className="bg-white border py-2 rounded-lg font-bold text-sm active:bg-indigo-600 active:text-white transition-colors">↑ 衣上</button>
                            <button onClick={() => setSuitY(y => y + 3)} className="bg-white border py-2 rounded-lg font-bold text-sm active:bg-indigo-600 active:text-white transition-colors">↓ 衣下</button>
                            <button onClick={() => setSuitScale(s => s + 0.02)} className="bg-white border py-2 rounded-lg font-bold text-sm">＋ 大</button>
                            <button onClick={() => setSuitX(x => x - 3)} className="bg-white border py-2 rounded-lg font-bold text-sm">← 衣左</button>
                            <button onClick={() => setSuitX(x => x + 3)} className="bg-white border py-2 rounded-lg font-bold text-sm">→ 衣右</button>
                            <button onClick={() => setSuitScale(s => s - 0.02)} className="bg-white border py-2 rounded-lg font-bold text-sm">－ 小</button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto py-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <img 
                                    key={i} 
                                    src={`./suit-m${i}.png`} 
                                    onClick={() => setSelectedSuit({url: `./suit-m${i}.png`})} 
                                    className={`w-14 h-14 border-2 rounded-xl p-1 cursor-pointer transition-all ${selectedSuit?.url === `./suit-m${i}.png` ? 'border-indigo-600 bg-indigo-50' : 'bg-white border-transparent hover:border-slate-300'}`} 
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<EzIDApp />);
