import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { INVITATION_TEMPLATES } from '../../data/templates.data';

@Component({
  selector: 'app-templates',
  imports: [FormsModule, RouterLink],
  templateUrl: './templates.html',
  styleUrl: './templates.css',
})
export class Templates {
  searchTerm = '';
  selectedCategory = 'All';

  readonly categories = ['All', 'Wedding', 'Proposal', '3D', 'Cinematic', 'Elegant', 'Floral', 'Luxury'];

  readonly templates = INVITATION_TEMPLATES;

  get filteredTemplates() {
    const query = this.searchTerm.trim().toLowerCase();

    return this.templates.filter((template) => {
      const categoryMatch =
        this.selectedCategory === 'All' ||
        this.selectedCategory === template.category || template.tags.includes(this.selectedCategory);

      const searchMatch =
        !query ||
        [template.title, template.category, template.designer, ...template.tags]
          .join(' ')
          .toLowerCase()
          .includes(query);

      return categoryMatch && searchMatch;
    });
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
  }
}
