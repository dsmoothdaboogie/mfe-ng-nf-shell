export interface WrapperConfig {
    remoteName?: string;
    exposedModule?: string;
    scriptUrl?: string;
    elementName: string;
}

export const initWrapperConfig: WrapperConfig = {
    remoteName: undefined,  
    exposedModule: undefined,
    scriptUrl: undefined,
    elementName: '',
}