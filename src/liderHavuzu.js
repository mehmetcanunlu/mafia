// AUTO-GENERATED FILE. Source: DIPLOMASI_SISTEMI.md
// Re-generate with: node scripts/build-leader-pool.mjs

export const LIDER_KOKEN_MATRISI = Object.freeze({
  "sokak": {
    "sokak": 10,
    "asker": -15,
    "tuccar": -5,
    "militan": 8,
    "yabanci": -5
  },
  "asker": {
    "sokak": -15,
    "asker": 15,
    "tuccar": 10,
    "militan": -30,
    "yabanci": -8
  },
  "tuccar": {
    "sokak": -5,
    "asker": 10,
    "tuccar": 5,
    "militan": -18,
    "yabanci": 8
  },
  "militan": {
    "sokak": 8,
    "asker": -30,
    "tuccar": -18,
    "militan": 20,
    "yabanci": -5
  },
  "yabanci": {
    "sokak": -5,
    "asker": -8,
    "tuccar": 8,
    "militan": -5,
    "yabanci": 5
  }
});

export const LIDER_KOKEN_AVATAR = Object.freeze({
  "sokak": {
    "style": "lorelei",
    "bg": "ffd5dc"
  },
  "asker": {
    "style": "notionists-neutral",
    "bg": "b6e3f4"
  },
  "tuccar": {
    "style": "personas",
    "bg": "c0f4c4"
  },
  "militan": {
    "style": "adventurer",
    "bg": "f4c4b6"
  },
  "yabanci": {
    "style": "big-smile",
    "bg": "e4c0f4"
  }
});

