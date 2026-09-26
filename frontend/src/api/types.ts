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
  image?: string;
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

export type CartItem = {
  id?: string;
  productId?: string;
  slug?: string;
  name?: string;
  image?: string;
  price?: number | string;
  quantity: number;
  [k: string]: any;
};

export type Cart = {
  items: CartItem[];
  total?: number;
  subtotal?: number;
  itemCount?: number;
};

export type FooterLink = { label: string; href: string };
export type FooterContactColumn = { title: string; lines: string[] };
export type FooterSocial = { label: string; href: string; icon?: string };
export type Footer = {
  about?: string;
  quickLinks?: FooterLink[];
  contactColumns?: FooterContactColumn[];
  socials?: FooterSocial[];
  copyright?: string;
};

export type HomeBanner = {
  image: string;
  title?: string;
  subtitle?: string;
  ctaLink?: string;
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
  homeBanners: HomeBanner[];
  announcement: string;
  footer?: Footer;
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

export type WalletTransaction = {
  id: string;
  amount: number;
  type: string;
  description: string;
  balanceAfter: number;
  mock?: boolean;
  createdAt: string;
};

export type WalletSnapshot = {
  balance: number;
  mockBalance: number;
  withdrawableBalance: number;
  transactions: WalletTransaction[];
  referralCode: string;
  referralLink: string;
  successfulReferrals: number;
  withdrawMinimum: number;
  mockTopupsEnabled: boolean;
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
