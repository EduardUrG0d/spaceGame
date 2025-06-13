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

    constructor(type: SpaceObjectType, x: number, y: number) {
        this.type = type;
        this.velocity = { x: 0, y: 0 };
        this.isStatic = false;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02; // Случайное вращение
        
        // Создаем спрайт
        this.sprite = PIXI.Sprite.from(`assets/space/${type}.png`);
        this.sprite.anchor.set(0.5);
        this.sprite.x = x;
        this.sprite.y = y;
        
        // Устанавливаем размер в зависимости от типа объекта
        this.radius = this.getRadiusByType(type);
        this.sprite.width = this.radius * 2;
        this.sprite.height = this.radius * 2;
    }

    private getRadiusByType(type: SpaceObjectType): number {
        const baseRadius = 32; // Базовый радиус для метеорита
        const typeOrder = Object.values(SpaceObjectType);
        const index = typeOrder.indexOf(type);
        return baseRadius * Math.pow(1.2, index); // Увеличиваем радиус на 20% для каждого следующего объекта
    }

    public checkCollision(other: SpaceObject): boolean {
        const dx = this.sprite.x - other.sprite.x;
        const dy = this.sprite.y - other.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.radius + other.radius);
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
            // Применяем гравитацию
            this.velocity.y += 0.5 * delta;
            
            // Обновляем позицию
            this.sprite.x += this.velocity.x * delta;
            this.sprite.y += this.velocity.y * delta;

            // Обновляем вращение
            this.rotation += this.rotationSpeed * delta;
            this.sprite.rotation = this.rotation;

            // Специальные эффекты для чёрной дыры
            if (this.type === SpaceObjectType.BLACK_HOLE) {
                // Пульсация размера
                const scale = 1 + Math.sin(this.rotation * 2) * 0.1;
                this.sprite.scale.set(scale);
                
                // Добавляем гравитационное притяжение к другим объектам
                this.spaceObjects?.forEach(other => {
                    if (other !== this && other.type !== SpaceObjectType.BLACK_HOLE) {
                        const dx = this.sprite.x - other.sprite.x;
                        const dy = this.sprite.y - other.sprite.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < 200) { // Радиус действия гравитации
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