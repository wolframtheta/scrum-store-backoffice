import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TreeTableModule } from 'primeng/treetable';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { BlockUIModule } from 'primeng/blockui';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService, ConfirmationService, TreeNode } from 'primeng/api';

// Services
import { CsvParserService, CsvData } from '../../services/csv-parser.service';
import { CatalogService, CreateArticleDto } from '../../../catalog/services/catalog.service';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import { ProducersService } from '../../../producers/services/producers.service';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { ApiService } from '../../../../core/services/api.service';
import { CategoriesService } from '../../../catalog/services/categories.service';

// Models
import { UnitMeasure } from '../../../../core/models/article.model';
import { Category } from '../../../../core/models/category.model';

interface ColumnMapping {
  articleField: string;
  label: string;
  required: boolean;
}

interface ParsedArticle {
  category?: string;
  product?: string;
  variety?: string;
  description?: string;
  unitMeasure?: UnitMeasure;
  pricePerUnit?: number;
  city?: string;
  producer?: string;
  isEco?: boolean;
  taxRate?: number;
  isValid: boolean;
  errors: string[];
  selected: boolean;
}

interface OrderPeriod {
  id: string;
  name?: string;
  schedule?: {
    name: string;
  };
  startDate: Date | string;
  endDate: Date | string;
  deliveryDate?: Date | string;
  status?: string;
}


