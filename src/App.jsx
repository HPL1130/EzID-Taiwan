const downloadFinalPrint = () => {
    const canvas = exportCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 設定畫布為橫式 4x6 (300 DPI)
    const paperW = mmToPx(PAPER_4X6.mmH); // 152.4mm -> ~1800px
    const paperH = mmToPx(PAPER_4X6.mmW); // 101.6mm -> ~1200px
    
    canvas.width = paperW;
    canvas.height = paperH;
    
    // 背景塗白
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, paperW, paperH);

    photoList.forEach((dataUrl, index) => {
      const img = new Image();
      img.onload = () => {
        let x, y, w, h;

        if (currentSpec.id === 'MIXED') {
          // 混合模式邏輯：
          // 左側 4 張 2 吋 (index 0-3)，右側 4 張 1 吋 (index 4-7)
          const isTwoInch = index < 4;
          w = mmToPx(isTwoInch ? 35 : 28);
          h = mmToPx(isTwoInch ? 45 : 35);
          
          // 計算垂直間距，讓 4 張照片垂直居中
          const totalContentH = isTwoInch ? (h * 4 + mmToPx(5) * 3) : (h * 4 + mmToPx(5) * 3);
          const startY = (paperH - totalContentH) / 2;
          
          // X 座標：左半部或右半部居中
          const sectionW = paperW / 2;
          x = isTwoInch 
              ? (sectionW - w) / 2 
              : sectionW + (sectionW - w) / 2;
          
          // Y 座標：依索引排列
          const localIndex = index % 4;
          y = startY + localIndex * (h + mmToPx(5));

        } else {
          // 一般單一規格邏輯 (8張 2 吋 或 10張 1 吋)
          w = mmToPx(currentSpec.mmW);
          h = mmToPx(currentSpec.mmH);
          
          const gX = (paperW - w * currentSpec.cols) / (currentSpec.cols + 1);
          const gY = (paperH - h * currentSpec.rows) / (currentSpec.rows + 1);
          
          const col = index % currentSpec.cols;
          const row = Math.floor(index / currentSpec.cols);
          
          x = gX + col * (w + gX);
          y = gY + row * (h + gY);
        }

        // 繪製照片
        ctx.drawImage(img, x, y, w, h);
        
        // 繪製裁切邊框 (極淺灰色)
        ctx.strokeStyle = '#E0E0E0';
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        // 如果是最後一張，觸發下載
        if (index === photoList.length - 1) {
          const link = document.createElement('a');
          link.download = `EzID_Print_Fixed.jpg`;
          link.href = canvas.toDataURL('image/jpeg', 0.95);
          link.click();
        }
      };
      img.src = dataUrl;
    });
  };
