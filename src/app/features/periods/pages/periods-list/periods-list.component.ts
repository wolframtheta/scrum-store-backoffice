import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PeriodsService } from '../../services/periods.service';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import { Period } from '../../../../core/models/period.model';
import { Supplier } from '../../../../core/models/supplier.model';

@Component({
  selector: 'app-periods-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './periods-list.component.html',
  styleUrl: './periods-list.component.scss',
})
export class PeriodsListComponent implements OnInit {
  private readonly periodsService = inject(PeriodsService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);

  protected readonly periods = this.periodsService.periods;
  protected readonly isLoading = computed(() => 
    this.periodsService.isLoading() || this.suppliersService.isLoading()
  );
  protected readonly searchTerm = signal<string>('');
  protected readonly supplierId = signal<string | null>(null);
  protected readonly supplier = signal<Supplier | null>(null);
  protected readonly suppliers = this.suppliersService.suppliers;
  protected readonly showSuppliers = signal<boolean>(false);
  protected readonly selectedSupplierFilter = signal<string | null>(null);

  protected readonly supplierFilterOptions = computed(() => {
    const allOption = { id: null, name: 'Tots els proveïdors' };
    return [allOption, ...this.suppliers()];
  });

  protected readonly filteredSuppliers = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const suppliersList = this.suppliers();

    return suppliersList.filter(supplier => {
      const matchesSearch = !search ||
        supplier.name.toLowerCase().includes(search) ||
        supplier.cif?.toLowerCase().includes(search) ||
        supplier.email?.toLowerCase().includes(search);

      return matchesSearch && supplier.isActive;
    });
  });

  protected readonly filteredPeriods = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const supplierFilter = this.selectedSupplierFilter();
    const periodsList = this.periods();

    return periodsList.filter(period => {
      const matchesSearch = !search ||
        period.name.toLowerCase().includes(search) ||
        period.supplier?.name.toLowerCase().includes(search);

      const matchesSupplier = !supplierFilter || period.supplierId === supplierFilter;

      return matchesSearch && matchesSupplier;
    });
  });

  async ngOnInit(): Promise<void> {
    const supplierIdParam = this.route.snapshot.paramMap.get('supplierId');
    if (supplierIdParam) {
      this.supplierId.set(supplierIdParam);
      this.selectedSupplierFilter.set(supplierIdParam);
      this.showSuppliers.set(false);
      await this.loadSupplier(supplierIdParam);
      await this.loadPeriods(supplierIdParam);
    } else {
      // Si no hi ha supplierId, mostrar tots els períodes
      this.showSuppliers.set(false);
      await this.loadSuppliers();
      await this.loadPeriods();
    }
  }

  private async loadSuppliers(): Promise<void> {
    try {
      await this.suppliersService.loadSuppliers(true);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'han pogut carregar els proveïdors'
      });
    }
  }

  private async loadSupplier(id: string): Promise<void> {
    try {
      await this.suppliersService.loadSuppliers(false);
      const supplier = this.suppliersService.suppliers().find(s => s.id === id);
      if (supplier) {
        this.supplier.set(supplier);
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut carregar el proveïdor'
      });
    }
  }

  private async loadPeriods(supplierId?: string): Promise<void> {
    try {
      await this.periodsService.loadPeriods(supplierId);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'han pogut carregar els períodes'
      });
    }
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  protected openCreateDialog(): void {
    const supplierId = this.supplierId();
    if (supplierId) {
      this.router.navigate(['/periods/new'], { queryParams: { supplierId } });
    } else {
      this.router.navigate(['/periods/new']);
    }
  }

  protected openEditDialog(period: Period): void {
    this.router.navigate(['/periods/edit', period.id]);
  }

  protected duplicatePeriod(period: Period): void {
    // Navegar al formulari de creació amb les dades del període com a query params
    const params: any = {
      duplicate: 'true',
      name: period.name,
      supplierId: period.supplierId,
      startDate: typeof period.startDate === 'string' ? period.startDate : period.startDate.toISOString().split('T')[0],
      endDate: typeof period.endDate === 'string' ? period.endDate : period.endDate.toISOString().split('T')[0],
      deliveryDate: typeof period.deliveryDate === 'string' ? period.deliveryDate : period.deliveryDate.toISOString().split('T')[0],
      recurrence: period.recurrence,
    };
    
    // Afegir articles com a JSON string
    if (period.periodArticles && period.periodArticles.length > 0) {
      params.articles = JSON.stringify(period.periodArticles.map(pa => ({
        articleId: pa.articleId,
        pricePerUnit: pa.pricePerUnit,
      })));
    }
    
    this.router.navigate(['/periods/new'], { queryParams: params });
  }

  protected confirmDelete(period: Period): void {
    this.confirmationService.confirm({
      message: `Estàs segur que vols eliminar el període "${period.name}"?`,
      header: 'Confirmació d\'eliminació',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancel·lar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deletePeriod(period)
    });
  }

  protected formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ca-ES');
  }

  protected getRecurrenceLabel(recurrence: string): string {
    const labels: Record<string, string> = {
      daily: 'Diari',
      weekly: 'Setmanal',
      biweekly: 'Quinzanal',
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      yearly: 'Anual',
      custom: 'Personalitzat',
    };
    return labels[recurrence] || recurrence;
  }

  protected openSupplierPeriods(supplier: Supplier): void {
    this.router.navigate(['/periods', supplier.id]);
  }

  protected filterBySupplier(supplierId: string | null): void {
    this.selectedSupplierFilter.set(supplierId);
  }

  protected openPeriodOrdersSummary(period: Period): void {
    this.router.navigate(['/periods', period.id, 'orders-summary']);
  }

  private async deletePeriod(period: Period): Promise<void> {
    try {
      const supplierId = period.supplierId;
      await this.periodsService.deletePeriod(period.id, supplierId);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Període eliminat correctament'
      });
      // Recarregar períodes
      if (this.supplierId()) {
        await this.loadPeriods(this.supplierId()!);
      } else {
        await this.loadPeriods();
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut eliminar el període'
      });
    }
  }
}
