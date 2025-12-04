import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProducersService } from '../../services/producers.service';
import { ProducerFormComponent } from '../../components/producer-form/producer-form.component';
import { Producer } from '../../../../core/models/producer.model';

@Component({
  selector: 'app-producers-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    TooltipModule,
    ProducerFormComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './producers-list.component.html',
  styleUrl: './producers-list.component.scss',
})
export class ProducersListComponent implements OnInit {
  private readonly producersService = inject(ProducersService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly producers = this.producersService.producers;
  protected readonly isLoading = this.producersService.isLoading;
  protected readonly searchTerm = signal<string>('');
  protected readonly showInactive = signal<boolean>(false);

  protected readonly filteredProducers = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const producers = this.producers();

    return producers.filter(producer => {
      const matchesSearch = !search ||
        producer.name.toLowerCase().includes(search) ||
        producer.supplierName?.toLowerCase().includes(search) ||
        producer.email?.toLowerCase().includes(search) ||
        producer.city?.toLowerCase().includes(search);

      const matchesActive = this.showInactive() || producer.isActive;

      return matchesSearch && matchesActive;
    });
  });

  protected readonly showDialog = signal<boolean>(false);
  protected readonly selectedProducer = signal<Producer | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadProducers();
  }

  private async loadProducers(): Promise<void> {
    try {
      await this.producersService.loadProducers(false); // Carregar tots
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'han pogut carregar els productors'
      });
    }
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  protected onSearchClick(): void {
    // El filtre ja s'aplica automàticament quan canvia searchTerm
    // Aquest mètode només serveix per al botó
  }

  protected toggleShowInactive(): void {
    this.showInactive.set(!this.showInactive());
  }

  protected openCreateDialog(): void {
    this.selectedProducer.set(null);
    this.showDialog.set(true);
  }

  protected openEditDialog(producer: Producer): void {
    this.selectedProducer.set(producer);
    this.showDialog.set(true);
  }

  protected closeDialog(): void {
    this.showDialog.set(false);
    this.selectedProducer.set(null);
  }

  protected async onSave(producerData: any): Promise<void> {
    try {
      const producer = this.selectedProducer();

      if (producer) {
        await this.producersService.updateProducer(producer.id, producerData);
        this.messageService.add({
          severity: 'success',
          summary: 'Èxit',
          detail: 'Productor actualitzat correctament'
        });
      } else {
        await this.producersService.createProducer(producerData);
        this.messageService.add({
          severity: 'success',
          summary: 'Èxit',
          detail: 'Productor creat correctament'
        });
      }

      this.closeDialog();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut desar el productor'
      });
    }
  }

  protected confirmToggleActive(producer: Producer): void {
    const action = producer.isActive ? 'desactivar' : 'activar';

    this.confirmationService.confirm({
      message: `Estàs segur que vols ${action} aquest productor?`,
      header: 'Confirmació',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => this.toggleActive(producer)
    });
  }

  private async toggleActive(producer: Producer): Promise<void> {
    try {
      await this.producersService.toggleActive(producer.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: `Productor ${producer.isActive ? 'desactivat' : 'activat'} correctament`
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut canviar l\'estat del productor'
      });
    }
  }

  protected confirmDelete(producer: Producer): void {
    this.confirmationService.confirm({
      message: `Estàs segur que vols eliminar el productor "${producer.name}"?`,
      header: 'Confirmació d\'eliminació',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancel·lar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteProducer(producer)
    });
  }

  private async deleteProducer(producer: Producer): Promise<void> {
    try {
      await this.producersService.deleteProducer(producer.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Productor eliminat correctament'
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut eliminar el productor'
      });
    }
  }
}

