export function tutorialAdimConfigOlustur(arastirmaDallari) {
  const dalAdimlari = Object.entries(arastirmaDallari).map(([dalId, dal]) => ({
    baslik: `${dal.ikon} ${dal.ad} dalı`,
    icerik: dal.aciklama,
    hedefSecici: `.arastirma-matris-dal[data-dal="${dalId}"]`,
    girisAksiyonu: "arastirmaAc",
  }));

  return [
    {
      baslik: "Haritaya genel bakış",
      icerik:
        "Bu haritada bölgeleri seçer, yakınlaştırır ve duruma göre karar verirsin. İlk adımda bir bölge seçerek sağ paneli takip et.",
      hedefSecici: "#harita-kap",
    },
    {
      baslik: "Bölge detay sekmesi",
      icerik:
        "Detay sekmesi seçtiğin bölgenin gelir, güvenlik, nüfus ve kontrol durumunu gösterir.",
      hedefSecici: "#detay",
      hedefSeciciler: ['.sag-sekme[data-sekme="detay"]', "#detay"],
      girisAksiyonu: "sekmeAc",
      sekme: "detay",
    },
    {
      baslik: "İşlemler sekmesi",
      icerik:
        "İşlemler kısmında yatırım, birlik satın alma, hareket emri ve saldırı komutları bulunur.",
      hedefSecici: "#islemler",
      hedefSeciciler: ['.sag-sekme[data-sekme="islemler"]', "#islemler"],
      girisAksiyonu: "islemlerSekmesiAc",
    },
    {
      baslik: "Raporlar sekmesi",
      icerik:
        "Raporlar paneli oyunun gidişatını, istatistik eğilimlerini ve performansını izlemeni sağlar.",
      hedefSecici: "#istatistik-panel",
      hedefSeciciler: ['.sag-sekme[data-sekme="istatistik"]', "#istatistik-panel"],
      girisAksiyonu: "sekmeAc",
      sekme: "istatistik",
    },
    {
      baslik: "Günlük sekmesi",
      icerik:
        "Günlükte savaş, fetih, araştırma ve olay kayıtları tur tur yazılır. Kritik kararları buradan takip et.",
      hedefSecici: "#log",
      hedefSeciciler: ['.sag-sekme[data-sekme="log"]', "#log"],
      girisAksiyonu: "sekmeAc",
      sekme: "log",
    },
    {
      baslik: "Araştırma ağacını aç",
      icerik:
        "Üst bardaki Araştırma düğmesine basarak büyük araştırma ekranını aç. Bu adımda İleri yerine önce araştırma ekranını açmalısın.",
      hedefSecici: "#arastirma-sayfa-btn",
      disTiklamayaIzinVer: true,
      arastirmaTiklaIlerle: true,
      ilerlemeKontrol: "arastirmaAcikMi",
      kontrolMesaji: "Önce Araştırma düğmesine basıp araştırma ekranını açmalısın.",
    },
    ...dalAdimlari,
    {
      baslik: "Tutorial tamamlandı",
      icerik:
        "Artık temel ekran akışını biliyorsun. Üst bardaki 📘 Tutorial düğmesi ile bu rehberi istediğin zaman yeniden açabilirsin.",
      hedefSecici: "#tutorial-btn",
      girisAksiyonu: "arastirmaKapat",
    },
  ];
}
