import { Component, inject, input, output, signal, effect, ChangeDetectionStrategy, ChangeDetectorRef, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { CheckboxModule } from 'primeng/checkbox';

import { Article, UnitMeasure } from '../../../../core/models/article.model';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { CategoriesService } from '../../services/categories.service';
import { ProducersService } from '../../../producers/services/producers.service';
import { ProducerFormComponent } from '../../../producers/components/producer-form/producer-form.component';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-article-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    AutoCompleteModule,
    CheckboxModule,
    ProducerFormComponent,
    TooltipModule,
  ],
  templateUrl: './article-form.component.html',
  styleUrl: './article-form.component.scss',
})
export class ArticleFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly producersService = inject(ProducersService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Inputs/Outputs
  readonly visible = input.required<boolean>();
  readonly article = input<Article | null>(null);
  readonly visibleChange = output<boolean>();
  readonly save = output<any>();

  // State
  protected readonly form: FormGroup;
  protected readonly isEditMode = signal<boolean>(false);

  // Unit measures
  protected readonly unitMeasureOptions = [
    { label: 'g', value: UnitMeasure.G },
    { label: 'kg', value: UnitMeasure.KG },
    { label: 'ml', value: UnitMeasure.ML },
    { label: 'cl', value: UnitMeasure.CL },
    { label: 'l', value: UnitMeasure.L },
    { label: 'unitat', value: UnitMeasure.UNIT },
  ];
  protected readonly filteredUnitMeasures = signal(this.unitMeasureOptions);

  // Categories autocomplete
  protected readonly categories = signal<string[]>([]);
  protected readonly filteredCategories = signal<string[]>([]);
  protected readonly products = signal<string[]>([]);
  protected readonly filteredProducts = signal<string[]>([]);
  protected readonly varieties = signal<string[]>([]);
  protected readonly filteredVarieties = signal<string[]>([]);

  // Producers
  protected readonly producers = this.producersService.producers;
  protected readonly filteredProducers = signal(this.producersService.producers());

  // Dialogs
  protected readonly showProducerDialog = signal<boolean>(false);

  constructor() {
    this.form = this.fb.group({
      category: ['', Validators.required],
      product: ['', Validators.required],
      variety: [''],
      description: [''],
      unitMeasure: [UnitMeasure.KG, Validators.required],
      pricePerUnit: [0, [Validators.required, Validators.min(0)]],
      city: [''],
      producer: [null],
      isSeasonal: [false],
    });

    // Carregar categories i productors quan s'obre el diàleg
    effect(() => {
      const isVisible = this.visible();
      if (isVisible) {
        console.log('Dialog opened, loading categories and producers...');
        this.loadCategories();
        this.producersService.loadProducers();
      }
    });

    // Actualitzar productors filtrats quan canvien
    effect(() => {
      this.filteredProducers.set(this.producers());
    });

    // Effect per carregar dades de l'article quan canvia
    effect(() => {
      const article = this.article();
      const visible = this.visible();

      console.log('[effect article] Triggered - article:', article, 'visible:', visible);

      // Només actualitzar el formulari quan el modal està visible
      if (!visible) return;

      // Utilitzar untracked per evitar que l'effect es dispari quan canvien altres signals
      untracked(() => {
        if (article) {
          console.log('[effect article] Edit mode - loading article data');
          this.isEditMode.set(true);

          // Trobar el producer complet per l'ID
          const producer = article.producerId
            ? this.producers().find(p => p.id === article.producerId)
            : null;

          // Usar setValue per assegurar que tots els valors s'actualitzen correctament
          this.form.setValue({
            category: article.category || '',
            product: article.product || '',
            variety: article.variety || '',
            description: article.description || '',
            unitMeasure: article.unitMeasure || UnitMeasure.KG,
            pricePerUnit: article.pricePerUnit || 0,
            city: article.city || '',
            producer: producer || null,
            isSeasonal: article.isSeasonal === true, // Comparació estricta
          }, { emitEvent: false }); // No emetre events per evitar loops
        } else {
          console.log('[effect article] Create mode - resetting form');
          this.isEditMode.set(false);
          this.form.reset({
            unitMeasure: UnitMeasure.KG,
            pricePerUnit: 0,
            isSeasonal: false,
          }, { emitEvent: false });
        }
      });
    });

    // Quan canvia la categoria, actualitzar productes
    this.form.get('category')?.valueChanges.subscribe(async (category) => {
      console.log('[category valueChanges] New category value:', category);
      if (category) {
        const products = await this.categoriesService.getProductsByCategory(category);
        console.log('[category valueChanges] Products loaded:', products);
        this.products.set(products);
        this.filteredProducts.set(products);
        // No emetre events per evitar loops i problemes amb valueChanges
        this.form.patchValue({ product: '', variety: '' }, { emitEvent: false });
        console.log('[category valueChanges] After patch - Category value:', this.form.get('category')?.value);
        console.log('[category valueChanges] After patch - Product disabled?', this.form.get('product')?.disabled);
        // Forçar detecció de canvis per OnPush
        this.cdr.markForCheck();
      }
    });

    // Quan canvia el producte, actualitzar varietats
    this.form.get('product')?.valueChanges.subscribe(async (product) => {
      const category = this.form.get('category')?.value;
      console.log('[product valueChanges] New product value:', product, 'Category:', category);
      if (category && product) {
        const varieties = await this.categoriesService.getVarietiesByProduct(category, product);
        console.log('[product valueChanges] Varieties loaded:', varieties);
        this.varieties.set(varieties);
        this.filteredVarieties.set(varieties);
        // No emetre events per evitar loops
        this.form.patchValue({ variety: '' }, { emitEvent: false });
        // Forçar detecció de canvis per OnPush
        this.cdr.markForCheck();
      }
    });
  }

  private async loadCategories(): Promise<void> {
    console.log('Loading categories...');
    try {
      const categories = await this.categoriesService.getUniqueCategories();
      console.log('Categories loaded:', categories);
      this.categories.set(categories);
      this.filteredCategories.set(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  protected onHide(): void {
    this.visibleChange.emit(false);
    this.form.reset({
      unitMeasure: UnitMeasure.KG,
      pricePerUnit: 0,
      isSeasonal: false,
    });
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    const groupId = this.groupService.selectedGroupId();

    if (!groupId) {
      return;
    }

    // Generar el nom automàticament a partir de categoria, producte i varietat
    const nameParts = [
      formValue.category,
      formValue.product,
      formValue.variety
    ].filter(Boolean); // Eliminar valors buits

    const name = nameParts.join(' - ') || 'Article sense nom';

    // Preparar dades
    const data: any = {
      name: name,
      category: formValue.category,
      product: formValue.product,
      variety: formValue.variety,
      description: formValue.description,
      unitMeasure: formValue.unitMeasure,
      pricePerUnit: Number(formValue.pricePerUnit),
      city: formValue.city,
      producerId: formValue.producer?.id || null,
      isSeasonal: Boolean(formValue.isSeasonal),
      consumerGroupId: groupId, // Sempre afegir groupId perquè el guard el necessita
    };

    this.save.emit(data);
    this.visibleChange.emit(false); // Tancar el modal després de guardar
  }

  protected isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  protected getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.hasError('required')) {
      return 'catalog.form.errors.required';
    }
    if (field?.hasError('maxLength')) {
      return 'catalog.form.errors.maxLength';
    }
    if (field?.hasError('min')) {
      return 'catalog.form.errors.min';
    }
    return '';
  }

  protected filterUnitMeasures(event: any): void {
    const query = event.query?.toLowerCase() || '';
    this.filteredUnitMeasures.set(
      this.unitMeasureOptions.filter(option =>
        option.label.toLowerCase().includes(query)
      )
    );
  }

  protected filterCategories(event: any): void {
    console.log('[filterCategories] Event:', event);
    const query = event.query?.toLowerCase() || '';
    const filtered = this.categories().filter(cat =>
      cat.toLowerCase().includes(query)
    );
    console.log('[filterCategories] Query:', query, 'Filtered:', filtered);
    this.filteredCategories.set(filtered);
  }

  protected onCategorySelect(event: any): void {
    console.log('[onCategorySelect] Selected:', event);
    const categoryValue = this.form.get('category')?.value;
    console.log('[onCategorySelect] Form value after select:', categoryValue);
    console.log('[onCategorySelect] Should enable product?', !!categoryValue);
    console.log('[onCategorySelect] Product field disabled?', this.form.get('product')?.disabled);
  }

  protected filterProducts(event: any): void {
    console.log('[filterProducts] Event:', event);
    const query = event.query?.toLowerCase() || '';
    const filtered = this.products().filter(prod =>
      prod.toLowerCase().includes(query)
    );
    console.log('[filterProducts] Query:', query, 'Filtered:', filtered);
    this.filteredProducts.set(filtered);
  }

  protected onProductSelect(event: any): void {
    console.log('[onProductSelect] Selected:', event);
    console.log('[onProductSelect] Form value after select:', this.form.get('product')?.value);
  }

  protected filterVarieties(event: any): void {
    console.log('[filterVarieties] Event:', event);
    const query = event.query?.toLowerCase() || '';
    const filtered = this.varieties().filter(variety =>
      variety.toLowerCase().includes(query)
    );
    console.log('[filterVarieties] Query:', query, 'Filtered:', filtered);
    this.filteredVarieties.set(filtered);
  }

  protected onVarietySelect(event: any): void {
    console.log('[onVarietySelect] Selected:', event);
    console.log('[onVarietySelect] Form value after select:', this.form.get('variety')?.value);
  }

  protected filterProducers(event: any): void {
    const query = event.query?.toLowerCase() || '';
    this.filteredProducers.set(
      this.producers().filter(producer =>
        producer.name.toLowerCase().includes(query)
      )
    );
  }

  protected openProducerDialog(): void {
    this.showProducerDialog.set(true);
  }

  protected closeProducerDialog(): void {
    this.showProducerDialog.set(false);
  }

  protected async onProducerCreated(producerData: any): Promise<void> {
    try {
      const newProducer = await this.producersService.createProducer(producerData);
      this.closeProducerDialog();
      // Seleccionar automàticament el productor creat
      this.form.patchValue({ producer: newProducer });
    } catch (error) {
      console.error('Error creating producer:', error);
    }
  }
}

