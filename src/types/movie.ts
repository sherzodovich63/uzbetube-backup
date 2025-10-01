export type Movie = {
  slug: string;
  title: string;
  titleLower: string;
  year?: number;
  genres?: string[];
  poster?: string;
  hlsUrl: string;
  description?: string;
  isPublished: boolean;
  createdAt?: number;
  updatedAt?: number;
};
