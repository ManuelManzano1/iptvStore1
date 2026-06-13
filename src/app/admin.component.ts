import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  visits = 0;
  orders: Array<{ email: string; duration: number; categories: string[]; total: number; createdAt: string }> = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadAdminData();
  }

  loadAdminData() {
    this.http.get<{ visits: number; orders: any[] }>('/back/admin').subscribe({
      next: (response) => {
        this.visits = response.visits;
        this.orders = response.orders || [];
      },
      error: () => {
        this.visits = 0;
        this.orders = [];
      }
    });
  }

  getTotalRevenue(): number {
    return this.orders.reduce((total, order) => total + order.total, 0);
  }
}
