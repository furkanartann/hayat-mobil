-- Senaryo sablonlari (C# icinde metin yok; ScenarioModul bunlari yukler)
INSERT OR IGNORE INTO ScenarioDefinitions (ScenarioType, DisasterName, CriticalAlertMessage, AiDetectionType) VALUES
(1, 'Deprem', 'Merkez ussu Istanbul olan 6.8 buyuklugunde deprem meydana geldi. Tum ekiplerin dikkatine!', 'Structural_Damage'),
(2, 'Orman Yangini', 'Antalya bolgesinde buyuk capli orman yangini basladi, yerlesim yerlerini tehdit ediyor.', 'Fire'),
(3, 'Sel Felaketi', 'Karadeniz bolgesinde asiri yagislar sonucu dere yataklari tasti, sel uyarisi verildi.', 'Human_Trapped');
