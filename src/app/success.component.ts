import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './success.component.html',
  styleUrl: './success.component.css'
})
export class SuccessComponent {
  orderId = '';

  constructor(route: ActivatedRoute, private http: HttpClient) {
    route.queryParamMap.subscribe((params) => {
      this.orderId = params.get('orderId') || '';
    // 1. Capturar el orderId que PayPal inyectó en la URL de retorno
    route.queryParams.subscribe(params => {
      const orderId = params['orderId'];
      
        // 2. Avisar al Backend para que libere y envíe los correos
        this.http.post('http://localhost:3000/back/orders/confirm', { orderId })
          .subscribe({
            next: (res: any) => console.log('Correos enviados con éxito:', res),
            error: (err) => console.error('Error al confirmar la orden:', err)
          });
      
    });
    });
  }
}
