import { Injectable } from '@angular/core';

export interface CsvData {
  headers: string[];
  rows: any[][];
  rowsAsObjects: Record<string, any>[];
}

@Injectable({
  providedIn: 'root',
})
export class CsvParserService {
  parseFile(file: File): Promise<CsvData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event: ProgressEvent<FileReader>) => {
        try {
          const text = event.target?.result as string;
          const data = this.parseText(text);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Error llegint fitxer'));
      reader.readAsText(file);
    });
  }

  private parseText(text: string): CsvData {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length === 0) {
      throw new Error('El fitxer CSV està buit');
    }

    // Parse headers
    const headers = this.parseLine(lines[0]);

    // Parse rows
    const rows: any[][] = [];
    const rowsAsObjects: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseLine(lines[i]);
      rows.push(row);

      // Create object representation
      const rowObj: Record<string, any> = {};
      headers.forEach((header, index) => {
        rowObj[header] = row[index] || '';
      });
      rowsAsObjects.push(rowObj);
    }

    return { headers, rows, rowsAsObjects };
  }

  private parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === ';') && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());

    return result;
  }
}



