export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  moq: number;
  leadTime?: string;
  material?: string;
  price?: string;
  priceFrom?: number;
  description?: string;
  image?: string;
  gallery?: string[];
  tags?: string[];
  hidden?: boolean;
  isCustom?: boolean;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon?: string;
  desc?: string;
};

export type SiteSettings = {
  id: string;
  brand: string;
  companyName: string;
  tagline: string;
  address: string;
  email: string;
  phone: string;
  whatsapp: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  primaryColor: string;
  logoUrl: string;
  faviconUrl: string;
};

export type MobileCMS = {
  splashImage: string;
  splashDurationMs: number;
  appLogo: string;
  welcomeHeading: string;
  welcomeSubtext: string;
  welcomeImage: string;
  homeBannerImage: string;
  homeBannerText: string;
  announcement: string;
  updatedAt: string;
};

export type RFQPayload = {
  name: string;
  email: string;
  phone?: string;
  category?: string;
  quantity: string;
  description: string;
  productSlug?: string;
};

export type Role = "customer" | "partner" | "admin";

export type User = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: Role;
  createdAt?: string;
};

export type RFQ = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  category?: string;
  quantity: string;
  description: string;
  status: string;
  createdAt: string;
};
