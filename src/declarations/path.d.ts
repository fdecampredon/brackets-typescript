declare module "path" {
    export function normalize(p: string): string;
    export function join(...paths: any[]): string;
    export function resolve(from: string, to: string): string;
    export function resolve(from: string, from2: string, to: string): string;
    export function resolve(from: string, from2: string, from3: string, to: string): string;
    export function resolve(from: string, from2: string, from3: string, from4: string, to: string): string;
    export function resolve(from: string, from2: string, from3: string, from4: string, from5: string, to: string): string;
    export function relative(from: string, to: string): string;
    export function dirname(p: string): string;
    export function basename(p: string, ext?: string): string;
    export function extname(p: string): string;
    export var sep: string;
}
