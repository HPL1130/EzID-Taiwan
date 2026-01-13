# EzID-Taiwan
台灣證件照自助產生器 (Taiwan ID Photo Maker)
Taiwan ID Photo Maker (台灣證件照自助產生器)一個基於 Web 技術開發的仿 APP 證件照製作工具，專為台灣身份證、護照、健保卡規格設計。支援手機瀏覽器操作，並可直接輸出符合 7-11 ibon 列印規格的排版檔。
✨ 特色功能🔒 隱私第一： 採用瀏覽器端 AI 去背技術，照片不須上傳伺服器，完全保護個人隱私。
📏 精準對齊： 內建台灣護照標準對齊輔助線，確保頭部比例符合內政部規定 ($3.2\text{ cm} \sim 3.6\text{ cm}$)。
🎨 AI 去背： 整合強大去背演算法，模擬 Apple AI 去背體驗。🖨️ 多格式輸出：支援 1 吋、2 吋 (大/小) 標準規格。
7-11 ibon 最佳化： 解決列印時可能產生的縮放位移問題。提供 4x6 拼板 JPG，直接去超商印 $6$ 元就能搞定。
🚀 三步驟製作拍照/選取： 上傳單人半身照。編輯對齊： 透過縮放將臉部置於虛線框內，點選「一鍵去背」。輸出拼板： 選擇 4x6 規格或數位電子檔，下載後前往超商列印。
🛠 技術實現Framework: React 18Processing: Canvas API + ML Background RemovalStyling: Tailwind CSS (Mobile-first)
