// src/types/movie.ts
export type Movie = {
  slug: string;
  title: string;
  titleLower?: string;
  year?: number;
  genres?: string[];
  isPublished?: boolean;

  // UI uchun ishlatayotgan qo‘shimcha maydonlar:
  thumbnail?: string;     // karta rasmini ko‘rsatish
  duration?: string;      // "01:45:20" kabi
  channel?: string;       // "UzbeTube" yoki kiritilgan kanal nomi
  views?: number;         // 1460000 kabi
};
