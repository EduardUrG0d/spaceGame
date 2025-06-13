import * as PIXI from 'pixi.js';
import { Loader } from '@pixi/loaders';
import { SpaceObject, SpaceObjectType } from './Fruit';

const ASSETS = [
    'assets/space/background.png',
    'assets/space/meteor.png',
    'assets/space/mars.png',
    'assets/space/earth.png',
    'assets/space/blue.png',
    'assets/space/purple.png',
    'assets/space/sunny.png',
    'assets/space/blackHole.png',
];

function preloadAssets(onComplete: () => void) {
    const loader = Loader.shared;
    ASSETS.forEach(asset => loader.add(asset));
    const loadingText = document.createElement('div');
    loadingText.innerText = 'Загрузка...';
    loadingText.style.position = 'absolute';
    loadingText.style.top = '50%';
    loadingText.style.left = '50%';
    loadingText.style.transform = 'translate(-50%, -50%)';
    loadingText.style.color = '#fff';
    loadingText.style.fontSize = '32px';
    loadingText.id = 'preloader';
    document.body.appendChild(loadingText);
    loader.load(() => {
        document.getElementById('preloader')?.remove();
        onComplete();
    });
}

class Game {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private spaceObjects: SpaceObject[] = [];
    private currentObject: SpaceObject | null = null;
    private nextObjectType: SpaceObjectType = SpaceObjectType.METEOR;
    private gameWidth: number = 400;
    private gameHeight: number = 600;
    private walls: PIXI.Graphics = new PIXI.Graphics();
    private score: number = 0;
    private scoreText: PIXI.Text = new PIXI.Text('Score: 0', {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xFFFFFF,
    });
    private gameOver: boolean = false;
    private gameOverText: PIXI.Text = new PIXI.Text('GAME OVER', {
        fontFamily: 'Arial',
        fontSize: 48,
        fill: 0xFF0000,
    });

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
        this.createScoreText();
        this.init();
        this.setupGameLoop();
    }

    private createBackground(): void {
        const background = PIXI.Sprite.from('assets/space/background.png');
        background.width = this.gameWidth;
        background.height = this.gameHeight;
        this.container.addChild(background);
    }

    private createWalls(): void {
        this.walls = new PIXI.Graphics();
        this.walls.lineStyle(2, 0x4444FF); // Синие стены
        this.walls.drawRect(0, 0, this.gameWidth, this.gameHeight);
        this.container.addChild(this.walls);
    }

    private createScoreText(): void {
        this.scoreText.x = 10;
        this.scoreText.y = 10;
        this.container.addChild(this.scoreText);

        this.gameOverText.anchor.set(0.5);
        this.gameOverText.x = this.gameWidth / 2;
        this.gameOverText.y = this.gameHeight / 2;
        this.gameOverText.visible = false;
        this.container.addChild(this.gameOverText);
    }

    private init(): void {
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = this.app.screen;
        
        this.app.stage.on('pointerdown', this.onPointerDown.bind(this));
        this.app.stage.on('pointermove', this.onPointerMove.bind(this));
        this.app.stage.on('pointerup', this.onPointerUp.bind(this));

        this.createNewObject();
    }

    private getRandomBasicType(): SpaceObjectType {
        const basicTypes = [
            SpaceObjectType.METEOR,
            SpaceObjectType.MARS,
            SpaceObjectType.EARTH
        ];
        return basicTypes[Math.floor(Math.random() * basicTypes.length)];
    }

    private createNewObject(): void {
        const x = this.gameWidth / 2;
        const y = 50;
        this.currentObject = new SpaceObject(this.nextObjectType, x, y);
        this.currentObject.spaceObjects = this.spaceObjects; // Передаем список объектов
        this.container.addChild(this.currentObject.sprite);
        
        this.nextObjectType = this.getRandomBasicType();
    }

    private onPointerDown(event: PIXI.FederatedPointerEvent): void {
        if (this.currentObject && !this.gameOver) {
            this.currentObject.velocity.x = 0;
            this.currentObject.velocity.y = 0;
        }
    }

    private onPointerMove(event: PIXI.FederatedPointerEvent): void {
        if (this.currentObject && !this.gameOver) {
            this.currentObject.sprite.x = Math.max(30, Math.min(this.gameWidth - 30, event.globalX));
        }
    }

    private onPointerUp(): void {
        if (this.currentObject && !this.gameOver) {
            this.currentObject.velocity.y = 5;
            this.spaceObjects.push(this.currentObject);
            this.createNewObject();
        }
    }

    private checkCollisions(): void {
        for (let i = 0; i < this.spaceObjects.length; i++) {
            const obj1 = this.spaceObjects[i];
            
            // Проверка столкновения с другими объектами
            for (let j = i + 1; j < this.spaceObjects.length; j++) {
                const obj2 = this.spaceObjects[j];
                
                if (obj1.checkCollision(obj2)) {
                    if (obj1.canMerge(obj2)) {
                        this.mergeObjects(obj1, obj2);
                        break;
                    } else {
                        // Физика столкновения
                        const dx = obj2.sprite.x - obj1.sprite.x;
                        const dy = obj2.sprite.y - obj1.sprite.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const overlap = (obj1.radius + obj2.radius) - distance;
                        
                        if (overlap > 0) {
                            const nx = dx / distance;
                            const ny = dy / distance;
                            
                            // Разделяем объекты
                            const moveX = nx * overlap * 0.5;
                            const moveY = ny * overlap * 0.5;
                            
                            obj1.sprite.x -= moveX;
                            obj1.sprite.y -= moveY;
                            obj2.sprite.x += moveX;
                            obj2.sprite.y += moveY;
                            
                            // Обмен скоростями
                            const tempVx = obj1.velocity.x;
                            const tempVy = obj1.velocity.y;
                            obj1.velocity.x = obj2.velocity.x;
                            obj1.velocity.y = obj2.velocity.y;
                            obj2.velocity.x = tempVx;
                            obj2.velocity.y = tempVy;
                        }
                    }
                }
            }
        }
    }

    private mergeObjects(obj1: SpaceObject, obj2: SpaceObject): void {
        const nextType = obj1.getNextType();
        if (!nextType) return;

        const x = (obj1.sprite.x + obj2.sprite.x) / 2;
        const y = (obj1.sprite.y + obj2.sprite.y) / 2;

        const newObject = new SpaceObject(nextType, x, y);
        newObject.spaceObjects = this.spaceObjects;
        this.container.addChild(newObject.sprite);

        this.spaceObjects = this.spaceObjects.filter(obj => obj !== obj1 && obj !== obj2);
        this.container.removeChild(obj1.sprite);
        this.container.removeChild(obj2.sprite);

        this.spaceObjects.push(newObject);
        this.score += 10;
        this.scoreText.text = `Score: ${this.score}`;
    }

    private checkGameOver(): void {
        for (const obj of this.spaceObjects) {
            if (obj.sprite.y - obj.radius <= 0) {
                this.gameOver = true;
                this.gameOverText.visible = true;
                break;
            }
        }
    }

    private setupGameLoop(): void {
        this.app.ticker.add((delta) => {
            if (this.gameOver) return;

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

            this.checkCollisions();
            this.checkGameOver();
        });
    }
}

// Запуск с прелоадером
preloadAssets(() => {
    new Game();
}); 