export interface ComponentConfig {
  elementName: string;
  scriptUrl?: string; // Optional URL to load a standalone WC bundle
  remoteName?: string; // Optional: For Native Federation
  exposedModule?: string; // Optional: For Native Federation (e.g., './web-component')
  styles?: { [key: string]: string }; // e.g., gridArea, flexGrow, order, etc.
  config?: {
    [key: string]: any;    // Input properties/attributes for the web component
    innerLayout?: 'flex' | 'block'; // Layout for components sharing the same grid-area 
    innerLayoutStyles?: { [key: string]: string }; // Styles for the inner container (e.g., flex-direction, gap)
  };
}

export interface LayoutConfig {
  layout: 'grid' | 'flex' | string; // Layout type for the container
  containerStyles?: { [key: string]: string }; // Styles for the container (e.g., gridTemplateColumns, gap)
  components: ComponentConfig[];
} 