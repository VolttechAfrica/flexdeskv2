export interface Set{
    key: string;
    value: string | object;
    ttl?: number;
}

export interface Get{
    key: string;
}
