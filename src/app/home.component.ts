import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface CategoryOption {
  key: string;
  label: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  categories: CategoryOption[] = [
    { key: 'movistar_futbol', label: 'Movistar Fútbol' },
    { key: 'movistar_deportes', label: 'Movistar Deportes' },
    { key: 'dazn_futbol', label: 'DAZN Fútbol' },
    { key: 'dazn_deportes', label: 'DAZN Deportes' },
    { key: 'documentales', label: 'Documentales' },
    { key: 'cine_series', label: 'Cine y series' },
    { key: 'tdt', label: 'TDT' }
  ];

  durationOptions = [
    { value: 1, label: '1 mes', hint: '15 €' },
    { value: 3, label: '3 meses', hint: '40 €' },
    { value: 6, label: '6 meses', hint: '75 €' }
  ];

  selectedCategories: string[] = [];
  email = '';
  duration = 3;
  total = 0;
  visits = 0;
  isSubmitting = false;
  message = '';
  isError = false;

  constructor(private http: HttpClient) {
    this.updateTotal();
    this.loadVisits();
  }

  getBasePrice(): number {
    return this.duration === 1 ? 15 : this.duration === 3 ? 40 : 75;
  }

  updateTotal() {
    const base = this.getBasePrice();
    const extra = this.selectedCategories.length * 3;
    this.total = base + extra;
  }

  toggleCategory(category: string, checked: boolean) {
    const index = this.selectedCategories.indexOf(category);
    if (checked && index === -1) {
      this.selectedCategories.push(category);
    }
    if (!checked && index !== -1) {
      this.selectedCategories.splice(index, 1);
    }
    this.updateTotal();
  }

  loadVisits() {
    this.http.get<{ count: number }>('/back/visit').subscribe({
      next: (response) => {
        this.visits = response.count;
      },
      error: () => {
        this.visits = 0;
      }
    });
  }

  submitOrder() {
    this.message = '';
    this.isError = false;

    if (!this.email || !this.email.includes('@')) {
      this.message = 'Ingresa un email válido para recibir los datos de conexión.';
      this.isError = true;
      return;
    }

    if (this.selectedCategories.length === 0) {
      this.message = 'Selecciona al menos una categoría para continuar.';
      this.isError = true;
      return;
    }

    this.isSubmitting = true;

    const body = {
      email: this.email,
      duration: this.duration,
      categories: this.selectedCategories,
      total: this.total
    };

    this.http.post<{ redirectUrl: string }>('/back/orders', body).subscribe({
      next: (response) => {
        window.location.href = response.redirectUrl;
      },
      error: (error) => {
        this.isSubmitting = false;
        this.isError = true;
        this.message = error?.error?.error || 'No se pudo iniciar el pago. Intenta de nuevo más tarde.';
      }
    });
  }
}
