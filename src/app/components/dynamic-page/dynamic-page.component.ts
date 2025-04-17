import { Component, OnInit, OnDestroy, ElementRef, Renderer2, inject, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA, ViewChild } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Subscription, switchMap, tap, of, catchError, from, map } from 'rxjs';
import { DynamicLayoutService } from '../../services/dynamic-layout.service';
import { LayoutConfig, ComponentConfig } from '../../models/layout-config.model';
import { loadRemoteModule } from '@angular-architects/native-federation';

@Component({
  selector: 'app-dynamic-page',
  standalone: true,
  imports: [CommonModule],
  template: `<div *ngIf="isLoading">Loading page configuration...</div>
             <div *ngIf="error" class="error-message">Error: {{ error }}</div>
             <!-- Container for dynamically rendered elements -->
             <div #dynamicContainer></div>`,
  styleUrls: ['./dynamic-page.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DynamicPageComponent implements OnInit, OnDestroy {

  private route = inject(ActivatedRoute);
  private layoutService = inject(DynamicLayoutService);
  private elRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private cdr = inject(ChangeDetectorRef);
  private document = inject(DOCUMENT);

  @ViewChild('dynamicContainer') dynamicContainerRef!: ElementRef<HTMLDivElement>;

  private configSubscription: Subscription | undefined;
  private createdElements: HTMLElement[] = [];
  private loadedScriptUrls = new Set<string>();
  private loadedFederationModules = new Set<string>();

  isLoading = true;
  error: string | null = null;

  ngOnInit(): void {
    console.log('[DynamicPageComponent] ngOnInit: Initializing component.');
    console.log('[DynamicPageComponent] ngOnInit: layoutService instance:', this.layoutService);

    this.configSubscription = this.route.paramMap.pipe(
      tap(() => {
        console.log('[DynamicPageComponent] ngOnInit: paramMap changed, loading config...');
        this.isLoading = true;
        this.error = null;
        this.clearPageContent();
        this.cdr.detectChanges();
      }),
      switchMap((params: ParamMap) => {
        const pageId = params.get('pageId');
        console.log(`[DynamicPageComponent] ngOnInit: Extracted pageId: ${pageId}`);
        if (!pageId) {
          this.error = 'Page ID is missing in the URL.';
          this.isLoading = false;
          return of(null);
        }
        console.log('[DynamicPageComponent] ngOnInit: Calling layoutService.getPageConfig...');
        return this.layoutService.getPageConfig(pageId).pipe(
          catchError(err => {
            this.error = 'Failed to fetch page configuration.';
            console.error('[DynamicPageComponent] ngOnInit: Error fetching config:', err);
            this.isLoading = false;
            return of(null);
          })
        );
      })
    ).subscribe({
        next: async (config) => {
            console.log('[DynamicPageComponent] ngOnInit: Received config from service:', config);
            if (config) {
                try {
                  console.log('[DynamicPageComponent] ngOnInit: Loading component definitions...');
                  await this.loadComponentDefinitions(config.components);
                  console.log('[DynamicPageComponent] ngOnInit: Rendering page...');
                  this.renderPage(config);
                } catch (loadError) {
                  console.error('[DynamicPageComponent] ngOnInit: Error loading component definitions:', loadError);
                  this.error = 'Failed to load required page components.';
                  this.renderErrorState();
                }
            } else if (!this.error) {
                this.error = 'Page configuration not found or is invalid.';
                this.renderErrorState();
            }
            this.isLoading = false;
            this.cdr.detectChanges();
        },
        error: (err) => {
            console.error('[DynamicPageComponent] ngOnInit: Unexpected error in subscription pipe:', err);
            this.error = 'An unexpected error occurred during page load.';
            this.isLoading = false;
            this.renderErrorState();
            this.cdr.detectChanges();
        }
    });
  }

  ngOnDestroy(): void {
    this.configSubscription?.unsubscribe();
    this.clearPageContent();
  }

  private async loadComponentDefinitions(components: ComponentConfig[]): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    components.forEach(comp => {
      if (comp.remoteName && comp.exposedModule) {
        const federationKey = `${comp.remoteName}:${comp.exposedModule}`;
        if (!this.loadedFederationModules.has(federationKey)) {
            console.log(`Loading Federation module: ${federationKey}`);
            const loadFederationPromise: Promise<void> = from(loadRemoteModule({
                remoteName: comp.remoteName,
                exposedModule: comp.exposedModule
            })).pipe(
                tap(() => this.loadedFederationModules.add(federationKey)),
                catchError(err => {
                    console.error(`Failed to load Federation module ${federationKey}`, err);
                    throw new Error(`Failed to load module ${comp.elementName}`);
                }),
                map(() => void 0)
            ).toPromise();
            loadPromises.push(loadFederationPromise);
        }
      } else if (comp.scriptUrl) {
        if (!this.loadedScriptUrls.has(comp.scriptUrl)) {
          console.log(`Loading script: ${comp.scriptUrl}`);
          loadPromises.push(this.loadScript(comp.scriptUrl));
        }
      }
    });

    if (loadPromises.length > 0) {
        console.log(`Waiting for ${loadPromises.length} component definitions to load...`);
        await Promise.all(loadPromises);
        console.log('All component definitions loaded.');
    }
  }

  private loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = this.renderer.createElement('script');
      script.src = url;
      script.type = 'text/javascript';
      script.async = true;
      script.onload = () => {
        console.log(`Script loaded successfully: ${url}`);
        this.loadedScriptUrls.add(url);
        resolve();
      };
      script.onerror = (error: any) => {
        console.error(`Error loading script: ${url}`, error);
        reject(new Error(`Failed to load script ${url}`));
      };
      this.renderer.appendChild(this.document.body, script);
    });
  }

  private renderPage(config: LayoutConfig): void {
    const pageContainer = this.dynamicContainerRef.nativeElement;
    if (!pageContainer) {
        console.error('Dynamic container element reference not found via ViewChild!');
        this.error = 'Internal error: UI container missing.';
        this.renderErrorState();
        return;
    }
    this.clearPageContent(pageContainer);

    console.log('[DynamicPageComponent] Rendering page with config:', config);

    // Apply overall layout styles (e.g., grid) to the main page container
    this.renderer.setStyle(pageContainer, 'display', config.layout);
    if (config.containerStyles) {
      Object.entries(config.containerStyles).forEach(([styleProp, value]) => {
        if (styleProp.toLowerCase() !== 'display') {
          this.renderer.setStyle(pageContainer, styleProp, value);
        }
      });
    }

    // Group components by grid-area
    const componentsByArea: { [key: string]: ComponentConfig[] } = {};
    config.components.forEach(comp => {
      const area = comp.styles?.['grid-area'] || 'default'; // Use 'default' if no area specified
      if (!componentsByArea[area]) {
        componentsByArea[area] = [];
      }
      componentsByArea[area].push(comp);
    });

    console.log('[DynamicPageComponent] Components grouped by area:', componentsByArea);

    // Render components area by area
    Object.entries(componentsByArea).forEach(([areaName, componentsInArea]) => {
        if (componentsInArea.length === 1) {
            // Single component in area: render directly into page container
            const componentConf = componentsInArea[0];
            this.renderComponent(componentConf, pageContainer);
        } else {
            // Multiple components in area: create a wrapper div
            console.log(`[DynamicPageComponent] Creating wrapper for shared area: ${areaName}`);
            const wrapperDiv = this.renderer.createElement('div');

            // Apply grid-area style to the wrapper
            this.renderer.setStyle(wrapperDiv, 'grid-area', areaName);

            // Apply inner layout from the first component's config
            const firstCompConfig = componentsInArea[0].config;
            const innerLayout = firstCompConfig?.innerLayout || 'block'; // Default to block
            this.renderer.setStyle(wrapperDiv, 'display', innerLayout);
            console.log(`[DynamicPageComponent] Applying inner layout '${innerLayout}' to wrapper for area ${areaName}`);

            if (firstCompConfig?.innerLayoutStyles) {
                 console.log('[DynamicPageComponent] Applying inner layout styles:', firstCompConfig.innerLayoutStyles);
                 Object.entries(firstCompConfig.innerLayoutStyles).forEach(([styleProp, value]) => {
                    // Avoid overriding display set by innerLayout
                    if (styleProp.toLowerCase() !== 'display') {
                        this.renderer.setStyle(wrapperDiv, styleProp, value);
                    }
                 });
            }

            // Append wrapper to the main page container
            this.renderer.appendChild(pageContainer, wrapperDiv);
            this.createdElements.push(wrapperDiv); // Track the wrapper itself

            // Render components inside the wrapper, removing grid-area style
            componentsInArea.forEach(componentConf => {
                // Create a shallow copy of styles, removing grid-area
                const stylesWithoutArea = { ...(componentConf.styles || {}) };
                delete stylesWithoutArea['grid-area'];
                
                this.renderComponent({
                    ...componentConf,
                    styles: stylesWithoutArea // Use modified styles
                }, wrapperDiv); // Render into wrapper
            });
        }
    });
  }

  // Extracted component rendering logic into a helper method
  private renderComponent(componentConf: ComponentConfig, parentElement: HTMLElement): void {
      try {
         const isDefined = customElements.get(componentConf.elementName) || this.isNativeElement(componentConf.elementName);
         if (!isDefined) {
            console.warn(`Custom element <${componentConf.elementName}> not defined before creation attempt. Loading might have failed or is asynchronous.`);
         }

        const element = this.renderer.createElement(componentConf.elementName);
        console.log(`[DynamicPageComponent] Created element: <${componentConf.elementName}> and appending to:`, parentElement);

        // Apply styles (potentially without grid-area if rendered in a wrapper)
        if (componentConf.styles) {
          Object.entries(componentConf.styles).forEach(([styleProp, value]) => {
            this.renderer.setStyle(element, styleProp, value);
          });
        }

        // Apply config/properties
        if (componentConf.config) {
          Object.entries(componentConf.config).forEach(([propName, value]) => {
            // Skip internal layout properties when setting on the element itself
            if (['innerLayout', 'innerLayoutStyles'].includes(propName)) return; 

            if (['textContent', 'innerHTML'].includes(propName)) {
                 this.renderer.setProperty(element, propName, value);
            } else {
                 try {
                    this.renderer.setProperty(element, propName, value);
                    console.log(`[DynamicPageComponent] Set property '${propName}' on <${componentConf.elementName}>`);
                 } catch (propErr) {
                    console.warn(`[DynamicPageComponent] Could not set property '${propName}' on <${componentConf.elementName}>. Attempting attribute.`, propErr);
                    const attrValue = typeof value === 'string' ? value : JSON.stringify(value);
                    this.renderer.setAttribute(element, propName, attrValue);
                    console.log(`[DynamicPageComponent] Set attribute '${propName}' on <${componentConf.elementName}>`);
                }
            }
          });
        }

        this.renderer.appendChild(parentElement, element);
        this.createdElements.push(element); // Still track individual elements for cleanup

      } catch (creationError) {
        console.error(`[DynamicPageComponent] Error creating or configuring element <${componentConf.elementName}>:`, creationError);
      }
  }

  private renderErrorState(): void {
      const container = this.dynamicContainerRef?.nativeElement;
      if (!container) return;
      this.clearPageContent(container);
      const errorElement = this.renderer.createElement('div');
      this.renderer.addClass(errorElement, 'error-feedback');
      this.renderer.setProperty(errorElement, 'textContent', this.error || 'An unexpected error occurred while rendering the page.');
      this.renderer.appendChild(container, errorElement);
      this.createdElements.push(errorElement);
  }

  private clearPageContent(container?: HTMLElement): void {
    const targetContainer = container || this.dynamicContainerRef?.nativeElement;
    if (!targetContainer) {
        console.warn('[DynamicPageComponent] clearPageContent: Container not found.');
        return;
    }

    this.createdElements.forEach(el => {
        if (targetContainer.contains(el)) {
             this.renderer.removeChild(targetContainer, el);
        }
    });
    this.createdElements = [];
  }

  private isNativeElement(tagName: string): boolean {
      return this.document.createElement(tagName) instanceof HTMLUnknownElement === false;
  }
}
