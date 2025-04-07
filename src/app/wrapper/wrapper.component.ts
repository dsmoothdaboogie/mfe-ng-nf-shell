import { ActivatedRoute } from '@angular/router';
import { Component, ElementRef, Input, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { loadRemoteModule } from '@softarc/native-federation-runtime';
import { WrapperConfig, initWrapperConfig } from './wrapper-config';

@Component({
  selector: 'app-wrapper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wrapper.component.html',
  styleUrls: ['./wrapper.component.css']
})
export class WrapperComponent implements OnInit, OnDestroy {
  elm = inject(ElementRef);
  renderer = inject(Renderer2);
  route = inject(ActivatedRoute);

  config: WrapperConfig = initWrapperConfig;
  private createdElement: HTMLElement | null = null;

  ngOnInit() {
    this.route.data.subscribe(data => {
      const routeConfig = data['config'] as WrapperConfig;
      if (routeConfig) {
        this.config = routeConfig;
        this.loadComponent();
      }
    });
  }

  async loadComponent() {
    const { remoteName, exposedModule, elementName, scriptUrl } = this.config;

    if (scriptUrl) {
      this.loadScript(scriptUrl)
        .then(() => this.renderElement(elementName))
        .catch(err => console.error('Error loading script:', scriptUrl, err));
    } else if (remoteName && exposedModule) {
      try {
        await loadRemoteModule(remoteName, exposedModule);
        this.renderElement(elementName);
      } catch (err) {
        console.error('Error loading remote module:', remoteName, exposedModule, err);
      }
    } else {
      console.error('Invalid WrapperConfig provided:', this.config);
    }
  }

  private loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptId = `script-${url.replace(/[^a-zA-Z0-9]/g, '-')}`;
      if (document.getElementById(scriptId)) {
        resolve();
        return;
      }

      const script = this.renderer.createElement('script');
      script.id = scriptId;
      script.src = url;
      script.type = 'text/javascript';
      script.onload = () => resolve();
      script.onerror = (error: any) => reject(error);
      this.renderer.appendChild(document.body, script);
    });
  }

  private renderElement(elementName: string) {
    this.cleanupElement();

    this.createdElement = this.renderer.createElement(elementName);
    this.renderer.appendChild(this.elm.nativeElement, this.createdElement);
  }

  ngOnDestroy() {
    this.cleanupElement();
  }

  private cleanupElement() {
    if (this.createdElement) {
      this.renderer.removeChild(this.elm.nativeElement, this.createdElement);
      this.createdElement = null;
    }
  }
}
