const { useState, useRef, useEffect } = React;

// ... (SPECS, CLOTHES_DATA, BACKGROUND_COLORS 保持不變)

const EzIDApp = () => {
  // ... (State 保持不變)

  // 繪製邏輯：將人像與衣服畫到畫布上
  const drawMainCanvas = (targetCtx, isExport = false) => {
    const w = 350; const h = 450;
    // 1. 背景色
    targetCtx.fillStyle = selectedBgColor;
    targetCtx.fillRect(0, 0, w, h);

    // 2. 繪製人像 (包含位移與縮放)
    const activeImg = bgRemovedImage || image;
    if (activeImg) {
      targetCtx.save();
      targetCtx.translate(w / 2 + posX, h / 2 + posY);
      targetCtx.scale(scale, scale);
      targetCtx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
      targetCtx.restore();
    }

    // 3. 繪製衣服 (如果有的話)
    // 關鍵修正：直接在同一個 Function 繪製，確保 addToQueue 能抓到
    if (selectedSuit) {
      // 這裡我們需要確保衣服圖片已經載入，但在 addToQueue 時我們會處理
      const sImg = new Image();
      sImg.src = selectedSuit.url;
      // 注意：Canvas 繪製非同步圖片在 addToQueue 會有問題，下面有配套處理
    }

    // 4. 輔助線 (僅在預覽時顯示)
    if (!isExport) {
      targetCtx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
      targetCtx.setLineDash([5, 5]);
      targetCtx.beginPath(); targetCtx.ellipse(175, 200, 100, 140, 0, 0, Math.PI * 2); targetCtx.stroke();
    }
  };

  // 修正後的「加入排版」：確保衣服也被包進去
  const addToQueue = async () => {
    if (!canvasRef.current) return;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 350; tempCanvas.height = 450;
    const tCtx = tempCanvas.getContext('2d');

    // 先畫背景與人像
    drawMainCanvas(tCtx, true);

    // 如果有選衣服，必須等衣服載入完再截圖
    if (selectedSuit) {
      const sImg = new Image();
      sImg.src = selectedSuit.url;
      sImg.crossOrigin = "anonymous";
      sImg.onload = () => {
        tCtx.save();
        tCtx.translate((suitX / 100) * 350, (suitY / 100) * 450);
        tCtx.scale(suitScale * 2.2, suitScale * 2.2);
        tCtx.drawImage(sImg, -sImg.width / 2, -sImg.height / 2);
        tCtx.restore();
        setPhotoList(prev => [...prev, tempCanvas.toDataURL('image/png')]);
        setImage(null); setSelectedSuit(null);
      };
    } else {
      setPhotoList(prev => [...prev, tempCanvas.toDataURL('image/png')]);
      setImage(null);
    }
  };

  const handleRemoveBg = async () => {
    if (!uploadedFileRef.current) return;
    setIsRemovingBg(true);
    try {
      // 確保使用最新的版本
      const remover = window.imglyBackgroundRemoval || window.imglyConfigurableBackgroundRemoval;
      const blob = await remover.removeBackground(uploadedFileRef.current, {
        // 修正：指向 staticimgly 的最新 dist
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
      console.error(e);
      alert("去背失敗：請確認瀏覽器支援 SharedArrayBuffer (CORS 是否開啟)。"); 
      setIsRemovingBg(false); 
    }
  };

  // ... (其餘渲染代碼保持不變)
