import { Component, NgZone, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [
    RouterModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'shell';

  constructor() {
    (globalThis as any).ngZone = inject(NgZone);
  }
}

