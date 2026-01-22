import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { SalesService } from '../../services/sales.service';
import { Sale, PaymentStatus } from '../../../../core/models/sale.model';
import { OrderItem, SelectedOption } from '../../../../core/models/order.model';
import { Article, CustomizationOption } from '../../../../core/models/article.model';

@Component({
  selector: 'app-sales-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    DividerModule,
    InputNumberModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    MultiSelectModule,
    ToggleSwitchModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './sales-detail.component.html',
  styleUrl: './sales-detail.component.scss'
})
export class SalesDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly salesService = inject(SalesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly sale = signal<Sale | null>(null);
  protected readonly isLoading = signal<boolean>(true);
  protected readonly PaymentStatus = PaymentStatus;
  protected readonly editingItemId = signal<string | null>(null);
  protected readonly showCustomizationDialog = signal<boolean>(false);
  protected readonly editingItem = signal<OrderItem | null>(null);
  protected readonly editingQuantity = signal<number>(0);
  protected readonly editingCustomizations = signal<SelectedOption[]>([]);
  protected readonly articleCustomizationOptions = signal<CustomizationOption[]>([]);
  protected readonly editingVariants = signal<Array<{customizations: SelectedOption[], quantity: number}>>([]);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadSale(id);
    }
  }

  private async loadSale(id: string) {
    this.isLoading.set(true);
    try {
      const sale = await this.salesService.getSaleById(id);
      this.sale.set(sale);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error carregant la comanda'
      });
      this.goBack();
    } finally {
      this.isLoading.set(false);
    }
  }

  protected goBack(): void {
    this.router.navigate(['/sales']);
  }

  protected getStatusLabel(paymentStatus?: PaymentStatus): string {
    switch (paymentStatus) {
      case PaymentStatus.PAID: return 'sales.status.paid';
      case PaymentStatus.PARTIAL: return 'sales.status.partial';
      case PaymentStatus.UNPAID: return 'sales.status.unpaid';
      default: return 'sales.status.unpaid';
    }
  }

  protected getStatusSeverity(paymentStatus?: PaymentStatus): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    switch (paymentStatus) {
      case PaymentStatus.PAID: return 'success';
      case PaymentStatus.PARTIAL: return 'warn';
      case PaymentStatus.UNPAID: return 'danger';
      default: return 'secondary';
    }
  }

  protected getTotalPaid(): number {
    const sale = this.sale();
    const paidAmount = sale?.paidAmount || 0;
    return typeof paidAmount === 'string' ? parseFloat(paidAmount) : paidAmount;
  }

  protected getTotalRemaining(): number {
    const totalWithTax = this.getTotalWithTax();
    const paidAmount = this.getTotalPaid();
    return totalWithTax - paidAmount;
  }

  protected formatPrice(price: number | string | undefined | null): string {
    if (price === undefined || price === null || price === '') return '0,00';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return '0,00';
    return numPrice.toFixed(2).replace('.', ',');
  }

  protected formatQuantity(quantity: number | string | undefined | null): string {
    if (quantity === undefined || quantity === null || quantity === '') return '0,00';
    const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
    if (isNaN(numQuantity)) return '0,00';
    return numQuantity.toFixed(2).replace('.', ',');
  }

  protected formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('ca-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  protected getArticleName(article: any): string {
    if (!article) return '-';
    const parts = [article.category, article.product, article.variety].filter(Boolean);
    return parts.length > 0 ? parts.join(' - ') : '-';
  }

  protected getItemSubtotalWithoutTax(item: any): number {
    // pricePerUnit i totalPrice són sense IVA segons l'usuari
    const totalPrice = item.totalPrice || 0;
    return typeof totalPrice === 'string' ? parseFloat(totalPrice) : totalPrice;
  }

  protected getItemTaxAmount(item: any): number {
    const taxRate = item.article?.taxRate || 0;
    const numTaxRate = typeof taxRate === 'string' ? parseFloat(taxRate) : taxRate;
    const subtotal = this.getItemSubtotalWithoutTax(item);
    return subtotal * (numTaxRate / 100);
  }

  protected getSubtotalWithoutTax(): number {
    const sale = this.sale();
    if (!sale) return 0;
    return sale.items.reduce((sum, item) => sum + this.getItemSubtotalWithoutTax(item), 0);
  }

  protected getTotalTaxAmount(): number {
    const sale = this.sale();
    if (!sale) return 0;
    return sale.items.reduce((sum, item) => sum + this.getItemTaxAmount(item), 0);
  }

  protected getTotalWithTax(): number {
    return this.getSubtotalWithoutTax() + this.getTotalTaxAmount();
  }

  protected getItemTotalWithTax(item: any): number {
    return this.getItemSubtotalWithoutTax(item) + this.getItemTaxAmount(item);
  }

  protected getItemRemaining(item: any): number {
    const totalWithTax = this.getItemTotalWithTax(item);
    const paidAmount = typeof item.paidAmount === 'string' ? parseFloat(item.paidAmount || '0') : (item.paidAmount || 0);
    return totalWithTax - paidAmount;
  }

  protected async deleteOrderItem(item: any): Promise<void> {
    const sale = this.sale();
    if (!sale || !item.id) {
      return;
    }

    const articleName = this.getArticleName(item.article);

    this.confirmationService.confirm({
      message: `Estàs segur que vols eliminar "${articleName}" d'aquesta comanda? Aquesta acció no es pot desfer.`,
      header: 'Confirmar eliminació',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancel·lar',
      accept: async () => {
        try {
          const updatedOrder = await this.salesService.deleteOrderItem(sale.id, item.id);
          
          // Si la comanda queda buida, tornar a la llista
          if (updatedOrder.items && updatedOrder.items.length === 0) {
            this.messageService.add({
              severity: 'info',
              summary: 'Informació',
              detail: 'Comanda eliminada (no quedaven articles)'
            });
            this.goBack();
          } else {
            // Actualitzar la comanda mostrada
            this.sale.set(updatedOrder);
            this.messageService.add({
              severity: 'success',
              summary: 'Èxit',
              detail: 'Article eliminat de la comanda correctament'
            });
          }
        } catch (error: any) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || 'Error eliminant article de la comanda'
          });
        }
      }
    });
  }

  protected canDeleteItem(sale: Sale | null): boolean {
    // Només permetre eliminar si la comanda no està entregada
    return sale ? !sale.isDelivered : false;
  }

  protected canMarkAsPaid(sale: Sale | null): boolean {
    // Només mostrar el botó si la comanda no està completament pagada
    return sale ? sale.paymentStatus !== PaymentStatus.PAID : false;
  }

  protected async markAsPaid(): Promise<void> {
    const sale = this.sale();
    if (!sale) {
      return;
    }

    try {
      const updatedSale = await this.salesService.markAsPaid(sale.id);
      this.sale.set(updatedSale);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Comanda marcada com a pagada correctament'
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || 'Error marcant comanda com a pagada'
      });
    }
  }

  protected formatMultiselectValue(value: any): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  }

  protected canEditItem(sale: Sale | null): boolean {
    // Només permetre editar si la comanda no està entregada
    return sale ? !sale.isDelivered : false;
  }

  protected startEditQuantity(item: OrderItem): void {
    this.editingItemId.set(item.id || null);
    this.editingQuantity.set(typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity);
  }

  protected cancelEditQuantity(): void {
    this.editingItemId.set(null);
  }

  protected async saveQuantity(item: OrderItem): Promise<void> {
    const sale = this.sale();
    if (!sale || !item.id) {
      return;
    }

    if (this.editingQuantity() <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertència',
        detail: 'La quantitat ha de ser major que 0'
      });
      return;
    }

    try {
      const updatedOrder = await this.salesService.updateOrderItem(sale.id, item.id, {
        quantity: this.editingQuantity()
      });
      
      this.sale.set(updatedOrder);
      this.editingItemId.set(null);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Quantitat actualitzada correctament'
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || 'Error actualitzant quantitat'
      });
    }
  }

  protected openCustomizationDialog(item: OrderItem): void {
    if (!item.article) {
      return;
    }

    this.editingItem.set(item);
    const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
    this.editingQuantity.set(quantity);
    this.articleCustomizationOptions.set(item.article.customizationOptions || []);
    
    // Initialize editing customizations from existing selectedOptions or create empty ones
    const existingOptions = item.selectedOptions || [];
    const customizationOptions = item.article.customizationOptions || [];
    
    const editingOptions: SelectedOption[] = customizationOptions.map((option: CustomizationOption) => {
      const existing = existingOptions.find(opt => opt.optionId === option.id);
      return existing || {
        optionId: option.id,
        title: option.title,
        type: option.type,
        value: option.type === 'boolean' ? false : (option.type === 'multiselect' ? [] : ''),
        price: 0
      };
    });

    this.editingCustomizations.set(editingOptions);
    
    // Initialize variants: if quantity > 1, create a variant with current customizations
    if (quantity > 1 && existingOptions.length > 0) {
      this.editingVariants.set([{
        customizations: [...existingOptions],
        quantity: quantity
      }]);
    } else {
      this.editingVariants.set([]);
    }
    
    this.showCustomizationDialog.set(true);
  }

  protected closeCustomizationDialog(): void {
    this.showCustomizationDialog.set(false);
    this.editingItem.set(null);
    this.editingCustomizations.set([]);
    this.editingVariants.set([]);
  }

  protected getCustomizationValue(optionId: string): any {
    const option = this.editingCustomizations().find(opt => opt.optionId === optionId);
    return option?.value;
  }

  protected onCustomizationChange(optionId: string, value: any): void {
    const options = [...this.editingCustomizations()];
    const optionIndex = options.findIndex(opt => opt.optionId === optionId);
    if (optionIndex >= 0) {
      const option = { ...options[optionIndex] };
      const articleOption = this.articleCustomizationOptions().find(opt => opt.id === optionId);
      
      // Si és un boolean i es posa a false, esborrar aquesta opció de totes les variants
      if (articleOption && articleOption.type === 'boolean' && value === false) {
        const variants = [...this.editingVariants()];
        variants.forEach(variant => {
          variant.customizations = variant.customizations.filter(opt => opt.optionId !== optionId);
        });
        this.editingVariants.set(variants);
        
        // També actualitzar editingCustomizations
        option.value = false;
        option.price = 0;
        options[optionIndex] = option;
        this.editingCustomizations.set(options);
        return;
      }
      
      option.value = value;
      
      // Calculate price for this option
      if (articleOption) {
        if (articleOption.type === 'select' && articleOption.values) {
          const selectedValue = articleOption.values.find(v => v.id === value);
          option.price = selectedValue?.price || articleOption.price || 0;
        } else if (articleOption.type === 'multiselect' && Array.isArray(value) && articleOption.values) {
          const selectedPrices = value
            .map((valId: string) => {
              const val = articleOption.values?.find(v => v.id === valId);
              return val?.price || 0;
            })
            .reduce((sum: number, price: number) => sum + price, 0);
          option.price = selectedPrices + (articleOption.price || 0);
        } else if (articleOption.type === 'boolean' && value) {
          option.price = articleOption.price || 0;
        } else {
          option.price = articleOption.price || 0;
        }
      }
      
      options[optionIndex] = option;
      this.editingCustomizations.set(options);
    }
  }

  protected getCustomizationOption(optionId: string): SelectedOption | null {
    return this.editingCustomizations().find(opt => opt.optionId === optionId) || null;
  }

  protected setCustomizationValue(optionId: string, value: any): void {
    // Si és un boolean i es posa a false, esborrar totes les personalitzacions d'aquest tipus
    if (value === false) {
      const option = this.articleCustomizationOptions().find(opt => opt.id === optionId);
      if (option && option.type === 'boolean') {
        // Esborrar aquesta opció de totes les variants
        const variants = [...this.editingVariants()];
        variants.forEach(variant => {
          variant.customizations = variant.customizations.filter(opt => opt.optionId !== optionId);
        });
        this.editingVariants.set(variants);
      }
    }
    
    this.onCustomizationChange(optionId, value);
  }

  protected async saveCustomizations(): Promise<void> {
    const item = this.editingItem();
    const sale = this.sale();
    if (!sale || !item?.id) {
      return;
    }

    try {
      let variants = [...this.editingVariants()];
      const totalQuantity = this.editingQuantity();
      const totalVariantQuantity = variants.reduce((sum, v) => sum + v.quantity, 0);
      
      // Si la suma de variants és menor que la quantitat total, afegir una variant sense personalització
      if (variants.length > 0 && totalVariantQuantity < totalQuantity) {
        const remainingQuantity = totalQuantity - totalVariantQuantity;
        variants.push({
          customizations: [],
          quantity: remainingQuantity
        });
      }
      
      // Si hi ha variants, dividir l'item en múltiples items
      if (variants.length > 0) {
        // Validar que la suma de quantitats coincideixi amb la quantitat total
        const finalTotal = variants.reduce((sum, v) => sum + v.quantity, 0);
        if (Math.abs(finalTotal - totalQuantity) > 0.001) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertència',
            detail: `La suma de quantitats (${finalTotal}) ha de coincidir amb la quantitat total (${totalQuantity})`
          });
          return;
        }

        // Actualitzar el primer item amb la primera variant
        const firstVariant = variants[0];
        const validOptions = this.filterValidOptions(firstVariant.customizations);
        
        await this.salesService.updateOrderItem(sale.id, item.id, {
          quantity: firstVariant.quantity,
          selectedOptions: validOptions
        });

        // Crear nous items per les variants restants
        // Nota: Això requeriria un endpoint per crear nous items, per ara només actualitzem el primer
        // TODO: Implementar creació de nous items per variants addicionals
        
        if (variants.length > 1) {
          this.messageService.add({
            severity: 'info',
            summary: 'Informació',
            detail: 'Només s\'ha actualitzat la primera variant. La funcionalitat de múltiples variants està en desenvolupament.'
          });
        }
      } else {
        // Comportament original: una sola combinació de personalitzacions
        const validOptions = this.filterValidOptions(this.editingCustomizations());

        const updatedOrder = await this.salesService.updateOrderItem(sale.id, item.id, {
          quantity: this.editingQuantity(),
          selectedOptions: validOptions
        });
        
        this.sale.set(updatedOrder);
      }
      
      // Recarregar la comanda
      const updatedSale = await this.salesService.getSaleById(sale.id);
      this.sale.set(updatedSale);
      
      this.closeCustomizationDialog();
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Personalització actualitzada correctament'
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || 'Error actualitzant personalització'
      });
    }
  }

  protected filterValidOptions(options: SelectedOption[]): SelectedOption[] {
    return options.filter(opt => {
      if (opt.type === 'boolean') return true;
      if (opt.type === 'multiselect') return Array.isArray(opt.value) && opt.value.length > 0;
      return opt.value !== '' && opt.value !== null && opt.value !== undefined;
    });
  }

  protected isArray(value: any): boolean {
    return Array.isArray(value);
  }

  protected getOptionPrice(option: CustomizationOption, value: any): number {
    if (option.type === 'select' && option.values && typeof value === 'string') {
      const selectedValue = option.values.find(v => v.id === value);
      return (selectedValue?.price || 0) + (option.price || 0);
    }
    if (option.type === 'multiselect' && Array.isArray(value) && option.values) {
      const selectedPrices = value
        .map((valId: string) => {
          const val = option.values?.find(v => v.id === valId);
          return val?.price || 0;
        })
        .reduce((sum: number, price: number) => sum + price, 0);
      return selectedPrices + (option.price || 0);
    }
    if (option.type === 'boolean' && value) {
      return option.price || 0;
    }
    return option.price || 0;
  }

  protected hasAnyCustomization(): boolean {
    return this.editingCustomizations().some(opt => {
      if (opt.type === 'boolean') return opt.value === true;
      if (opt.type === 'multiselect') return Array.isArray(opt.value) && opt.value.length > 0;
      return opt.value !== '' && opt.value !== null && opt.value !== undefined && opt.value !== false;
    });
  }

  protected getBasePricePerUnit(): number {
    const item = this.editingItem();
    if (!item?.article) return 0;
    return typeof item.pricePerUnit === 'string' ? parseFloat(item.pricePerUnit) : item.pricePerUnit;
  }

  protected getBasePriceTotal(): number {
    return this.getBasePricePerUnit() * this.editingQuantity();
  }

  protected getCustomizationPricePerUnit(): number {
    let total = 0;
    this.editingCustomizations().forEach(opt => {
      if (opt.type === 'boolean' && opt.value) {
        total += opt.price || 0;
      } else if (opt.type === 'multiselect' && Array.isArray(opt.value) && opt.value.length > 0) {
        total += opt.price || 0;
      } else if (opt.value !== '' && opt.value !== null && opt.value !== undefined && opt.value !== false) {
        total += opt.price || 0;
      }
    });
    return total;
  }

  protected getCustomizationPriceTotal(): number {
    // Si hi ha variants, calcular el preu de personalització només per les variants que tenen personalització
    const variants = this.editingVariants();
    if (variants.length > 0) {
      let total = 0;
      variants.forEach(variant => {
        if (variant.customizations.length > 0) {
          // Calcular el preu de personalització per aquesta variant
          let variantCustomizationPrice = 0;
          variant.customizations.forEach(opt => {
            variantCustomizationPrice += opt.price || 0;
          });
          total += variantCustomizationPrice * variant.quantity;
        }
      });
      return total;
    }
    
    // Si no hi ha variants, calcular basant-nos en editingCustomizations
    const customizedQuantity = this.hasAnyCustomization() ? this.editingQuantity() : 0;
    return this.getCustomizationPricePerUnit() * customizedQuantity;
  }

  protected getCustomizedQuantity(): number {
    // Si hi ha variants, retornar la quantitat total de variants amb personalització
    const variants = this.editingVariants();
    if (variants.length > 0) {
      return variants
        .filter(v => v.customizations.length > 0)
        .reduce((sum, v) => sum + v.quantity, 0);
    }
    
    // Si no hi ha variants, retornar la quantitat total si hi ha personalització
    return this.hasAnyCustomization() ? this.editingQuantity() : 0;
  }

  protected onTotalQuantityChange(): void {
    // Si hi ha variants, ajustar la quantitat total
    const variants = this.editingVariants();
    if (variants.length > 0) {
      const currentTotal = this.getTotalVariantsQuantity();
      const newTotal = this.editingQuantity();
      if (currentTotal > 0 && newTotal > 0) {
        // Ajustar proporcionalment les quantitats de les variants
        const ratio = newTotal / currentTotal;
        variants.forEach(v => {
          v.quantity = Number((v.quantity * ratio).toFixed(3));
        });
        this.editingVariants.set([...variants]);
      }
    }
  }

  protected addVariant(): void {
    const variants = [...this.editingVariants()];
    const remainingQuantity = this.editingQuantity() - this.getTotalVariantsQuantity();
    
    if (remainingQuantity <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertència',
        detail: 'No hi ha quantitat disponible per afegir més variants'
      });
      return;
    }

    variants.push({
      customizations: [],
      quantity: remainingQuantity
    });
    
    this.editingVariants.set(variants);
  }

  protected removeVariant(index: number): void {
    const variants = [...this.editingVariants()];
    variants.splice(index, 1);
    this.editingVariants.set(variants);
  }

  protected editVariantCustomization(index: number): void {
    const variant = this.editingVariants()[index];
    if (variant) {
      // Copiar les personalitzacions de la variant a editingCustomizations per editar-les
      this.editingCustomizations.set([...variant.customizations]);
      // TODO: Obrir un subdiàleg per editar les personalitzacions d'aquesta variant
      // Per ara, simplement actualitzem les personalitzacions quan es guarden
    }
  }

  protected getTotalVariantsQuantity(): number {
    return this.editingVariants().reduce((sum, v) => sum + v.quantity, 0);
  }

  protected getMaxVariantQuantity(variantIndex: number): number {
    const totalQuantity = this.editingQuantity();
    const variants = this.editingVariants();
    const otherVariantsTotal = variants
      .filter((_, index) => index !== variantIndex)
      .reduce((sum, v) => sum + v.quantity, 0);
    
    // El màxim és la quantitat total menys la suma de les altres variants
    const max = totalQuantity - otherVariantsTotal;
    return Math.max(this.getMinQuantity(), max);
  }

  protected onVariantQuantityChange(variantIndex: number, newValue: number | null): void {
    if (newValue === null || newValue === undefined) return;
    
    const variants = [...this.editingVariants()];
    const variant = variants[variantIndex];
    
    if (!variant) return;
    
    const totalQuantity = this.editingQuantity();
    const otherVariantsTotal = variants
      .filter((_, index) => index !== variantIndex)
      .reduce((sum, v) => sum + v.quantity, 0);
    
    const maxAllowed = totalQuantity - otherVariantsTotal;
    
    // Si el nou valor supera el màxim permès, ajustar-lo
    if (newValue > maxAllowed) {
      variant.quantity = maxAllowed;
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertència',
        detail: `La quantitat màxima permesa és ${this.formatQuantity(maxAllowed)} ${this.editingItem()?.article?.unitMeasure || 'ud'}. La quantitat s'ha ajustat automàticament.`
      });
    } else {
      variant.quantity = newValue;
    }
    
    this.editingVariants.set(variants);
  }

  protected formatCustomizationValue(option: SelectedOption): string {
    if (option.type === 'boolean') {
      return option.value ? 'Sí' : 'No';
    }
    if (option.type === 'multiselect' && Array.isArray(option.value)) {
      return option.value.join(', ');
    }
    return String(option.value || '');
  }

  protected getQuantityStep(): number {
    const item = this.editingItem();
    if (!item?.article) return 0.5;
    
    // Si la unitat és "unitat", el step ha de ser 1
    if (item.article.unitMeasure === 'unit' || item.article.unitMeasure === 'UNIT') {
      return 1;
    }
    
    // Per a altres unitats (kg, g, l, etc.), mantenir 0.5
    return 0.5;
  }

  protected getMinQuantity(): number {
    const step = this.getQuantityStep();
    // Si el step és 1 (unitats), el mínim ha de ser 1
    if (step === 1) {
      return 1;
    }
    // Per a altres unitats, mantenir 0.001
    return 0.001;
  }
}