const LIDER_VERISI = [
  {
    "id": 1,
    "ad": "Kara Mehmet",
    "lakap": "Boğaziçi'nin Gölgesi",
    "tohum": "kara-mehmet",
    "koken": "sokak",
    "sempati": 5,
    "kanDavalari": [
      {
        "hedef": 21,
        "deger": -35
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 21,
        "deger": -35,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=kara-mehmet&backgroundColor=ffd5dc"
  },
  {
    "id": 2,
    "ad": "Çukur Ali",
    "lakap": "Delişmen",
    "tohum": "cukur-ali",
    "koken": "sokak",
    "sempati": 2,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 61,
        "deger": 22
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 61,
        "deger": 22,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=cukur-ali&backgroundColor=ffd5dc"
  },
  {
    "id": 3,
    "ad": "Kıl Payı Hasan",
    "lakap": "Hayatta Kalan",
    "tohum": "kilpayi-hasan",
    "koken": "sokak",
    "sempati": 12,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=kilpayi-hasan&backgroundColor=ffd5dc"
  },
  {
    "id": 4,
    "ad": "Bıçak Sırtı Kemal",
    "lakap": "Keskin",
    "tohum": "bicaksirtikemal",
    "koken": "sokak",
    "sempati": -8,
    "kanDavalari": [
      {
        "hedef": 43,
        "deger": -28
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 43,
        "deger": -28,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=bicaksirtikemal&backgroundColor=ffd5dc"
  },
  {
    "id": 5,
    "ad": "Gece Yarısı Murat",
    "lakap": "Uykusuz",
    "tohum": "geceyarisi-murat",
    "koken": "sokak",
    "sempati": 3,
    "kanDavalari": [
      {
        "hedef": 98,
        "deger": -30
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 98,
        "deger": -30,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=geceyarisi-murat&backgroundColor=ffd5dc"
  },
  {
    "id": 6,
    "ad": "Tophane Osman",
    "lakap": "Eski Toprak",
    "tohum": "tophane-osman",
    "koken": "sokak",
    "sempati": 14,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 86,
        "deger": 18
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 86,
        "deger": 18,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "yapici",
    "bonus": {
      "binaMaliyetiIndirim": 0.15
    },
    "ikon": "🏗️",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=tophane-osman&backgroundColor=ffd5dc"
  },
  {
    "id": 7,
    "ad": "Bacanak Sami",
    "lakap": "Yandaş",
    "tohum": "bacanak-sami",
    "koken": "sokak",
    "sempati": 8,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 1,
        "deger": 15
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 1,
        "deger": 15,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=bacanak-sami&backgroundColor=ffd5dc"
  },
  {
    "id": 8,
    "ad": "Fırtına Erkan",
    "lakap": "Delice",
    "tohum": "firtina-erkan",
    "koken": "sokak",
    "sempati": -12,
    "kanDavalari": [
      {
        "hedef": 22,
        "deger": -20
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 22,
        "deger": -20,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=firtina-erkan&backgroundColor=ffd5dc"
  },
  {
    "id": 9,
    "ad": "Yılan Gözlü Cevat",
    "lakap": "Soğukkanlı",
    "tohum": "yilangozlu-cevat",
    "koken": "sokak",
    "sempati": -5,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 50,
        "deger": 20
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 50,
        "deger": 20,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=yilangozlu-cevat&backgroundColor=ffd5dc"
  },
  {
    "id": 10,
    "ad": "Külkedisi Tarık",
    "lakap": "Zorlu",
    "tohum": "kulkedisi-tarik",
    "koken": "sokak",
    "sempati": 6,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=kulkedisi-tarik&backgroundColor=ffd5dc"
  },
  {
    "id": 11,
    "ad": "Kasap Yılmaz",
    "lakap": "Acımasız",
    "tohum": "kasap-yilmaz",
    "koken": "sokak",
    "sempati": -18,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 41,
        "deger": 25
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 41,
        "deger": 25,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=kasap-yilmaz&backgroundColor=ffd5dc"
  },
  {
    "id": 12,
    "ad": "Kömür Fikret",
    "lakap": "Karanlık",
    "tohum": "komur-fikret",
    "koken": "sokak",
    "sempati": -10,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "yapici",
    "bonus": {
      "binaMaliyetiIndirim": 0.15
    },
    "ikon": "🏗️",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=komur-fikret&backgroundColor=ffd5dc"
  },
  {
    "id": 13,
    "ad": "Patlak Lastik Vedat",
    "lakap": "Takılı",
    "tohum": "patlak-vedat",
    "koken": "sokak",
    "sempati": 1,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=patlak-vedat&backgroundColor=ffd5dc"
  },
  {
    "id": 14,
    "ad": "Demir Boncuk Süleyman",
    "lakap": "Serttaş",
    "tohum": "demirboncuk-suleyman",
    "koken": "sokak",
    "sempati": -3,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 15,
        "deger": 12
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 15,
        "deger": 12,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=demirboncuk-suleyman&backgroundColor=ffd5dc"
  },
  {
    "id": 15,
    "ad": "Boz Kurt Hamit",
    "lakap": "Sürü Lideri",
    "tohum": "bozkurt-hamit",
    "koken": "sokak",
    "sempati": 16,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 1,
        "deger": 15
      },
      {
        "hedef": 7,
        "deger": 10
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 1,
        "deger": 15,
        "tur": "eski_dost"
      },
      {
        "hedef": 7,
        "deger": 10,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=bozkurt-hamit&backgroundColor=ffd5dc"
  },
  {
    "id": 16,
    "ad": "Çakı Yusuf",
    "lakap": "Sivri",
    "tohum": "caki-yusuf",
    "koken": "sokak",
    "sempati": -6,
    "kanDavalari": [
      {
        "hedef": 33,
        "deger": -22
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 33,
        "deger": -22,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=caki-yusuf&backgroundColor=ffd5dc"
  },
  {
    "id": 17,
    "ad": "Gürültülü Şükrü",
    "lakap": "Patırtılı",
    "tohum": "gurultulu-sukru",
    "koken": "sokak",
    "sempati": -14,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=gurultulu-sukru&backgroundColor=ffd5dc"
  },
  {
    "id": 18,
    "ad": "Mazlum Ahmet",
    "lakap": "İkiyüzlü",
    "tohum": "mazlum-ahmet",
    "koken": "sokak",
    "sempati": 9,
    "kanDavalari": [
      {
        "hedef": 20,
        "deger": -30
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 20,
        "deger": -30,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "yapici",
    "bonus": {
      "binaMaliyetiIndirim": 0.15
    },
    "ikon": "🏗️",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=mazlum-ahmet&backgroundColor=ffd5dc"
  },
  {
    "id": 19,
    "ad": "Boyacı Selim",
    "lakap": "Renkli",
    "tohum": "boyaci-selim",
    "koken": "sokak",
    "sempati": 18,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 44,
        "deger": 15
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 44,
        "deger": 15,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=boyaci-selim&backgroundColor=ffd5dc"
  },
  {
    "id": 20,
    "ad": "Kancık Celal",
    "lakap": "Sinsi",
    "tohum": "kancik-celal",
    "koken": "sokak",
    "sempati": -22,
    "kanDavalari": [
      {
        "hedef": 47,
        "deger": -40
      },
      {
        "hedef": 18,
        "deger": -30
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 47,
        "deger": -40,
        "tur": "kan_davasi"
      },
      {
        "hedef": 18,
        "deger": -30,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/lorelei/svg?seed=kancik-celal&backgroundColor=ffd5dc"
  },
  {
    "id": 21,
    "ad": "Albay Rıza",
    "lakap": "Disiplinli",
    "tohum": "albay-riza",
    "koken": "asker",
    "sempati": -5,
    "kanDavalari": [
      {
        "hedef": 1,
        "deger": -35
      },
      {
        "hedef": 65,
        "deger": -50
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 1,
        "deger": -35,
        "tur": "kan_davasi"
      },
      {
        "hedef": 65,
        "deger": -50,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=albay-riza&backgroundColor=b6e3f4"
  },
  {
    "id": 22,
    "ad": "Komutan Fevzi",
    "lakap": "Katı",
    "tohum": "komutan-fevzi",
    "koken": "asker",
    "sempati": -8,
    "kanDavalari": [
      {
        "hedef": 64,
        "deger": -45
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 64,
        "deger": -45,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=komutan-fevzi&backgroundColor=b6e3f4"
  },
  {
    "id": 23,
    "ad": "Teğmen Umut",
    "lakap": "Genç Kan",
    "tohum": "tegmen-umut",
    "koken": "asker",
    "sempati": 18,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 35,
        "deger": 14
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 35,
        "deger": 14,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=tegmen-umut&backgroundColor=b6e3f4"
  },
  {
    "id": 24,
    "ad": "Binbaşı Serkan",
    "lakap": "Stratejist",
    "tohum": "binbasi-serkan",
    "koken": "asker",
    "sempati": 10,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 22,
        "deger": 15
      },
      {
        "hedef": 40,
        "deger": 15
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 22,
        "deger": 15,
        "tur": "eski_dost"
      },
      {
        "hedef": 40,
        "deger": 15,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "tedavici",
    "bonus": {
      "regenBonus": 0.05
    },
    "ikon": "🏥",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=binbasi-serkan&backgroundColor=b6e3f4"
  },
  {
    "id": 25,
    "ad": "Emekli Komiser Cem",
    "lakap": "Çevreli",
    "tohum": "komiser-cem",
    "koken": "asker",
    "sempati": 20,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 55,
        "deger": 18
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 55,
        "deger": 18,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=komiser-cem&backgroundColor=b6e3f4"
  },
  {
    "id": 26,
    "ad": "Jandarma Nihat",
    "lakap": "Sert",
    "tohum": "jandarma-nihat",
    "koken": "asker",
    "sempati": -15,
    "kanDavalari": [
      {
        "hedef": 73,
        "deger": -25
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 73,
        "deger": -25,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "tedavici",
    "bonus": {
      "regenBonus": 0.05
    },
    "ikon": "🏥",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=jandarma-nihat&backgroundColor=b6e3f4"
  },
  {
    "id": 27,
    "ad": "Piyade Erdal",
    "lakap": "Sadık",
    "tohum": "piyade-erdal",
    "koken": "asker",
    "sempati": 6,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=piyade-erdal&backgroundColor=b6e3f4"
  },
  {
    "id": 28,
    "ad": "Bomba Uzmanı Bülent",
    "lakap": "Hassas",
    "tohum": "bomba-bulent",
    "koken": "asker",
    "sempati": -3,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=bomba-bulent&backgroundColor=b6e3f4"
  },
  {
    "id": 29,
    "ad": "Sniper Koray",
    "lakap": "Sabırlı",
    "tohum": "sniper-koray",
    "koken": "asker",
    "sempati": 4,
    "kanDavalari": [
      {
        "hedef": 75,
        "deger": -20
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 75,
        "deger": -20,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=sniper-koray&backgroundColor=b6e3f4"
  },
  {
    "id": 30,
    "ad": "Kamuflaj Tuncay",
    "lakap": "Kaybolur",
    "tohum": "kamuflaj-tuncay",
    "koken": "asker",
    "sempati": 8,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "tedavici",
    "bonus": {
      "regenBonus": 0.05
    },
    "ikon": "🏥",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=kamuflaj-tuncay&backgroundColor=b6e3f4"
  },
  {
    "id": 31,
    "ad": "Eski İstihbarat Faruk",
    "lakap": "Bilgili",
    "tohum": "istihbarat-faruk",
    "koken": "asker",
    "sempati": -12,
    "kanDavalari": [
      {
        "hedef": 83,
        "deger": -20
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 83,
        "deger": -20,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=istihbarat-faruk&backgroundColor=b6e3f4"
  },
  {
    "id": 32,
    "ad": "Demir Yaka Zafer",
    "lakap": "Katı Kuralcı",
    "tohum": "demiryaka-zafer",
    "koken": "asker",
    "sempati": -6,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "tedavici",
    "bonus": {
      "regenBonus": 0.05
    },
    "ikon": "🏥",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=demiryaka-zafer&backgroundColor=b6e3f4"
  },
  {
    "id": 33,
    "ad": "Şehit Oğlu Levent",
    "lakap": "Öfkeli",
    "tohum": "sehitoglu-levent",
    "koken": "asker",
    "sempati": -18,
    "kanDavalari": [
      {
        "hedef": 16,
        "deger": -22
      },
      {
        "hedef": 71,
        "deger": -30
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 16,
        "deger": -22,
        "tur": "kan_davasi"
      },
      {
        "hedef": 71,
        "deger": -30,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=sehitoglu-levent&backgroundColor=b6e3f4"
  },
  {
    "id": 34,
    "ad": "Kışla Kaçkını Emre",
    "lakap": "İsyankar",
    "tohum": "kisla-emre",
    "koken": "asker",
    "sempati": 3,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 62,
        "deger": 15
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 62,
        "deger": 15,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=kisla-emre&backgroundColor=b6e3f4"
  },
  {
    "id": 35,
    "ad": "Silah Ustası Nuri",
    "lakap": "Yetenekli",
    "tohum": "silahusta-nuri",
    "koken": "asker",
    "sempati": 12,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 23,
        "deger": 14
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 23,
        "deger": 14,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=silahusta-nuri&backgroundColor=b6e3f4"
  },
  {
    "id": 36,
    "ad": "Paraşütçü İbrahim",
    "lakap": "Atılgan",
    "tohum": "parasutcu-ibrahim",
    "koken": "asker",
    "sempati": 7,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "tedavici",
    "bonus": {
      "regenBonus": 0.05
    },
    "ikon": "🏥",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=parasutcu-ibrahim&backgroundColor=b6e3f4"
  },
  {
    "id": 37,
    "ad": "Deniz Kurdu Bahadır",
    "lakap": "Gezgin",
    "tohum": "denizkurdu-bahadir",
    "koken": "asker",
    "sempati": 15,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 81,
        "deger": 18
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 81,
        "deger": 18,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=denizkurdu-bahadir&backgroundColor=b6e3f4"
  },
  {
    "id": 38,
    "ad": "Bomba Takımı Soner",
    "lakap": "Dikkatli",
    "tohum": "bombatak-soner",
    "koken": "asker",
    "sempati": -2,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "tedavici",
    "bonus": {
      "regenBonus": 0.05
    },
    "ikon": "🏥",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=bombatak-soner&backgroundColor=b6e3f4"
  },
  {
    "id": 39,
    "ad": "Helikopter Çağrısı Volkan",
    "lakap": "Panikçi",
    "tohum": "heli-volkan",
    "koken": "asker",
    "sempati": -10,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=heli-volkan&backgroundColor=b6e3f4"
  },
  {
    "id": 40,
    "ad": "Kırmızı Bere Alper",
    "lakap": "Elit",
    "tohum": "kiziibere-alper",
    "koken": "asker",
    "sempati": 22,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 22,
        "deger": 15
      },
      {
        "hedef": 24,
        "deger": 15
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 22,
        "deger": 15,
        "tur": "eski_dost"
      },
      {
        "hedef": 24,
        "deger": 15,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=kiziibere-alper&backgroundColor=b6e3f4"
  },
  {
    "id": 41,
    "ad": "Altın Diş Agop",
    "lakap": "Güvenilmez",
    "tohum": "altindis-agop",
    "koken": "tuccar",
    "sempati": 5,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 11,
        "deger": 25
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 11,
        "deger": 25,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=altindis-agop&backgroundColor=c0f4c4"
  },
  {
    "id": 42,
    "ad": "Köşeli Kamil",
    "lakap": "Hesaplı",
    "tohum": "koseli-kamil",
    "koken": "tuccar",
    "sempati": 10,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 56,
        "deger": 30
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 56,
        "deger": 30,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "ekonomist",
    "bonus": {
      "gelirCarpani": 0.25
    },
    "ikon": "💰",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=koseli-kamil&backgroundColor=c0f4c4"
  },
  {
    "id": 43,
    "ad": "Döviz Büro Sabri",
    "lakap": "Değişken",
    "tohum": "doviz-sabri",
    "koken": "tuccar",
    "sempati": 2,
    "kanDavalari": [
      {
        "hedef": 4,
        "deger": -28
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 4,
        "deger": -28,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "ekonomist",
    "bonus": {
      "gelirCarpani": 0.25
    },
    "ikon": "💰",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=doviz-sabri&backgroundColor=c0f4c4"
  },
  {
    "id": 44,
    "ad": "Kıyak Naim",
    "lakap": "İyi Niyetli",
    "tohum": "kiyak-naim",
    "koken": "tuccar",
    "sempati": 22,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 19,
        "deger": 15
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 19,
        "deger": 15,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "yapici",
    "bonus": {
      "binaMaliyetiIndirim": 0.15
    },
    "ikon": "🏗️",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=kiyak-naim&backgroundColor=c0f4c4"
  },
  {
    "id": 45,
    "ad": "Çifte Defter Orhan",
    "lakap": "İkili Oyun",
    "tohum": "ciftedefter-orhan",
    "koken": "tuccar",
    "sempati": -8,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=ciftedefter-orhan&backgroundColor=c0f4c4"
  },
  {
    "id": 46,
    "ad": "Borsa Beyi Ufuk",
    "lakap": "Spekülatör",
    "tohum": "borsa-ufuk",
    "koken": "tuccar",
    "sempati": 4,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "ekonomist",
    "bonus": {
      "gelirCarpani": 0.25
    },
    "ikon": "💰",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=borsa-ufuk&backgroundColor=c0f4c4"
  },
  {
    "id": 47,
    "ad": "Kira Kıralı Hilmi",
    "lakap": "Ev Sahibi",
    "tohum": "kirakral-hilmi",
    "koken": "tuccar",
    "sempati": 15,
    "kanDavalari": [
      {
        "hedef": 20,
        "deger": -40
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 20,
        "deger": -40,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=kirakral-hilmi&backgroundColor=c0f4c4"
  },
  {
    "id": 48,
    "ad": "İhracat İsmet",
    "lakap": "Uluslararası",
    "tohum": "ihracat-ismet",
    "koken": "tuccar",
    "sempati": 12,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 90,
        "deger": 15
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 90,
        "deger": 15,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "ekonomist",
    "bonus": {
      "gelirCarpani": 0.25
    },
    "ikon": "💰",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=ihracat-ismet&backgroundColor=c0f4c4"
  },
  {
    "id": 49,
    "ad": "Piyasa Bilal",
    "lakap": "Değişken",
    "tohum": "piyasa-bilal",
    "koken": "tuccar",
    "sempati": 1,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "ekonomist",
    "bonus": {
      "gelirCarpani": 0.25
    },
    "ikon": "💰",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=piyasa-bilal&backgroundColor=c0f4c4"
  },
  {
    "id": 50,
    "ad": "Komisyon Bedri",
    "lakap": "Aracı",
    "tohum": "komisyon-bedri",
    "koken": "tuccar",
    "sempati": 18,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 9,
        "deger": 20
      },
      {
        "hedef": 90,
        "deger": 20
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 9,
        "deger": 20,
        "tur": "eski_dost"
      },
      {
        "hedef": 90,
        "deger": 20,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "yapici",
    "bonus": {
      "binaMaliyetiIndirim": 0.15
    },
    "ikon": "🏗️",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=komisyon-bedri&backgroundColor=c0f4c4"
  },
  {
    "id": 51,
    "ad": "Sahte Fatura Mesut",
    "lakap": "Dolandırıcı",
    "tohum": "sahtefatura-mesut",
    "koken": "tuccar",
    "sempati": -20,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=sahtefatura-mesut&backgroundColor=c0f4c4"
  },
  {
    "id": 52,
    "ad": "Nakit Cömert Necdet",
    "lakap": "Parasever",
    "tohum": "nakit-necdet",
    "koken": "tuccar",
    "sempati": 8,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 58,
        "deger": 15
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 58,
        "deger": 15,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "ekonomist",
    "bonus": {
      "gelirCarpani": 0.25
    },
    "ikon": "💰",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=nakit-necdet&backgroundColor=c0f4c4"
  },
  {
    "id": 53,
    "ad": "Gümrük Kapısı Hami",
    "lakap": "Gizli",
    "tohum": "gumruk-hami",
    "koken": "tuccar",
    "sempati": 6,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 84,
        "deger": 12
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 84,
        "deger": 12,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=gumruk-hami&backgroundColor=c0f4c4"
  },
  {
    "id": 54,
    "ad": "Marka Sahtecisi Bayram",
    "lakap": "Kopya",
    "tohum": "marka-bayram",
    "koken": "tuccar",
    "sempati": -14,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "ekonomist",
    "bonus": {
      "gelirCarpani": 0.25
    },
    "ikon": "💰",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=marka-bayram&backgroundColor=c0f4c4"
  },
  {
    "id": 55,
    "ad": "Sıcak Para Kenan",
    "lakap": "Akıllı",
    "tohum": "sicakpara-kenan",
    "koken": "tuccar",
    "sempati": 16,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 25,
        "deger": 18
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 25,
        "deger": 18,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "ekonomist",
    "bonus": {
      "gelirCarpani": 0.25
    },
    "ikon": "💰",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=sicakpara-kenan&backgroundColor=c0f4c4"
  },
  {
    "id": 56,
    "ad": "Vergi Kaçağı Fikret",
    "lakap": "Kaçak",
    "tohum": "vergikacak-fikret",
    "koken": "tuccar",
    "sempati": -5,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 42,
        "deger": 30
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 42,
        "deger": 30,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "yapici",
    "bonus": {
      "binaMaliyetiIndirim": 0.15
    },
    "ikon": "🏗️",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=vergikacak-fikret&backgroundColor=c0f4c4"
  },
  {
    "id": 57,
    "ad": "İşhanı Beyi Mükremin",
    "lakap": "Sakin",
    "tohum": "ishanı-mukremin",
    "koken": "tuccar",
    "sempati": 20,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=ishan%C4%B1-mukremin&backgroundColor=c0f4c4"
  },
  {
    "id": 58,
    "ad": "Borç Veren Nazif",
    "lakap": "Faizci",
    "tohum": "borcveren-nazif",
    "koken": "tuccar",
    "sempati": -6,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 52,
        "deger": 15
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 52,
        "deger": 15,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "ekonomist",
    "bonus": {
      "gelirCarpani": 0.25
    },
    "ikon": "💰",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=borcveren-nazif&backgroundColor=c0f4c4"
  },
  {
    "id": 59,
    "ad": "Kargo Şirketi Tekin",
    "lakap": "Hızlı",
    "tohum": "kargo-tekin",
    "koken": "tuccar",
    "sempati": 9,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 87,
        "deger": 10
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 87,
        "deger": 10,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=kargo-tekin&backgroundColor=c0f4c4"
  },
  {
    "id": 60,
    "ad": "Komisyoncu Ramazan",
    "lakap": "Tatlı Dilli",
    "tohum": "komisyoncu-ramazan",
    "koken": "tuccar",
    "sempati": 24,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "ekonomist",
    "bonus": {
      "gelirCarpani": 0.25
    },
    "ikon": "💰",
    "avatarUrl": "https://api.dicebear.com/9.x/personas/svg?seed=komisyoncu-ramazan&backgroundColor=c0f4c4"
  },
  {
    "id": 61,
    "ad": "Ateş Perest Barış",
    "lakap": "Çelişkili",
    "tohum": "atesperest-baris",
    "koken": "militan",
    "sempati": 8,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 2,
        "deger": 22
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 2,
        "deger": 22,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=atesperest-baris&backgroundColor=f4c4b6"
  },
  {
    "id": 62,
    "ad": "Kızıl Boran Deniz",
    "lakap": "Sert",
    "tohum": "kizilboran-deniz",
    "koken": "militan",
    "sempati": -5,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 34,
        "deger": 15
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 34,
        "deger": 15,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=kizilboran-deniz&backgroundColor=f4c4b6"
  },
  {
    "id": 63,
    "ad": "Devrim Hüseyin",
    "lakap": "Tutucu",
    "tohum": "devrim-huseyin",
    "koken": "militan",
    "sempati": 2,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=devrim-huseyin&backgroundColor=f4c4b6"
  },
  {
    "id": 64,
    "ad": "Molotof Sezai",
    "lakap": "Patlayıcı",
    "tohum": "molotof-sezai",
    "koken": "militan",
    "sempati": -20,
    "kanDavalari": [
      {
        "hedef": 22,
        "deger": -45
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 22,
        "deger": -45,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=molotof-sezai&backgroundColor=f4c4b6"
  },
  {
    "id": 65,
    "ad": "Köy Yangını Veli",
    "lakap": "Öfkeli",
    "tohum": "koyyangini-veli",
    "koken": "militan",
    "sempati": -16,
    "kanDavalari": [
      {
        "hedef": 21,
        "deger": -50
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 21,
        "deger": -50,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=koyyangini-veli&backgroundColor=f4c4b6"
  },
  {
    "id": 66,
    "ad": "Siyah Bayrak Sedat",
    "lakap": "Radikal",
    "tohum": "siyahbayrak-sedat",
    "koken": "militan",
    "sempati": -10,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "tedavici",
    "bonus": {
      "regenBonus": 0.05
    },
    "ikon": "🏥",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=siyahbayrak-sedat&backgroundColor=f4c4b6"
  },
  {
    "id": 67,
    "ad": "Özgürlük Kahraman",
    "lakap": "İdealist",
    "tohum": "ozgurluk-kahraman",
    "koken": "militan",
    "sempati": 18,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=ozgurluk-kahraman&backgroundColor=f4c4b6"
  },
  {
    "id": 68,
    "ad": "Toprak Reformu Cengiz",
    "lakap": "Katı",
    "tohum": "toprak-cengiz",
    "koken": "militan",
    "sempati": 5,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=toprak-cengiz&backgroundColor=f4c4b6"
  },
  {
    "id": 69,
    "ad": "Gece Baskını Tahsin",
    "lakap": "Stratejist",
    "tohum": "gecebaskini-tahsin",
    "koken": "militan",
    "sempati": -4,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=gecebaskini-tahsin&backgroundColor=f4c4b6"
  },
  {
    "id": 70,
    "ad": "Barikat Mevlüt",
    "lakap": "Engel",
    "tohum": "barikat-mevlut",
    "koken": "militan",
    "sempati": -8,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=barikat-mevlut&backgroundColor=f4c4b6"
  },
  {
    "id": 71,
    "ad": "Başkaldırı Bekir",
    "lakap": "Asi",
    "tohum": "baskaldiri-bekir",
    "koken": "militan",
    "sempati": 6,
    "kanDavalari": [
      {
        "hedef": 33,
        "deger": -30
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 33,
        "deger": -30,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=baskaldiri-bekir&backgroundColor=f4c4b6"
  },
  {
    "id": 72,
    "ad": "Yanan Araba Cenk",
    "lakap": "Sert",
    "tohum": "yananaraba-cenk",
    "koken": "militan",
    "sempati": -18,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "tedavici",
    "bonus": {
      "regenBonus": 0.05
    },
    "ikon": "🏥",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=yananaraba-cenk&backgroundColor=f4c4b6"
  },
  {
    "id": 73,
    "ad": "İşçi Hakkı Selçuk",
    "lakap": "Dayanışmacı",
    "tohum": "isci-selcuk",
    "koken": "militan",
    "sempati": 14,
    "kanDavalari": [
      {
        "hedef": 26,
        "deger": -25
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 26,
        "deger": -25,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=isci-selcuk&backgroundColor=f4c4b6"
  },
  {
    "id": 74,
    "ad": "Örgütçü Tamer",
    "lakap": "Planlayıcı",
    "tohum": "orgutcu-tamer",
    "koken": "militan",
    "sempati": 10,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 80,
        "deger": 20
      },
      {
        "hedef": 79,
        "deger": 20
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 80,
        "deger": 20,
        "tur": "eski_dost"
      },
      {
        "hedef": 79,
        "deger": 20,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=orgutcu-tamer&backgroundColor=f4c4b6"
  },
  {
    "id": 75,
    "ad": "Kalaşnikov Kaya",
    "lakap": "Silah Düşkünü",
    "tohum": "kalasnikov-kaya",
    "koken": "militan",
    "sempati": -22,
    "kanDavalari": [
      {
        "hedef": 29,
        "deger": -20
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 29,
        "deger": -20,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=kalasnikov-kaya&backgroundColor=f4c4b6"
  },
  {
    "id": 76,
    "ad": "Propaganda Halil",
    "lakap": "Konuşkan",
    "tohum": "propaganda-halil",
    "koken": "militan",
    "sempati": 20,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=propaganda-halil&backgroundColor=f4c4b6"
  },
  {
    "id": 77,
    "ad": "Grev Öncüsü Burhan",
    "lakap": "Kararlı",
    "tohum": "grevcusu-burhan",
    "koken": "militan",
    "sempati": 12,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 80,
        "deger": 35
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 80,
        "deger": 35,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=grevcusu-burhan&backgroundColor=f4c4b6"
  },
  {
    "id": 78,
    "ad": "Barikatta Ölüm Umut",
    "lakap": "Korkusuz",
    "tohum": "barikat-umut",
    "koken": "militan",
    "sempati": -6,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "tedavici",
    "bonus": {
      "regenBonus": 0.05
    },
    "ikon": "🏥",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=barikat-umut&backgroundColor=f4c4b6"
  },
  {
    "id": 79,
    "ad": "Sınıf Savaşı Yıldırım",
    "lakap": "Keskin",
    "tohum": "sinif-yildirim",
    "koken": "militan",
    "sempati": 7,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 74,
        "deger": 20
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 74,
        "deger": 20,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=sinif-yildirim&backgroundColor=f4c4b6"
  },
  {
    "id": 80,
    "ad": "Kızıl Fırtına Cihan",
    "lakap": "Coşkulu",
    "tohum": "kizilf-cihan",
    "koken": "militan",
    "sempati": 16,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 77,
        "deger": 35
      },
      {
        "hedef": 74,
        "deger": 20
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 77,
        "deger": 35,
        "tur": "eski_dost"
      },
      {
        "hedef": 74,
        "deger": 20,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=kizilf-cihan&backgroundColor=f4c4b6"
  },
  {
    "id": 81,
    "ad": "Rum Vasilis",
    "lakap": "Denizci",
    "tohum": "rum-vasilis",
    "koken": "yabanci",
    "sempati": 10,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 37,
        "deger": 18
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 37,
        "deger": 18,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=rum-vasilis&backgroundColor=e4c0f4"
  },
  {
    "id": 82,
    "ad": "Bulgar Boris",
    "lakap": "Soğuk",
    "tohum": "bulgar-boris",
    "koken": "yabanci",
    "sempati": -8,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=bulgar-boris&backgroundColor=e4c0f4"
  },
  {
    "id": 83,
    "ad": "Kürt Serhat",
    "lakap": "Gizli Ağ",
    "tohum": "kurt-serhat",
    "koken": "yabanci",
    "sempati": 6,
    "kanDavalari": [
      {
        "hedef": 31,
        "deger": -20
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 31,
        "deger": -20,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "yapici",
    "bonus": {
      "binaMaliyetiIndirim": 0.15
    },
    "ikon": "🏗️",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=kurt-serhat&backgroundColor=e4c0f4"
  },
  {
    "id": 84,
    "ad": "Çeçen İbrahim Halil",
    "lakap": "Acımasız",
    "tohum": "cecen-ibrahim",
    "koken": "yabanci",
    "sempati": -16,
    "kanDavalari": [
      {
        "hedef": 89,
        "deger": -30
      }
    ],
    "eskiDostlar": [
      {
        "hedef": 53,
        "deger": 12
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 89,
        "deger": -30,
        "tur": "kan_davasi"
      },
      {
        "hedef": 53,
        "deger": 12,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "tedavici",
    "bonus": {
      "regenBonus": 0.05
    },
    "ikon": "🏥",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=cecen-ibrahim&backgroundColor=e4c0f4"
  },
  {
    "id": 85,
    "ad": "Arnavut Besim",
    "lakap": "Onurlu",
    "tohum": "arnavut-besim",
    "koken": "yabanci",
    "sempati": 14,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 93,
        "deger": 15
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 93,
        "deger": 15,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=arnavut-besim&backgroundColor=e4c0f4"
  },
  {
    "id": 86,
    "ad": "Gürcü Giorgi",
    "lakap": "Sadık",
    "tohum": "gurcu-giorgi",
    "koken": "yabanci",
    "sempati": 8,
    "kanDavalari": [
      {
        "hedef": 90,
        "deger": -25
      }
    ],
    "eskiDostlar": [
      {
        "hedef": 6,
        "deger": 18
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 6,
        "deger": 18,
        "tur": "eski_dost"
      },
      {
        "hedef": 90,
        "deger": -25,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "ekonomist",
    "bonus": {
      "gelirCarpani": 0.25
    },
    "ikon": "💰",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=gurcu-giorgi&backgroundColor=e4c0f4"
  },
  {
    "id": 87,
    "ad": "Suriyeli Walid",
    "lakap": "Hayatta Kalan",
    "tohum": "suriyeli-walid",
    "koken": "yabanci",
    "sempati": 5,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 59,
        "deger": 10
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 59,
        "deger": 10,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=suriyeli-walid&backgroundColor=e4c0f4"
  },
  {
    "id": 88,
    "ad": "İranlı Daryoush",
    "lakap": "Sinsi",
    "tohum": "iranli-daryoush",
    "koken": "yabanci",
    "sempati": -10,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=iranli-daryoush&backgroundColor=e4c0f4"
  },
  {
    "id": 89,
    "ad": "Ukraynalı Mykola",
    "lakap": "Sert",
    "tohum": "ukraynali-mykola",
    "koken": "yabanci",
    "sempati": -5,
    "kanDavalari": [
      {
        "hedef": 84,
        "deger": -30
      }
    ],
    "eskiDostlar": [],
    "ozelBaglar": [
      {
        "hedef": 84,
        "deger": -30,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "yapici",
    "bonus": {
      "binaMaliyetiIndirim": 0.15
    },
    "ikon": "🏗️",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=ukraynali-mykola&backgroundColor=e4c0f4"
  },
  {
    "id": 90,
    "ad": "Rus Viktor",
    "lakap": "Soğukkanlı",
    "tohum": "rus-viktor",
    "koken": "yabanci",
    "sempati": 2,
    "kanDavalari": [
      {
        "hedef": 86,
        "deger": -25
      }
    ],
    "eskiDostlar": [
      {
        "hedef": 50,
        "deger": 20
      },
      {
        "hedef": 48,
        "deger": 15
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 50,
        "deger": 20,
        "tur": "eski_dost"
      },
      {
        "hedef": 48,
        "deger": 15,
        "tur": "eski_dost"
      },
      {
        "hedef": 86,
        "deger": -25,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "tedavici",
    "bonus": {
      "regenBonus": 0.05
    },
    "ikon": "🏥",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=rus-viktor&backgroundColor=e4c0f4"
  },
  {
    "id": 91,
    "ad": "Leh Bartosz",
    "lakap": "Planlayıcı",
    "tohum": "leh-bartosz",
    "koken": "yabanci",
    "sempati": 12,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=leh-bartosz&backgroundColor=e4c0f4"
  },
  {
    "id": 92,
    "ad": "Romen Constantin",
    "lakap": "Uyumlu",
    "tohum": "romen-constantin",
    "koken": "yabanci",
    "sempati": 7,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "ekonomist",
    "bonus": {
      "gelirCarpani": 0.25
    },
    "ikon": "💰",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=romen-constantin&backgroundColor=e4c0f4"
  },
  {
    "id": 93,
    "ad": "Sırp Dragan",
    "lakap": "Güçlü",
    "tohum": "sirp-dragan",
    "koken": "yabanci",
    "sempati": -4,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 85,
        "deger": 15
      },
      {
        "hedef": 95,
        "deger": 20
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 85,
        "deger": 15,
        "tur": "eski_dost"
      },
      {
        "hedef": 95,
        "deger": 20,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=sirp-dragan&backgroundColor=e4c0f4"
  },
  {
    "id": 94,
    "ad": "Macar Zoltán",
    "lakap": "Hesaplı",
    "tohum": "macar-zoltan",
    "koken": "yabanci",
    "sempati": 16,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=macar-zoltan&backgroundColor=e4c0f4"
  },
  {
    "id": 95,
    "ad": "Makedon Bojan",
    "lakap": "Sessiz",
    "tohum": "makedon-bojan",
    "koken": "yabanci",
    "sempati": 9,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 93,
        "deger": 20
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 93,
        "deger": 20,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "yapici",
    "bonus": {
      "binaMaliyetiIndirim": 0.15
    },
    "ikon": "🏗️",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=makedon-bojan&backgroundColor=e4c0f4"
  },
  {
    "id": 96,
    "ad": "Boşnak Adnan",
    "lakap": "Onurlu",
    "tohum": "bosnak-adnan",
    "koken": "yabanci",
    "sempati": 11,
    "kanDavalari": [],
    "eskiDostlar": [],
    "ozelBaglar": [],
    "ozellik": "tedavici",
    "bonus": {
      "regenBonus": 0.05
    },
    "ikon": "🏥",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=bosnak-adnan&backgroundColor=e4c0f4"
  },
  {
    "id": 97,
    "ad": "Azeri Elvin",
    "lakap": "Akıllı",
    "tohum": "azeri-elvin",
    "koken": "yabanci",
    "sempati": 18,
    "kanDavalari": [
      {
        "hedef": 98,
        "deger": -45
      }
    ],
    "eskiDostlar": [
      {
        "hedef": 86,
        "deger": 15
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 86,
        "deger": 15,
        "tur": "eski_dost"
      },
      {
        "hedef": 98,
        "deger": -45,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "gizlici",
    "bonus": {
      "kayipAzaltma": 0.15
    },
    "ikon": "👻",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=azeri-elvin&backgroundColor=e4c0f4"
  },
  {
    "id": 98,
    "ad": "Ermeni Hagop",
    "lakap": "Tarihe Düşman",
    "tohum": "ermeni-hagop",
    "koken": "yabanci",
    "sempati": -15,
    "kanDavalari": [
      {
        "hedef": 5,
        "deger": -30
      },
      {
        "hedef": 97,
        "deger": -45
      }
    ],
    "eskiDostlar": [
      {
        "hedef": 90,
        "deger": 20
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 5,
        "deger": -30,
        "tur": "kan_davasi"
      },
      {
        "hedef": 90,
        "deger": 20,
        "tur": "eski_dost"
      },
      {
        "hedef": 97,
        "deger": -45,
        "tur": "kan_davasi"
      }
    ],
    "ozellik": "ekonomist",
    "bonus": {
      "gelirCarpani": 0.25
    },
    "ikon": "💰",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=ermeni-hagop&backgroundColor=e4c0f4"
  },
  {
    "id": 99,
    "ad": "Yunan Stavros",
    "lakap": "Denizci",
    "tohum": "yunan-stavros",
    "koken": "yabanci",
    "sempati": 13,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 81,
        "deger": 12
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 81,
        "deger": 12,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "rekrutcu",
    "bonus": {
      "adamCarpani": 0.2
    },
    "ikon": "👔",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=yunan-stavros&backgroundColor=e4c0f4"
  },
  {
    "id": 100,
    "ad": "Kıbrıslı Petros",
    "lakap": "İki Taraflı",
    "tohum": "kibrisli-petros",
    "koken": "yabanci",
    "sempati": 20,
    "kanDavalari": [],
    "eskiDostlar": [
      {
        "hedef": 81,
        "deger": 10
      },
      {
        "hedef": 99,
        "deger": 10
      }
    ],
    "ozelBaglar": [
      {
        "hedef": 81,
        "deger": 10,
        "tur": "eski_dost"
      },
      {
        "hedef": 99,
        "deger": 10,
        "tur": "eski_dost"
      }
    ],
    "ozellik": "savasci",
    "bonus": {
      "saldiriGucu": 0.15
    },
    "ikon": "⚔️",
    "avatarUrl": "https://api.dicebear.com/9.x/big-smile/svg?seed=kibrisli-petros&backgroundColor=e4c0f4"
  }
];

export const LIDER_HAVUZU = Object.freeze(
  LIDER_VERISI.map((lider) =>
    Object.freeze({
      ...lider,
      bonus: Object.freeze({ ...(lider.bonus || {}) }),
      kanDavalari: Object.freeze([...(lider.kanDavalari || [])]),
      eskiDostlar: Object.freeze([...(lider.eskiDostlar || [])]),
      ozelBaglar: Object.freeze([...(lider.ozelBaglar || [])]),
    })
  )
);

const LIDER_INDEX = new Map(LIDER_HAVUZU.map((lider) => [lider.id, lider]));

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function liderById(id) {
  return LIDER_INDEX.get(Number(id)) || null;
}

export function liderKopyasi(lider) {
  if (!lider) return null;
  return {
    ...lider,
    bonus: { ...(lider.bonus || {}) },
    kanDavalari: [...(lider.kanDavalari || [])],
    eskiDostlar: [...(lider.eskiDostlar || [])],
    ozelBaglar: [...(lider.ozelBaglar || [])],
  };
}

export function rastgeleLiderSecimi(adet = 4, rng = Math.random) {
  const n = Math.max(1, Math.min(adet, LIDER_HAVUZU.length));
  const havuz = [...LIDER_HAVUZU];
  for (let i = havuz.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [havuz[i], havuz[j]] = [havuz[j], havuz[i]];
  }
  return havuz.slice(0, n).map((lider) => liderKopyasi(lider));
}

function bagDegeriTekYon(kaynak, hedefId) {
  if (!kaynak || !Array.isArray(kaynak.ozelBaglar)) return null;
  const bag = kaynak.ozelBaglar.find((b) => Number(b.hedef) === Number(hedefId));
  return Number.isFinite(bag?.deger) ? Number(bag.deger) : null;
}

export function liderOzelBagDegeri(liderA, liderB) {
  if (!liderA || !liderB) return 0;
  const ab = bagDegeriTekYon(liderA, liderB.id);
  const ba = bagDegeriTekYon(liderB, liderA.id);
  if (Number.isFinite(ab) && Number.isFinite(ba)) {
    if (Math.sign(ab) === Math.sign(ba)) {
      return Math.round((ab + ba) / 2);
    }
    return ab + ba;
  }
  if (Number.isFinite(ab)) return ab;
  if (Number.isFinite(ba)) return ba;
  return 0;
}

function matrixDegeri(kokenA, kokenB) {
  if (!kokenA || !kokenB) return 0;
  const satir = LIDER_KOKEN_MATRISI[kokenA];
  if (!satir) return 0;
  return Number(satir[kokenB]) || 0;
}

export function liderlerArasiBaslangicIliski(liderA, liderB) {
  if (!liderA || !liderB) return 0;
  const grup = matrixDegeri(liderA.koken, liderB.koken);
  const sempati = (Number(liderA.sempati) || 0) + (Number(liderB.sempati) || 0);
  const ozelBag = liderOzelBagDegeri(liderA, liderB);
  return clamp(Math.round(grup + sempati + ozelBag), -100, 100);
}

export function liderAvatarUrl(lider) {
  if (!lider?.tohum) return "";
  const avatar = LIDER_KOKEN_AVATAR[lider.koken] || LIDER_KOKEN_AVATAR.sokak;
  return `https://api.dicebear.com/9.x/${avatar.style}/svg?seed=${encodeURIComponent(
    lider.tohum
  )}&backgroundColor=${avatar.bg}`;
}
