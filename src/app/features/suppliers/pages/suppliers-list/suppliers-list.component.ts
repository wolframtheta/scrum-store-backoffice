import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
import { SuppliersService } from '../../services/suppliers.service';
import { SupplierFormComponent } from '../../components/supplier-form/supplier-form.component';
import { Supplier } from '../../../../core/models/supplier.model';

@Component({
  selector: 'app-suppliers-list',
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
    SupplierFormComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './suppliers-list.component.html',
  styleUrl: './suppliers-list.component.scss',
})
export class SuppliersListComponent implements OnInit {
  private readonly suppliersService = inject(SuppliersService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly suppliers = this.suppliersService.suppliers;
  protected readonly isLoading = this.suppliersService.isLoading;
  protected readonly searchTerm = signal<string>('');
  protected readonly showInactive = signal<boolean>(false);

  protected readonly filteredSuppliers = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const suppliers = this.suppliers();

    return suppliers.filter(supplier => {
      const matchesSearch = !search || 
        supplier.name.toLowerCase().includes(search) ||
        supplier.cif?.toLowerCase().includes(search) ||
        supplier.email?.toLowerCase().includes(search) ||
        supplier.city?.toLowerCase().includes(search);
      
      const matchesActive = this.showInactive() || supplier.isActive;

      return matchesSearch && matchesActive;
    });
  });

  protected readonly showDialog = signal<boolean>(false);
  protected readonly selectedSupplier = signal<Supplier | null>(null);
  protected readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    await this.loadSuppliers();
  }

  private async loadSuppliers(): Promise<void> {
    try {
      await this.suppliersService.loadSuppliers(false);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'han pogut carregar els proveïdors'
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
    this.selectedSupplier.set(null);
    this.showDialog.set(true);
  }

  protected openEditDialog(supplier: Supplier): void {
    this.selectedSupplier.set(supplier);
    this.showDialog.set(true);
  }

  protected closeDialog(): void {
    this.showDialog.set(false);
    this.selectedSupplier.set(null);
  }

  protected async onSave(supplierData: any): Promise<void> {
    try {
      const supplier = this.selectedSupplier();
      
      if (supplier) {
        await this.suppliersService.updateSupplier(supplier.id, supplierData);
        this.messageService.add({
          severity: 'success',
          summary: 'Èxit',
          detail: 'Proveïdor actualitzat correctament'
        });
      } else {
        await this.suppliersService.createSupplier(supplierData);
        this.messageService.add({
          severity: 'success',
          summary: 'Èxit',
          detail: 'Proveïdor creat correctament'
        });
      }
      
      this.closeDialog();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut desar el proveïdor'
      });
    }
  }

  protected confirmToggleActive(supplier: Supplier): void {
    const action = supplier.isActive ? 'desactivar' : 'activar';
    
    this.confirmationService.confirm({
      message: `Estàs segur que vols ${action} aquest proveïdor?`,
      header: 'Confirmació',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => this.toggleActive(supplier)
    });
  }

  private async toggleActive(supplier: Supplier): Promise<void> {
    try {
      await this.suppliersService.toggleActive(supplier.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: `Proveïdor ${supplier.isActive ? 'desactivat' : 'activat'} correctament`
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut canviar l\'estat del proveïdor'
      });
    }
  }

  protected confirmDelete(supplier: Supplier): void {
    this.confirmationService.confirm({
      message: `Estàs segur que vols eliminar el proveïdor "${supplier.name}"?`,
      header: 'Confirmació d\'eliminació',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancel·lar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteSupplier(supplier)
    });
  }

  private async deleteSupplier(supplier: Supplier): Promise<void> {
    try {
      await this.suppliersService.deleteSupplier(supplier.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Proveïdor eliminat correctament'
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut eliminar el proveïdor'
      });
    }
  }

  protected openPeriods(supplier: Supplier): void {
    this.router.navigate(['/periods', supplier.id]);
  }
}

