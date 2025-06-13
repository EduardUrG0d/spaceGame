import * as PIXI from 'pixi.js';

export enum SpaceObjectType {
    METEOR = 'meteor',      // Метеорит (самый маленький)
    MARS = 'mars',         // Марс
    EARTH = 'earth',       // Земля
    PURPLE = 'purple',     // Фиолетовая планета
    BLUE = 'blue',         // Синяя планета
    SUNNY = 'sunny',       // Солнце
    BLACK_HOLE = 'blackHole' // Чёрная дыра (самый большой)
}

const MAX_OBJECT_SIZE_RATIO = 0.6; // 60% от ширины/высоты поля
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;

export class SpaceObject {
    public sprite: PIXI.Sprite;
    public type: SpaceObjectType;
    public radius: number;
    public velocity: { x: number; y: number };
    public isStatic: boolean;
    public rotation: number;
    public rotationSpeed: number;
    public spaceObjects?: SpaceObject[];
    public isMerging: boolean = false;
    private imageData: ImageData | null = null;
    private canvas: HTMLCanvasElement | null = null;
    public isReady: boolean = false;

    constructor(type: SpaceObjectType, x: number, y: number) {
        this.type = type;
        this.velocity = { x: 0, y: 0 };
        this.isStatic = false;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        
        this.sprite = PIXI.Sprite.from(`assets/space/${type}.png`);
        this.sprite.anchor.set(0.5);
        this.sprite.x = x;
        this.sprite.y = y;
        
        this.radius = this.getRadiusByType(type);
        let maxSize = Math.min(GAME_WIDTH, GAME_HEIGHT) * MAX_OBJECT_SIZE_RATIO / 2;
        if (this.radius > maxSize) this.radius = maxSize;
        this.sprite.width = this.radius * 2;
        this.sprite.height = this.radius * 2;

        // Pixel-perfect: создаём canvas и сохраняем imageData
        const resource: any = this.sprite.texture.baseTexture.resource;
        const url = resource.src || resource.url;
        if (url) {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.src = url;
            img.onload = () => {
                this.createImageData(img);
            };
            if (img.complete) {
                this.createImageData(img);
            }
        }
    }

    private createImageData(img: HTMLImageElement) {
        const w = this.sprite.width;
        const h = this.sprite.height;
        this.canvas = document.createElement('canvas');
        this.canvas.width = w;
        this.canvas.height = h;
        const ctx = this.canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            this.imageData = ctx.getImageData(0, 0, w, h);
            this.isReady = true;
        }
    }

    private getRadiusByType(type: SpaceObjectType): number {
        const baseRadius = 32;
        const typeOrder = Object.values(SpaceObjectType);
        const index = typeOrder.indexOf(type);
        return baseRadius * Math.pow(1.2, index);
    }

    public checkCollision(other: SpaceObject): boolean {
        if (!this.isReady || !other.isReady) return false;
        // Сначала быстрая проверка по окружностям
        const dx = this.sprite.x - other.sprite.x;
        const dy = this.sprite.y - other.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance >= (this.radius + other.radius)) return false;
        // Pixel-perfect
        return this.pixelPerfectCollision(other);
    }

    private pixelPerfectCollision(other: SpaceObject): boolean {
        if (!this.imageData || !other.imageData) return false;
        // Координаты верхнего левого угла каждого объекта
        const ax = this.sprite.x - this.radius;
        const ay = this.sprite.y - this.radius;
        const bx = other.sprite.x - other.radius;
        const by = other.sprite.y - other.radius;
        // Пересечение прямоугольников
        const left = Math.max(ax, bx);
        const right = Math.min(ax + this.sprite.width, bx + other.sprite.width);
        const top = Math.max(ay, by);
        const bottom = Math.min(ay + this.sprite.height, by + other.sprite.height);
        if (left >= right || top >= bottom) return false;
        // Проверяем каждый пиксель в зоне пересечения
        for (let y = top; y < bottom; y++) {
            for (let x = left; x < right; x++) {
                const aX = Math.floor(x - ax);
                const aY = Math.floor(y - ay);
                const bX = Math.floor(x - bx);
                const bY = Math.floor(y - by);
                const aIdx = (aY * this.sprite.width + aX) * 4 + 3;
                const bIdx = (bY * other.sprite.width + bX) * 4 + 3;
                if (
                    this.imageData.data[aIdx] > 10 &&
                    other.imageData.data[bIdx] > 10
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    public canMerge(other: SpaceObject): boolean {
        return this.type === other.type && !this.isMerging && !other.isMerging;
    }

    public getNextType(): SpaceObjectType | null {
        const types = Object.values(SpaceObjectType);
        const currentIndex = types.indexOf(this.type);
        return currentIndex < types.length - 1 ? types[currentIndex + 1] : null;
    }

    public update(delta: number): void {
        if (!this.isStatic) {
            this.velocity.y += 0.5 * delta;
            
            this.sprite.x += this.velocity.x * delta;
            this.sprite.y += this.velocity.y * delta;

            // Гарантируем, что объект не выходит за пределы поля
            this.sprite.x = Math.max(this.radius, Math.min(GAME_WIDTH - this.radius, this.sprite.x));
            this.sprite.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, this.sprite.y));

            this.rotation += this.rotationSpeed * delta;
            this.sprite.rotation = this.rotation;

            if (this.type === SpaceObjectType.BLACK_HOLE) {
                const scale = 1 + Math.sin(this.rotation * 2) * 0.1;
                this.sprite.scale.set(scale);
                
                this.spaceObjects?.forEach(other => {
                    if (other !== this && other.type !== SpaceObjectType.BLACK_HOLE) {
                        const dx = this.sprite.x - other.sprite.x;
                        const dy = this.sprite.y - other.sprite.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < 200) {
                            const force = 0.5 / (distance * distance);
                            other.velocity.x += dx * force;
                            other.velocity.y += dy * force;
                        }
                    }
                });
            }
        }
    }

    public setStatic(): void {
        this.isStatic = true;
        this.velocity = { x: 0, y: 0 };
        this.rotationSpeed = 0;
    }
} 