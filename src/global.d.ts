// src/global.d.ts
import { NgZone } from '@angular/core';

declare global {
  interface GlobalThis {
    ngZone?: NgZone;
  }
}

export {};