@Component({
  selector: 'app-csv-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    CardModule,
    ButtonModule,
    TableModule,
    TreeTableModule,
    SelectModule,
    CheckboxModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    BlockUIModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './csv-viewer.component.html',
  styleUrl: './csv-viewer.component.scss',
})
export class CsvViewerComponent implements OnInit {
  // Services
  private readonly csvParser = inject(CsvParserService);
  private readonly catalogService = inject(CatalogService);
  protected readonly suppliersService = inject(SuppliersService);
  private readonly producersService = inject(ProducersService);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly api = inject(ApiService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  // File handling
  @ViewChild('fileInput', { static: false }) fileInputRef?: ElementRef<HTMLInputElement>;
  readonly csvData = signal<CsvData | null>(null);
  readonly fileName = signal<string>('');
  readonly isDragging = signal<boolean>(false);

  // Loading states
  readonly isLoading = signal<boolean>(false);
  readonly loadingMessage = signal<string>('');

  // Supplier and Period selection
  selectedSupplierId: string | null = null;
  selectedPeriodId: string | null = null;
  readonly availablePeriods = signal<OrderPeriod[]>([]);
  
  // Watch for supplier changes to reload periods
  private readonly supplierWatcher = computed(() => this.selectedSupplierId);

  // Column mappings
  readonly columnMappings: ColumnMapping[] = [
    { articleField: 'category', label: 'Categoria', required: false },
    { articleField: 'product', label: 'Producte', required: true },
    { articleField: 'variety', label: 'Varietat', required: false },
    { articleField: 'description', label: 'Descripció', required: false },
    { articleField: 'unitMeasure', label: 'Unitat de mesura', required: true },
    { articleField: 'pricePerUnit', label: 'Preu', required: true },
    { articleField: 'city', label: 'Ciutat', required: false },
    { articleField: 'producer', label: 'Productor', required: false },
    { articleField: 'isEco', label: 'Ecològic', required: false },
    { articleField: 'taxRate', label: 'IVA (%)', required: false },
  ];

  mappingForm: FormGroup = this.fb.group({});

  // Parsed articles
  readonly parsedArticles = signal<ParsedArticle[]>([]);
  readonly selectionState = new Map<number, boolean>();

  // Computed values
  readonly selectedArticles = computed(() => {
    return this.parsedArticles().filter((article, index) => {
      return article.selected && article.isValid;
    });
  });

  readonly allValidSelected = computed(() => {
    const validArticles = this.parsedArticles().filter(a => a.isValid);
    return validArticles.length > 0 && validArticles.every(a => a.selected);
  });

  readonly someValidSelected = computed(() => {
    const validArticles = this.parsedArticles().filter(a => a.isValid);
    const selectedCount = validArticles.filter(a => a.selected).length;
    return selectedCount > 0 && selectedCount < validArticles.length;
  });

  // Existing categories/products/varieties (loaded from API)
  private readonly existingCategories = signal<Set<string>>(new Set());
  private readonly existingProducts = signal<Map<string, Set<string>>>(new Map()); // category -> products
  private readonly existingVarieties = signal<Map<string, Map<string, Set<string>>>>(new Map()); // category -> product -> varieties

  readonly newCategoryItems = computed(() => {
    const items: { category?: string; product?: string; variety?: string }[] = [];
    const existingCats = this.existingCategories();
    const existingProds = this.existingProducts();
    const existingVars = this.existingVarieties();
    
    this.parsedArticles().forEach(article => {
      const category = article.category;
      const product = article.product;
      const variety = article.variety;

      // Check if category is new
      const isNewCategory = category && !existingCats.has(category);
      
      // Check if product is new (either category is new, or product doesn't exist in category)
      const isNewProduct = product && (isNewCategory || !existingProds.get(category || '')?.has(product));
      
      // Check if variety is new (either product is new, or variety doesn't exist)
      const isNewVariety = variety && (isNewProduct || !existingVars.get(category || '')?.get(product || '')?.has(variety));

      // Only include if at least one level is new
      if (isNewCategory || isNewProduct || isNewVariety) {
        items.push({
          category: category,
          product: product,
          variety: variety,
        });
      }
    });
    return items;
  });

  readonly newCategoriesTree = computed<TreeNode[]>(() => {
    const treeMap = new Map<string, Map<string, Set<string>>>();
    const existingCats = this.existingCategories();
    const existingProds = this.existingProducts();
    const existingVars = this.existingVarieties();
    
    this.newCategoryItems().forEach(item => {
      const category = item.category;
      const product = item.product;
      const variety = item.variety;

      // Solo procesar si hay al menos una categoría o producto
      if (!category && !product) return;

      const categoryName = category || 'Sense categoria';
      const productName = product || 'Sense producte';

      // Verificar si la categoría es nueva
      const isNewCategory = category && !existingCats.has(category);
      
      // Verificar si el producto es nuevo
      const isNewProduct = product && (isNewCategory || !existingProds.get(category || '')?.has(product));
      
      // Verificar si la variedad es nueva
      const isNewVariety = variety && (isNewProduct || !existingVars.get(category || '')?.get(product || '')?.has(variety));

      // Solo incluir si es nueva en algún nivel
      if (!isNewCategory && !isNewProduct && !isNewVariety) return;

      if (!treeMap.has(categoryName)) {
        treeMap.set(categoryName, new Map());
      }
      const categoryMap = treeMap.get(categoryName)!;

      if (!categoryMap.has(productName)) {
        categoryMap.set(productName, new Set());
      }
      const varietySet = categoryMap.get(productName)!;

      if (variety && isNewVariety) {
        varietySet.add(variety);
      }
    });

    const tree: TreeNode[] = [];
    treeMap.forEach((products, categoryName) => {
      const categoryChildren: TreeNode[] = [];

      products.forEach((varieties, productName) => {
        const productChildren: TreeNode[] = [];

        varieties.forEach(varietyName => {
          productChildren.push({
            key: `cat-${categoryName}-prod-${productName}-var-${varietyName}`,
            data: {
              type: 'variety',
              name: varietyName,
              level: this.translate.instant('settings.categories.variety'),
            },
            leaf: true,
          });
        });

        const productNode: TreeNode = {
          key: `cat-${categoryName}-prod-${productName}`,
          data: {
            type: 'product',
            name: productName,
            level: this.translate.instant('settings.categories.product'),
          },
          children: productChildren.length > 0 ? productChildren : undefined,
          leaf: productChildren.length === 0,
        };

        categoryChildren.push(productNode);
      });

      const categoryNode: TreeNode = {
        key: `cat-${categoryName}`,
        data: {
          type: 'category',
          name: categoryName,
          level: this.translate.instant('settings.categories.category'),
        },
        children: categoryChildren.length > 0 ? categoryChildren : undefined,
        leaf: categoryChildren.length === 0,
      };

      tree.push(categoryNode);
    });

    return tree;
  });

  async ngOnInit(): Promise<void> {
    // Initialize form controls
    this.columnMappings.forEach(mapping => {
      this.mappingForm.addControl(mapping.articleField, this.fb.control(''));
    });

    // Load suppliers
    await this.suppliersService.loadSuppliers();
    
    // Load periods (all available periods, not just open)
    await this.loadPeriods();

    // Load existing categories to filter new ones
    await this.loadExistingCategories();

    // Try to auto-map columns if CSV is already loaded
    if (this.csvData()) {
      this.autoMapColumns();
      this.parseArticles();
    }
  }

  private async loadExistingCategories(): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) return;

