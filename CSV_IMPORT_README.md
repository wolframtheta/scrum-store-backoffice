# Importador de Catálogo CSV

## Descripción

Módulo para importar artículos masivamente al catálogo desde archivos CSV.

## Flujo de Importación

### 1. Cargar Archivo CSV
- Selecciona un archivo CSV (máximo 10MB)
- El sistema detecta automáticamente columnas y filas

### 2. Mapear Columnas
El sistema intentará mapear automáticamente las columnas del CSV a los campos del artículo.
Puedes ajustar manualmente el mapeo si es necesario.

#### Campos requeridos:
- **Nom** (Nombre del artículo)
- **Preu** (Precio por unidad)
- **Unitat de mesura** (Unidad de medida)

#### Campos opcionales:
- Descripció
- Categoria
- Producte
- Varietat
- Ciutat
- Productor

#### Unidades de medida aceptadas:
El sistema normaliza automáticamente las siguientes unidades:
- `kg`, `kilo`, `kilos` → kg
- `g`, `grams`, `gramos` → g
- `l`, `litre`, `litres`, `litro`, `litros` → l
- `ml`, `millilitre`, `millilitres` → ml
- `cl`, `centilitre`, `centilitres` → cl
- `unit`, `unitat`, `unidad`, `u` → unit
- `manat`, `manats`, `bunch`, `bunches`, `manojo`, `manojos` → manat

### 3. Vista Previa e Importación
- Revisa los artículos que se van a importar
- El sistema valida cada artículo antes de la importación
- Los artículos con errores se muestran separadamente
- Haz clic en "Importar" para crear los artículos en el catálogo

## Archivo de Ejemplo

Hay un archivo de ejemplo en: `public/example-catalog.csv`

### Estructura del CSV de ejemplo:

```csv
nom,descripció,categoria,producte,varietat,unitat,preu,ciutat,productor
Tomàquet ecològic,Tomàquet de proximitat,Verdures,Tomàquet,Raf,kg,3.50,Barcelona,Can Tomàs
Enciam fresc,Enciam de temporada,Verdures,Enciam,Batavia,unitat,1.20,Girona,Hort del Pep
```

## Validaciones

El sistema realiza las siguientes validaciones:

1. **Nombre**: Obligatorio
2. **Precio**: Obligatorio, debe ser un número válido > 0
3. **Unidad de medida**: Obligatoria, debe ser una unidad válida
4. **Formato de precio**: Acepta tanto punto como coma decimal (3.50 o 3,50)

## Consejos

- Asegúrate de que los nombres de las columnas sean descriptivos
- El auto-mapeo funciona mejor con nombres en catalán, español o inglés
- Puedes incluir columnas adicionales en el CSV, solo se importarán las mapeadas
- Las filas vacías se ignoran automáticamente
- Los artículos se importan al grupo de consumo seleccionado actualmente



