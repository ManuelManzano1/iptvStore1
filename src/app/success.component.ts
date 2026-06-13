import { CommonModule } from '@angular/common';
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

  constructor(route: ActivatedRoute) {
    route.queryParamMap.subscribe((params) => {
      this.orderId = params.get('orderId') || '';
    });
  }
}
