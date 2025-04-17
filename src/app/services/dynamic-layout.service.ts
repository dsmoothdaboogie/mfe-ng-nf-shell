import { Injectable } from '@angular/core';
import { Observable, of, map, catchError, from, switchMap } from 'rxjs';
import { LayoutConfig } from '../models/layout-config.model';

@Injectable({
  providedIn: 'root'
})
export class DynamicLayoutService {

  constructor() {
    console.log('[DynamicLayoutService] Constructor: Using fetch API.');
  }

  private configBasePath = '/assets/page-configs';

  getPageConfig(pageId: string): Observable<LayoutConfig | null> {
    const validPageIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPageIdPattern.test(pageId)) {
      console.error(`[DynamicLayoutService] Invalid pageId format: ${pageId}`);
      return of(null);
    }

    const configUrl = `${this.configBasePath}/${pageId}.json`;
    console.log(`[DynamicLayoutService] Fetching layout config using fetch from: ${configUrl}`);

    return from(fetch(configUrl)).pipe(
      switchMap(response => {
        if (!response.ok) {
          console.error(`[DynamicLayoutService] Fetch error! Status: ${response.status}`);
          throw new Error(`Failed to fetch config: ${response.statusText}`);
        }
        return from(response.json());
      }),
      map((config: any) => {
        if (!config || !config.layout || !Array.isArray(config.components)) {
            console.error('[DynamicLayoutService] Invalid config structure received (fetch):', config);
            return null;
        }
        console.log('[DynamicLayoutService] Successfully received and parsed config (fetch):', config);
        return config as LayoutConfig;
      }),
      catchError(error => {
        console.error(`[DynamicLayoutService] Error in fetch/parsing layout config for pageId '${pageId}' (fetch):`, error);
        return of(null);
      })
    );
  }

  // --- Mock data implementation (keep for reference or quick testing) ---
  // getPageConfig_Mock(pageId: string): Observable<LayoutConfig | null> {
  //   console.log(`Getting mock config for pageId: ${pageId}`);
  //   let mockConfig: LayoutConfig | null = null;

  //   // Example configurations based on pageId
  //   if (pageId === 'home') {
  //     mockConfig = {
  //       layout: 'grid',
  //       containerStyles: {
  //         'display': 'grid',
  //         'gridTemplateColumns': '1fr 1fr',
  //         'gridTemplateAreas': `'header header'
  //                             'sidebar main'
  //                             'footer footer'`,
  //         'gap': '1rem',
  //         'padding': '1rem'
  //       },
  //       components: [
  //         {
  //           elementName: 'app-header', // Assuming an app-header component/element exists
  //           styles: { 'grid-area': 'header' },
  //           config: { title: 'Dynamic Home Page' }
  //         },
  //         {
  //           elementName: 'app-sidebar',
  //           styles: { 'grid-area': 'sidebar' }
  //         },
  //         {
  //           elementName: 'app-content-area', // Another hypothetical element
  //           styles: { 'grid-area': 'main' },
  //           config: { contentId: 'home-main-content' }
  //         },
  //         {
  //           elementName: 'mfe1-root', // Example using an MFE element tag
  //           styles: { 'grid-area': 'footer' },
  //         }
  //       ]
  //     };
  //   } else if (pageId === 'profile') {
  //       mockConfig = {
  //         layout: 'flex',
  //         containerStyles: {
  //           'display': 'flex',
  //           'flexDirection': 'column',
  //           'gap': '0.5rem'
  //         },
  //         components: [
  //           { elementName: 'profile-header', styles: { 'order': '1' }, config: { userId: '123' }},
  //           { elementName: 'profile-details', styles: { 'order': '2' }},
  //           { elementName: 'profile-actions', styles: { 'order': '3' }}
  //         ]
  //       };
  //   }

  //   return of(mockConfig);
  // }
}
