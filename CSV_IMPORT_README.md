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
- Opcions de personalització (JSON)

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
5. **Opciones de personalización**: Si se proporciona, debe ser un JSON válido con la estructura correcta

## Opciones de Personalización

Puedes añadir opciones de personalización a los artículos mediante una columna con formato JSON.

### Estructura del JSON

```json
[
  {
    "id": "opt-1",
    "title": "Opció de exemple",
    "type": "boolean|numeric|string|select|multiselect",
    "required": false,
    "price": 0.50,
    "values": [
      {
        "id": "val-1",
        "label": "Valor 1",
        "price": 1.50
      }
    ]
  }
]
```

### Tipos de opciones

1. **boolean**: Opción sí/no (checkbox)
   - Ejemplo: ¿Ecológico?
   - No requiere `values`

2. **numeric**: Campo numérico
   - Ejemplo: Cantidad adicional
   - No requiere `values`

3. **string**: Campo de texto libre
   - Ejemplo: Instrucciones especiales
   - No requiere `values`

4. **select**: Selección única (dropdown)
   - Ejemplo: Tamaño (S, M, L, XL)
   - Requiere `values`

5. **multiselect**: Selección múltiple
   - Ejemplo: Ingredientes extras
   - Requiere `values`

### Campos de cada opción

- **id** (obligatorio): Identificador único de la opción
- **title** (obligatorio): Título que se muestra al usuario
- **type** (obligatorio): Tipo de opción (ver tipos arriba)
- **required** (opcional): Si la opción es obligatoria (true/false)
- **price** (opcional): Precio adicional cuando se activa/selecciona
- **values** (obligatorio para select/multiselect): Array de valores posibles

### Ejemplo de CSV con personalización

```csv
nom,preu,unitat,personalitzacions
"Tomàquet Cherry",3.50,kg,"[{""id"":""eco"",""title"":""Ecològic"",""type"":""boolean"",""price"":0.50}]"
"Enciam",1.20,unitat,"[{""id"":""size"",""title"":""Mida"",""type"":""select"",""values"":[{""id"":""s"",""label"":""Petit"",""price"":0},{""id"":""l"",""label"":""Gran"",""price"":0.30}]}]"
```

**Nota importante**: En CSV, las comillas dobles dentro del JSON deben escaparse duplicándolas (`""`).

## Consejos

- Asegúrate de que los nombres de las columnas sean descriptivos
- El auto-mapeo funciona mejor con nombres en catalán, español o inglés
- Puedes incluir columnas adicionales en el CSV, solo se importarán las mapeadas
- Las filas vacías se ignoran automáticamente
- Los artículos se importan al grupo de consumo seleccionado actualmente



