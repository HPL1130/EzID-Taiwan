import React, { useState, useRef, useEffect } from 'react';
import { removeBackground } from "@imgly/background-removal"; 

const SPECS = {
  TWO_INCH: { id: 'TWO_INCH', label: '2 吋 (8張)', mmW: 35, mmH: 45, max: 8, cols: 4, rows: 2 },
  ONE_INCH: { id: 'ONE_INCH', label: '1 吋 (10張)', mmW: 28, mmH: 35, max: 10, cols: 5, rows: 2 },
  MIXED: { id: 'MIXED', label: '2吋+1吋 (4+4張)', mmW: { '2inch': 35, '1inch': 28 }, mmH: { '2inch': 45, '1inch': 35 }, max: 8 }
};

// --- 回歸你原始的路徑格式，不加任何自動判斷 ---
const CLOTHES_DATA = {
  MALE: Array.from({ length: 5 }, (_, i) => ({ id: `m${i+1}`, label: `男裝${i+1}`, url: `/clothes/suit-m${i+1}.png` })),
  FEMALE: Array.from({ length: 5 }, (_, i) => ({ id: `f${i+1}`, label: `女裝${i+1}`, url: `/clothes/suit-f${i+1}.png` }))
};

const BACKGROUND_COLORS = [{ id: 'w', hex: '#FFFFFF' }, { id: 'b', hex: '#E6F3FF' }, { id: 'g', hex: '#F5F5F5' }];
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
  // 控制衣服的狀態
  const [suitConfig, setSuitConfig] = useState({ scale: 0.6, y: 55 });

  const canvasRef = useRef(null);
  const exportCanvasRef = useRef(null);
  const uploadedFileRef = useRef(null);

  // 繪製邏輯：確保衣服與按鈕數值同步
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    
    // 1. 底色
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, 350, 450);

    // 2. 畫人像
    const activeImg = bgRemovedImage || image;
    ctx.save();
    ctx.translate(175 + offset.x, 225 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(activeImg, -activeImg.width / 2, -activeImg.height / 2);
    ctx.restore();

    // 3. 畫衣服 (核心修正點)
    if (selectedSuit) {
      const sImg = new Image();
      sImg.src = selectedSuit.url;
      sImg.onload = () => {
        ctx.save();
        // 依照 suitConfig 的數值來移動和縮放衣服
        ctx.translate(175, (suitConfig.y / 100) * 450); 
        ctx.scale(suitConfig.scale * 2.2, suitConfig.scale * 2.2);
        ctx.drawImage(sImg, -sImg.width / 2, -sImg.height / 2);
        ctx.restore();
        drawGuideLines(ctx);
      };
    } else {
      drawGuideLines(ctx);
    }
