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
];

export function findInvitationTemplate(categorySlug: string | null, slug: string | null) {
  return INVITATION_TEMPLATES.find(
    (template) => template.categorySlug === categorySlug && template.slug === slug,
  );
}