    try {
      await this.categoriesService.loadCategories();
      const categories = this.categoriesService.categories();

      const catSet = new Set<string>();
      const prodMap = new Map<string, Set<string>>();
      const varMap = new Map<string, Map<string, Set<string>>>();

      categories.forEach(cat => {
        // Add category
        catSet.add(cat.category);

        // Add product
        if (!prodMap.has(cat.category)) {
          prodMap.set(cat.category, new Set());
        }
        prodMap.get(cat.category)!.add(cat.product);

        // Add variety if exists
        if (cat.variety) {
          if (!varMap.has(cat.category)) {
            varMap.set(cat.category, new Map());
          }
          const catVarMap = varMap.get(cat.category)!;
          if (!catVarMap.has(cat.product)) {
            catVarMap.set(cat.product, new Set());
          }
          catVarMap.get(cat.product)!.add(cat.variety);
        }
      });

      this.existingCategories.set(catSet);
      this.existingProducts.set(prodMap);
      this.existingVarieties.set(varMap);
    } catch (error) {
      console.error('Error loading existing categories:', error);
    }
  }

  // File handling
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await this.handleFile(files[0]);
    }
  }

  async onFileInputChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      await this.handleFile(input.files[0]);
    }
  }

  private async handleFile(file: File): Promise<void> {
    if (!file.name.endsWith('.csv')) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Només es permeten fitxers CSV',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El fitxer és massa gran. Màxim 10MB',
      });
      return;
    }

    this.isLoading.set(true);
    this.loadingMessage.set('Processant fitxer CSV...');

    try {
      const data = await this.csvParser.parseFile(file);
      this.csvData.set(data);
      this.fileName.set(file.name);
      this.autoMapColumns();
      this.parseArticles();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.message || 'Error processant el fitxer CSV',
      });
    } finally {
      this.isLoading.set(false);
      this.loadingMessage.set('');
    }
  }

  clearData(): void {
    this.csvData.set(null);
    this.fileName.set('');
    this.parsedArticles.set([]);
    this.selectionState.clear();
    this.selectedSupplierId = null;
    this.selectedPeriodId = null;
    this.mappingForm.reset();
  }

  // Column mapping
  private autoMapColumns(): void {
    if (!this.csvData()) return;

    const headers = this.csvData()!.headers.map(h => h.toLowerCase().trim());
    const mapping: Record<string, string> = {};

    this.columnMappings.forEach(mappingConfig => {
      const field = mappingConfig.articleField;
      const possibleNames = this.getPossibleColumnNames(field);

      for (const name of possibleNames) {
        const index = headers.findIndex(h => h.includes(name));
        if (index !== -1) {
          mapping[field] = this.csvData()!.headers[index];
          break;
        }
      }
    });

    // Apply mappings to form
    Object.keys(mapping).forEach(field => {
      this.mappingForm.patchValue({ [field]: mapping[field] });
    });
  }

  private getPossibleColumnNames(field: string): string[] {
    const names: Record<string, string[]> = {
      category: ['categoria', 'categoria', 'category'],
      product: ['producte', 'producto', 'product', 'nom', 'name'],
      variety: ['varietat', 'variedad', 'variety', 'varietat'],
      description: ['descripció', 'descripcio', 'descripcion', 'description', 'desc'],
      unitMeasure: ['unitat', 'unidad', 'unit', 'unitat de mesura', 'unidad de medida'],
      pricePerUnit: ['preu', 'precio', 'price', 'preu per unitat'],
      city: ['ciutat', 'ciudad', 'city'],
      producer: ['productor', 'producer', 'proveïdor', 'proveedor'],
      isEco: ['eco', 'ecològic', 'ecologico', 'ecological', 'bio', 'biològic'],
      taxRate: ['iva', 'tax', 'impost', 'tax rate'],
    };

    return names[field] || [field];
  }

  getColumnOptions(): Array<{ label: string; value: string }> {
    if (!this.csvData()) return [];
    return this.csvData()!.headers.map(header => ({
      label: header,
      value: header,
    }));
  }

  refreshPreview(): void {
    this.parseArticles();
  }

  // Article parsing and validation
  private parseArticles(): void {
    if (!this.csvData()) return;

    const articles: ParsedArticle[] = [];
    const formValues = this.mappingForm.value;

    this.csvData()!.rowsAsObjects.forEach((row, index) => {
      const article: ParsedArticle = {
        isValid: true,
        errors: [],
        selected: false,
      };

      // Parse each field
      this.columnMappings.forEach(mapping => {
        const columnName = formValues[mapping.articleField];
        if (!columnName) {
          if (mapping.required) {
            article.isValid = false;
            article.errors.push(`${mapping.label} és obligatori`);
          }
          return;
        }

        const rawValue = row[columnName]?.toString().trim() || '';

        switch (mapping.articleField) {
          case 'category':
            article.category = rawValue || undefined;
            break;
          case 'product':
            article.product = rawValue || undefined;
            if (!rawValue && mapping.required) {
              article.isValid = false;
              article.errors.push(`${mapping.label} és obligatori`);
            }
            break;
          case 'variety':
            article.variety = rawValue || undefined;
            break;
          case 'description':
            article.description = rawValue || undefined;
            break;
          case 'unitMeasure':
            article.unitMeasure = this.normalizeUnitMeasure(rawValue);
            if (!article.unitMeasure && mapping.required) {
              article.isValid = false;
              article.errors.push(`${mapping.label} és obligatori o invàlid`);
            }
            break;
          case 'pricePerUnit':
            const price = this.parsePrice(rawValue);
            if (price !== null && price > 0) {
              article.pricePerUnit = price;
            } else if (mapping.required) {
              article.isValid = false;
              article.errors.push(`${mapping.label} és obligatori i ha de ser un número vàlid > 0`);
            }
            break;
          case 'city':
            article.city = rawValue || undefined;
            break;
          case 'producer':
            article.producer = rawValue || undefined;
            break;
          case 'isEco':
            article.isEco = this.parseBoolean(rawValue);
            break;
          case 'taxRate':
            const tax = parseFloat(rawValue);
            if (!isNaN(tax) && tax >= 0) {
              article.taxRate = tax;
            }
            break;
        }
      });

      articles.push(article);
    });

    this.parsedArticles.set(articles);
  }

  private normalizeUnitMeasure(value: string): UnitMeasure | undefined {
    const normalized = value.toLowerCase().trim();
    const mapping: Record<string, UnitMeasure> = {
      kg: UnitMeasure.KG,
      kilo: UnitMeasure.KG,
      kilos: UnitMeasure.KG,
      g: UnitMeasure.G,
      grams: UnitMeasure.G,
      gramos: UnitMeasure.G,
      l: UnitMeasure.L,
      litre: UnitMeasure.L,
      litres: UnitMeasure.L,
      litro: UnitMeasure.L,
      litros: UnitMeasure.L,
      ml: UnitMeasure.ML,
      millilitre: UnitMeasure.ML,
      millilitres: UnitMeasure.ML,
      cl: UnitMeasure.CL,
      centilitre: UnitMeasure.CL,
      centilitres: UnitMeasure.CL,
      unit: UnitMeasure.UNIT,
      unitat: UnitMeasure.UNIT,
      unidad: UnitMeasure.UNIT,
      u: UnitMeasure.UNIT,
    };

    return mapping[normalized];
  }

  private parsePrice(value: string): number | null {
    if (!value) return null;
    // Replace comma with dot for European format
    const normalized = value.replace(',', '.').trim();
    const price = parseFloat(normalized);
    return isNaN(price) || price <= 0 ? null : price;
  }

  private parseBoolean(value: string): boolean | undefined {
    if (!value) return undefined;
    const normalized = value.toLowerCase().trim();
    return normalized === 'true' || normalized === '1' || normalized === 'sí' || normalized === 'si' || normalized === 'yes';
  }

  // Selection
  toggleAll(checked: boolean): void {
    this.parsedArticles.update(articles =>
      articles.map(article => ({
        ...article,
        selected: article.isValid ? checked : false,
      }))
    );
  }

  // Period handling
  protected async loadPeriods(): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      this.availablePeriods.set([]);
      return;
    }

    try {
      // Try to load all periods (open and closed)
      const periods = await this.api.get<OrderPeriod[]>(
        `consumer-groups/${groupId}/supply-schedules/periods/all`
      );
      
      // Show all periods, but prioritize open ones
      // You can filter to only open if needed: periods.filter(p => p.status === 'open')
      this.availablePeriods.set(periods);
    } catch (error) {
      console.error('Error loading periods:', error);
      // If endpoint doesn't exist yet, try alternative endpoint
      try {
        // Try alternative endpoint structure
        const periods = await this.api.get<OrderPeriod[]>(
          `consumer-groups/${groupId}/supply-schedules/periods`
        );
        this.availablePeriods.set(periods);
      } catch (altError) {
        console.error('Error loading periods from alternative endpoint:', altError);
        this.availablePeriods.set([]);
      }
    }
  }

  formatPeriodDate(date: Date | string | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ca-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getPeriodSeverity(status: string | undefined): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | null {
    if (!status) return 'secondary';
    const severityMap: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
      open: 'success',
      closed: 'secondary',
      processing: 'warn',
      delivered: 'info',
    };
    return severityMap[status.toLowerCase()] || 'secondary';
  }

  protected getPeriodName(period: OrderPeriod | null | undefined): string {
    if (!period) return 'Sense nom';
    return period.name || period.schedule?.name || 'Sense nom';
  }

  // Import
  async importArticles(): Promise<void> {
    const selected = this.selectedArticles();
    if (selected.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenció',
        detail: 'Selecciona almenys un article vàlid',
      });
      return;
    }

    if (!this.selectedSupplierId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenció',
        detail: 'Has de seleccionar un proveïdor',
      });
      return;
    }

    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No hi ha cap grup seleccionat',
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Estàs segur que vols importar ${selected.length} articles?`,
      header: 'Confirmar importació',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, importar',
      rejectLabel: 'Cancel·lar',
      accept: async () => {
        await this.performImport(selected, groupId);
      },
    });
  }

  private async performImport(articles: ParsedArticle[], groupId: string): Promise<void> {
    this.isLoading.set(true);
    this.loadingMessage.set(`Important ${articles.length} articles...`);

    // Double check groupId is valid
    if (!groupId || typeof groupId !== 'string' || groupId.trim() === '') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No hi ha cap grup de consum vàlid seleccionat',
      });
      this.isLoading.set(false);
      this.loadingMessage.set('');
      return;
    }

    try {
      // Load producers to match by name
      await this.producersService.loadProducers();
      const producers = this.producersService.producers();

      // Load existing categories to check what needs to be created
      await this.loadExistingCategories();
      const existingCats = this.existingCategories();
      const existingProds = this.existingProducts();
      const existingVars = this.existingVarieties();

      // Track categories/products/varieties to create (to avoid duplicates)
      const categoriesToCreate = new Set<string>();
      const productsToCreate = new Map<string, Set<string>>(); // category -> products
      const varietiesToCreate = new Map<string, Map<string, Set<string>>>(); // category -> product -> varieties

      // Collect all categories/products/varieties that need to be created
      for (const article of articles) {
        const category = article.category || 'Sense categoria';
        const product = article.product;
        const variety = article.variety;

        // Check if category needs to be created
        if (category && !existingCats.has(category)) {
          categoriesToCreate.add(category);
        }

        // Check if product needs to be created
        if (product) {
          const isNewCategory = category && !existingCats.has(category);
          const isNewProduct = isNewCategory || !existingProds.get(category)?.has(product);
          
          if (isNewProduct) {
            if (!productsToCreate.has(category)) {
              productsToCreate.set(category, new Set());
            }
            productsToCreate.get(category)!.add(product);
          }

          // Check if variety needs to be created
          if (variety) {
            const isNewVariety = isNewProduct || !existingVars.get(category)?.get(product)?.has(variety);
            
            if (isNewVariety) {
              if (!varietiesToCreate.has(category)) {
                varietiesToCreate.set(category, new Map());
              }
              const catVarMap = varietiesToCreate.get(category)!;
              if (!catVarMap.has(product)) {
                catVarMap.set(product, new Set());
              }
              catVarMap.get(product)!.add(variety);
            }
          }
        }
      }

      // Create categories, products and varieties in batch
      this.loadingMessage.set('Creant categories, productes i varietats...');
      
      // Collect all categories/products/varieties to create in a single batch
      const categoriesToCreateBatch: Array<{
        category: string;
        product: string;
        variety?: string;
        consumerGroupId: string;
      }> = [];

      // Add products without varieties
      for (const [category, products] of productsToCreate) {
        for (const product of products) {
          // Check if this product has varieties
          const productVarieties = varietiesToCreate.get(category)?.get(product);
          const hasVarieties = productVarieties && productVarieties.size > 0;
          if (!hasVarieties) {
            // Create product without variety
            categoriesToCreateBatch.push({
              category,
              product,
              consumerGroupId: groupId,
            });
          }
        }
      }

      // Add varieties (which include product and category)
      for (const [category, products] of varietiesToCreate) {
        for (const [product, varieties] of products) {
          for (const variety of varieties) {
            categoriesToCreateBatch.push({
              category,
              product,
              variety,
              consumerGroupId: groupId,
            });
          }
        }
      }

      // Create all in a single batch call
      if (categoriesToCreateBatch.length > 0) {
        try {
          await this.categoriesService.createCategoriesBatch(categoriesToCreateBatch);
        } catch (error) {
          console.error('Error creating categories/products/varieties in batch:', error);
          // Continue anyway - some might have been created
        }
      }

      // Reload categories after creating them
      await this.loadExistingCategories();

      // Validate groupId before proceeding
      if (!groupId || typeof groupId !== 'string' || groupId.trim() === '') {
        throw new Error('No hi ha cap grup de consum vàlid seleccionat');
      }

      // Now create articles
      this.loadingMessage.set(`Creant ${articles.length} articles...`);
      const dtos: CreateArticleDto[] = [];

      for (const article of articles) {
        // Find or create producer
        let producerId: string | undefined;
        if (article.producer) {
          const existingProducer = producers.find(
            p => p.name?.toLowerCase() === article.producer?.toLowerCase()
          );
          if (existingProducer) {
            producerId = existingProducer.id;
          } else {
            // Create new producer
            try {
              const newProducer = await this.producersService.createProducer({
                name: article.producer,
                supplierId: this.selectedSupplierId!,
                consumerGroupId: groupId,
                city: article.city,
                isActive: true,
              });
              producerId = newProducer.id;
            } catch (error) {
              console.error(`Error creating producer ${article.producer}:`, error);
            }
          }
        }

        const dto: CreateArticleDto = {
          category: article.category || 'Sense categoria',
          product: article.product!,
          variety: article.variety,
          description: article.description,
          unitMeasure: article.unitMeasure!,
          pricePerUnit: article.pricePerUnit!,
          city: article.city,
          producerId,
          isEco: article.isEco,
          taxRate: article.taxRate,
          consumerGroupId: groupId, // Ensure this is always a valid UUID string
        };

        // Validate DTO before adding
        if (!dto.consumerGroupId || !dto.product || !dto.unitMeasure || !dto.pricePerUnit) {
          console.error('Invalid DTO:', dto);
          throw new Error(`Article invàlid: falta informació obligatòria (product: ${dto.product}, unitMeasure: ${dto.unitMeasure}, pricePerUnit: ${dto.pricePerUnit}, consumerGroupId: ${dto.consumerGroupId})`);
        }

        dtos.push(dto);
      }

      // Verify all DTOs have the same consumerGroupId
      const allHaveGroupId = dtos.every(dto => dto.consumerGroupId === groupId);
      if (!allHaveGroupId) {
        console.error('Some DTOs have different consumerGroupId:', dtos.map(d => d.consumerGroupId));
        throw new Error('Error: alguns articles tenen un grup de consum diferent');
      }

      // Ensure the first DTO has consumerGroupId for the guard to detect it
      if (dtos.length > 0 && dtos[0].consumerGroupId !== groupId) {
        dtos[0].consumerGroupId = groupId;
      }

      console.log(`Creating ${dtos.length} articles for group ${groupId}`);
      console.log('First DTO consumerGroupId:', dtos[0]?.consumerGroupId);
      const result = await this.catalogService.createArticlesBatch(dtos);

      // If a period was selected, add articles to the period in batch
      if (this.selectedPeriodId && result.articles.length > 0) {
        this.loadingMessage.set(`Associant articles al període...`);
        try {
          // Prepare batch data
          const articlesBatch = result.articles.map(article => ({
            articleId: article.id,
            pricePerUnit: article.pricePerUnit,
          }));

          // Add all articles to the period in a single batch request
          const batchResult = await this.api.post<{ added: number; failed: number; errors: Array<{ articleId: string; error: string }> }>(
            `periods/${this.selectedPeriodId}/articles/batch?consumerGroupId=${groupId}`,
            { articles: articlesBatch }
          );

          if (batchResult.failed > 0) {
            console.warn(`Some articles failed to be added to period:`, batchResult.errors);
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertència',
              detail: `${batchResult.added} articles associats correctament. ${batchResult.failed} articles no s'han pogut associar.`,
            });
          }
        } catch (error) {
          console.error('Error adding articles to period:', error);
          // Don't fail the whole import if period association fails
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertència',
            detail: 'Els articles s\'han creat però hi ha hagut un error associant-los al període',
          });
        }
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Importació completada',
        detail: `${result.created} articles importats correctament${result.failed > 0 ? `. ${result.failed} han fallat` : ''}${this.selectedPeriodId ? ' i associats al període seleccionat' : ''}`,
      });

      // Clear data after successful import
      this.clearData();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || 'Error durant la importació',
      });
    } finally {
      this.isLoading.set(false);
      this.loadingMessage.set('');
    }
  }
}

