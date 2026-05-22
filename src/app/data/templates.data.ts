export type TemplateCategory = 'weddings';

export interface InvitationTemplate {
  slug: string;
  categorySlug: TemplateCategory;
  title: string;
  category: string;
  tags: string[];
  designer: string;
  photoCount: number;
  price: string;
  route: string;
  palette: string[];
}

export const INVITATION_TEMPLATES: InvitationTemplate[] = [
  {
    slug: 'pink-tree-proposal',
    categorySlug: 'weddings',
    title: 'Pink Tree Proposal',
    category: 'Proposal',
    tags: ['Proposal', '3D', 'Cinematic', 'Romantic'],
    designer: 'Momentry Studio',
    photoCount: 1,
    price: 'Premium',
    route: '/templates/weddings/pink-tree-proposal',
    palette: ['#13091d', '#ff79ba', '#ffddec', '#fff8d9'],
  },
  {
    slug: 'moonlit-jasmine',
    categorySlug: 'weddings',
    title: 'Moonlit Jasmine',
    category: 'Wedding',
    tags: ['Elegant', 'Floral', 'Minimal', 'Luxury'],
    designer: 'Momentry Studio',
    photoCount: 1,
    price: 'Premium',
    route: '/templates/weddings/moonlit-jasmine',
    palette: ['#f7efe2', '#d5b982', '#17473a', '#11100e'],
  },
  {
    slug: 'kanchi-thoranam',
    categorySlug: 'weddings',
    title: 'Kanchi Thoranam',
    category: 'Wedding',
    tags: ['Traditional', 'South Indian', 'Temple', 'Luxury'],
    designer: 'Momentry Studio',
    photoCount: 1,
    price: 'Premium',
    route: '/templates/weddings/kanchi-thoranam',
    palette: ['#fff7e5', '#8b2b18', '#efb64a', '#1f6f45'],
  },
  {
    slug: 'surya-gopuram',
    categorySlug: 'weddings',
    title: 'Surya Gopuram',
    category: 'Wedding',
    tags: ['Traditional', 'South Indian', 'Temple', '3D'],
    designer: 'Momentry Studio',
    photoCount: 1,
    price: 'Premium',
    route: '/templates/weddings/surya-gopuram',
    palette: ['#fff4dd', '#d85e24', '#ffd36f', '#7f1d12'],
  },
];

export function findInvitationTemplate(categorySlug: string | null, slug: string | null) {
  return INVITATION_TEMPLATES.find(
    (template) => template.categorySlug === categorySlug && template.slug === slug,
  );
}
