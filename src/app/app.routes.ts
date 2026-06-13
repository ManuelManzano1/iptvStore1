import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { AdminComponent } from './admin.component';
import { SuccessComponent } from './success.component';


export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'success', component: SuccessComponent },
  { path: '**', redirectTo: '' }
];
