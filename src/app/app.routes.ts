import { Routes, UrlMatcher } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { WrapperComponent } from './wrapper/wrapper.component';
import { WrapperConfig } from './wrapper/wrapper-config';
// import { startsWith } from './starts-with';
import { DynamicPageComponent } from './components/dynamic-page/dynamic-page.component';


export const APP_ROUTES: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
  },
  {
    path: 'page/:pageId',
    component: DynamicPageComponent,
  },
  {
    path: 'mfe1',
    component: WrapperComponent,
    data: {
      config: {
        scriptUrl: 'http://127.0.0.1:8080/my-angular-element.js',
        elementName: 'my-angular-element',
      } as WrapperConfig,
    },
  },
  {
    path: 'mfe2',
    component: WrapperComponent,
    data: {
      config: {
        remoteName: 'mfe2',
        exposedModule: './web-component',
        elementName: 'mfe2-root',
      } as WrapperConfig,
    },
  },
  {
    path: '**',
    component: NotFoundComponent,
  },

  // DO NOT insert routes after this one.
  // { path:'**', ...} needs to be the LAST one.
];


