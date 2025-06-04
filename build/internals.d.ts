export declare const bus: {
    override: (key: string, value: any) => Map<string, any>;
    store: Map<string, any>;
    wrap: <T extends object>(name: string, api: T) => T;
};
