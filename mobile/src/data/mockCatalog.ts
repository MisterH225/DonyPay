export type ProductCategory =
  | 'Tous'
  | 'Électronique'
  | 'Mode'
  | 'Maison'
  | 'Sport'
  | 'Beauté';

export type ProductVariant = {
  id: string;
  label: string;
  kind: 'size' | 'color';
};

export type SavingsPlanOption = {
  id: string;
  installments: number;
  label: string;
};

export type MockProduct = {
  id: string;
  name: string;
  price: number;
  category: Exclude<ProductCategory, 'Tous'>;
  rating: number;
  reviewCount: number;
  description: string;
  images: string[];
  variants: ProductVariant[];
  plans: SavingsPlanOption[];
};

export const CATEGORIES: ProductCategory[] = [
  'Tous',
  'Électronique',
  'Mode',
  'Maison',
  'Sport',
  'Beauté',
];

/** Images placeholders (picsum) — UI only. */
export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'p1',
    name: 'Smartphone X12',
    price: 180_000,
    category: 'Électronique',
    rating: 4.6,
    reviewCount: 128,
    description:
      'Écran 6,5", 128 Go, double SIM. Idéal pour un plan d’épargne DôniPay en quelques échéances.',
    images: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
      'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80',
    ],
    variants: [
      { id: 'c-noir', label: 'Noir', kind: 'color' },
      { id: 'c-blanc', label: 'Blanc', kind: 'color' },
      { id: 'c-violet', label: 'Violet', kind: 'color' },
    ],
    plans: [
      { id: 'pl-3', installments: 3, label: '3 mois' },
      { id: 'pl-6', installments: 6, label: '6 mois' },
      { id: 'pl-12', installments: 12, label: '12 mois' },
    ],
  },
  {
    id: 'p2',
    name: 'Écouteurs Pro',
    price: 60_000,
    category: 'Électronique',
    rating: 4.4,
    reviewCount: 86,
    description: 'Réduction de bruit active, autonomie 28 h, boîtier USB-C.',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    ],
    variants: [
      { id: 'c-noir', label: 'Noir', kind: 'color' },
      { id: 'c-ivoire', label: 'Ivoire', kind: 'color' },
    ],
    plans: [
      { id: 'pl-2', installments: 2, label: '2 mois' },
      { id: 'pl-4', installments: 4, label: '4 mois' },
      { id: 'pl-6', installments: 6, label: '6 mois' },
    ],
  },
  {
    id: 'p3',
    name: 'Baskets Urban',
    price: 45_000,
    category: 'Mode',
    rating: 4.2,
    reviewCount: 54,
    description: 'Confort quotidien, semelle amortie, tissus respirants.',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    ],
    variants: [
      { id: 's-40', label: '40', kind: 'size' },
      { id: 's-41', label: '41', kind: 'size' },
      { id: 's-42', label: '42', kind: 'size' },
      { id: 's-43', label: '43', kind: 'size' },
    ],
    plans: [
      { id: 'pl-2', installments: 2, label: '2 mois' },
      { id: 'pl-3', installments: 3, label: '3 mois' },
    ],
  },
  {
    id: 'p4',
    name: 'Lampe design',
    price: 35_000,
    category: 'Maison',
    rating: 4.1,
    reviewCount: 33,
    description: 'Éclairage LED chaud, dimmable, pied métal brossé.',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80',
    ],
    variants: [
      { id: 'c-noir', label: 'Noir', kind: 'color' },
      { id: 'c-or', label: 'Or', kind: 'color' },
    ],
    plans: [
      { id: 'pl-2', installments: 2, label: '2 mois' },
      { id: 'pl-4', installments: 4, label: '4 mois' },
    ],
  },
  {
    id: 'p5',
    name: 'Montre Active',
    price: 90_000,
    category: 'Sport',
    rating: 4.5,
    reviewCount: 97,
    description: 'GPS, cardio, étanche 5 ATM. Suivi sportif complet.',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    ],
    variants: [
      { id: 'c-noir', label: 'Noir', kind: 'color' },
      { id: 'c-rose', label: 'Rose', kind: 'color' },
    ],
    plans: [
      { id: 'pl-3', installments: 3, label: '3 mois' },
      { id: 'pl-6', installments: 6, label: '6 mois' },
      { id: 'pl-9', installments: 9, label: '9 mois' },
    ],
  },
  {
    id: 'p6',
    name: 'Sérum Vitamine C',
    price: 18_000,
    category: 'Beauté',
    rating: 4.7,
    reviewCount: 210,
    description: 'Éclat et uniformité du teint. Texture légère non grasse.',
    images: [
      'https://images.unsplash.com/photo-1620916564666-4f3f8c5c0c2a?w=800&q=80',
    ],
    variants: [{ id: 'v-30', label: '30 ml', kind: 'size' }],
    plans: [
      { id: 'pl-1', installments: 1, label: 'Comptant' },
      { id: 'pl-2', installments: 2, label: '2 mois' },
    ],
  },
];

export function formatXof(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} XOF`;
}

export function getProductById(id: string): MockProduct | undefined {
  return MOCK_PRODUCTS.find((p) => p.id === id);
}

export function installmentAmount(price: number, installments: number): number {
  return Math.ceil(price / installments);
}
