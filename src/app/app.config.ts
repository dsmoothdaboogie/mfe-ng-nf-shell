import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
// Restore provideHttpClient import and call
// import { DynamicLayoutService } from './services/dynamic-layout.service'; 

import { APP_ROUTES } from './app.routes';
// Service is providedIn: 'root', no need to import or list here

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(APP_ROUTES, withComponentInputBinding()),
    provideHttpClient(withInterceptorsFromDi())
    // DynamicLayoutService // Removed because it's providedIn: 'root'
  ]
}; 