import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { ShowcaseService } from '../../services/showcase.service';
import { Article } from '../../../../core/models/article.model';

@Component({
  selector: 'app-showcase-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    TableModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './showcase-list.component.html',
  styleUrl: './showcase-list.component.scss',
})
export class ShowcaseListComponent implements OnInit {
  protected readonly showcaseService = inject(ShowcaseService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  async ngOnInit() {
    await this.loadArticles();
  }

  protected async loadArticles() {
    try {
      await this.showcaseService.loadShowcaseArticles();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error carregant articles de l\'aparador',
      });
    }
  }

  protected removeFromShowcase(article: Article) {
    const articleName = this.getArticleName(article);

    this.confirmationService.confirm({
      message: `¿Segur que vols treure "${articleName}" de l'aparador?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.showcaseService.removeFromShowcase(article.id);
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: 'Article tret de l\'aparador correctament',
          });
        } catch (error: any) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || 'Error traient article de l\'aparador',
          });
        }
      },
    });
  }

  protected formatPrice(article: Article): string {
    // Formatar el preu amb format espanyol (coma per decimals)
    const price = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(article.pricePerUnit);

    const unit = article.unitMeasure;
    let formatted = `${price}€/${unit}`;

    if (article.isSeasonal) {
      formatted = `🌱 ${formatted}`;
    }

    return formatted;
  }

  protected getArticleName(article: Article): string {
    const parts = [article.category, article.product, article.variety].filter(Boolean);
    return parts.join(' - ');
  }
}

