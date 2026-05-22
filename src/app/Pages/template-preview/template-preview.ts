import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { findInvitationTemplate } from '../../data/templates.data';
import { KanchiThoranam } from '../../template-designs/weddings/kanchi-thoranam/kanchi-thoranam';
import { MoonlitJasmine } from '../../template-designs/weddings/moonlit-jasmine/moonlit-jasmine';
import { PinkTreeProposal } from '../../template-designs/weddings/pink-tree-proposal/pink-tree-proposal';
import { SuryaGopuram } from '../../template-designs/weddings/surya-gopuram/surya-gopuram';

@Component({
  selector: 'app-template-preview',
  imports: [RouterLink, MoonlitJasmine, KanchiThoranam, SuryaGopuram, PinkTreeProposal],
  templateUrl: './template-preview.html',
  styleUrl: './template-preview.css',
})
export class TemplatePreview {
  private readonly route = inject(ActivatedRoute);

  private readonly params = toSignal(
    this.route.paramMap.pipe(
      map((paramMap) => ({
        category: paramMap.get('category'),
        slug: paramMap.get('slug'),
      })),
    ),
    { initialValue: { category: null, slug: null } },
  );

  readonly template = computed(() => {
    const params = this.params();
    return findInvitationTemplate(params.category, params.slug);
  });
}
