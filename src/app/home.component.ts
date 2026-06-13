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
  nationalCategories: CategoryOption[] = [
    { key: 'futbol_deportes', label: 'Pack Fútbol y Deportes' },
    { key: 'documentales_cine', label: 'Pack Documentales y Cine' },
    { key: 'tdt', label: 'TDT' }
  ];

  internationalCategories: CategoryOption[] = [
    { key: 'france', label: '🇫🇷 Francia' },
    { key: 'italy', label: '🇮🇹 Italia' },
    { key: 'england', label: '🇬🇧 Inglaterra' },
    { key: 'usa', label: '🇺🇸 Estados Unidos' }
  ];

  activeTab: 'national' | 'international' = 'national';

  get categories(): CategoryOption[] {
    return this.activeTab === 'national' ? this.nationalCategories : this.internationalCategories;
  }

  durationOptions = [
    { value: 1, label: '1 mes', originalPrice: '12 €', discountedPrice: '1 €' },
    { value: 3, label: '3 meses', originalPrice: '30 €', discountedPrice: '25 €' },
    { value: 6, label: '6 meses', originalPrice: '45 €', discountedPrice: '40 €' }
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
    return this.duration === 1 ? 10 : this.duration === 3 ? 25 : 40;
  }

  updateTotal() {
    this.total = this.getBasePrice();
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
