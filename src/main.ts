import * as PIXI from 'pixi.js';
import { SpaceObject, SpaceObjectType } from './Fruit';

class Game {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private spaceObjects: SpaceObject[] = [];
    private currentObject: SpaceObject | null = null;
    private nextObjectType: SpaceObjectType = SpaceObjectType.METEOR;
    private gameWidth: number = 400;
    private gameHeight: number = 600;
    private walls: PIXI.Graphics = new PIXI.Graphics();

    constructor() {
        this.app = new PIXI.Application({
            width: this.gameWidth,
            height: this.gameHeight,
            backgroundColor: 0x000033, // Тёмно-синий фон для космоса
        });
        document.body.appendChild(this.app.view as HTMLCanvasElement);

        this.container = new PIXI.Container();
        this.app.stage.addChild(this.container);

        this.createBackground();
        this.createWalls();
        this.init();
        this.setupGameLoop();
    }

    private createBackground(): void {
        // Создаем звёздное небо
        const stars = new PIXI.Graphics();
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.gameWidth;
            const y = Math.random() * this.gameHeight;
            const size = Math.random() * 2;
            stars.beginFill(0xFFFFFF);
            stars.drawCircle(x, y, size);
            stars.endFill();
        }
        this.container.addChild(stars);
    }

    private createWalls(): void {
        this.walls = new PIXI.Graphics();
        this.walls.lineStyle(2, 0x4444FF); // Синие стены
        this.walls.drawRect(0, 0, this.gameWidth, this.gameHeight);
        this.container.addChild(this.walls);
    }

    private init(): void {
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = this.app.screen;
        
        this.app.stage.on('pointerdown', this.onPointerDown.bind(this));
        this.app.stage.on('pointermove', this.onPointerMove.bind(this));
        this.app.stage.on('pointerup', this.onPointerUp.bind(this));

        this.createNewObject();
    }

    private createNewObject(): void {
        const x = this.gameWidth / 2;
        const y = 50;
        this.currentObject = new SpaceObject(this.nextObjectType, x, y);
        this.currentObject.spaceObjects = this.spaceObjects; // Передаем список объектов
        this.container.addChild(this.currentObject.sprite);
        
        // Выбираем следующий объект случайным образом
        const types = Object.values(SpaceObjectType);
        this.nextObjectType = types[Math.floor(Math.random() * types.length)];
    }

    private onPointerDown(event: PIXI.FederatedPointerEvent): void {
        if (this.currentObject) {
            this.currentObject.velocity.x = 0;
            this.currentObject.velocity.y = 0;
        }
    }

    private onPointerMove(event: PIXI.FederatedPointerEvent): void {
        if (this.currentObject) {
            this.currentObject.sprite.x = Math.max(30, Math.min(this.gameWidth - 30, event.globalX));
        }
    }

    private onPointerUp(): void {
        if (this.currentObject) {
            this.currentObject.velocity.y = 5;
            this.spaceObjects.push(this.currentObject);
            this.createNewObject();
        }
    }

    private setupGameLoop(): void {
        this.app.ticker.add((delta) => {
            this.spaceObjects.forEach(object => {
                object.update(delta);

                // Проверка столкновения со стенами
                if (object.sprite.x - object.radius < 0) {
                    object.sprite.x = object.radius;
                    object.velocity.x *= -0.5;
                } else if (object.sprite.x + object.radius > this.gameWidth) {
                    object.sprite.x = this.gameWidth - object.radius;
                    object.velocity.x *= -0.5;
                }

                // Проверка столкновения с полом
                if (object.sprite.y + object.radius > this.gameHeight) {
                    object.sprite.y = this.gameHeight - object.radius;
                    object.velocity.y *= -0.5;
                    if (Math.abs(object.velocity.y) < 1) {
                        object.setStatic();
                    }
                }
            });
        });
    }
}

// Запуск игры
new Game(); 