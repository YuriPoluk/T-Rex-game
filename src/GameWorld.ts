import {WorldObject, WorldObjectTypes} from "./WorldObject";
import {Dino, DinoStates} from "./Dino";
import {CollisionBox} from "./CollisionBoxes";
import * as Utils from "./Utils";
import sound from 'pixi-sound';
import FloorTile from './FloorTile';
import Cloud from './Cloud';
import Obstacle from './Obstacle';

export default class GameWorld extends PIXI.Container {
    floorTiles: FloorTile[] = []
    skyObjects: Cloud[] = [];
    obstacles: Obstacle[] = [];
    allObjectsArrays: [FloorTile[], Cloud[], Obstacle[]]= [this.floorTiles, this.skyObjects, this.obstacles];
    score = 0;
    scoreFloored = 0;
    lastScoreUp = 0;

    TILE_WIDTH = 200;
    FLOOR_TILES_QUANTITY = 5;
    HEIGHT = 160;
    WIDTH = this.FLOOR_TILES_QUANTITY * this.TILE_WIDTH;
    PLAYER_MOVE_SPEED = 0.29;
    SPEED_INCREASE_STEP = 0.05;
    PLAYER_MOVE_SPEED_MAX = 0.6;
    FLOOR_Y = this.HEIGHT - 2;
    JUMP_HEIGHT_MAX = 50;
    GRAV_ACCEL = 0.01;

    IS_TOUCH_ENABLED = ('ontouchstart' in window);

    isGameOver = false;
    isGameStarted = false;
    isJumpKeyPressed = false;
    isCrouchKeyPressed = false;

    worldCnt = this.addChild(new PIXI.Container());
    playerCnt = this.addChild(new PIXI.Container());
    dino!: Dino;

    constructor() {
        super();
        this.initWorld();
        this.initControls();
    }

    initControls(): void {
        if(this.IS_TOUCH_ENABLED) {
            const eventDown = new KeyboardEvent('keydown', { key: ' ' });
            const eventUp = new KeyboardEvent('keyup', { key: ' ' });
            document.addEventListener('pointerdown', ()=>{ this.handleControls(eventDown) });
            document.addEventListener('pointerup', ()=>{ this.handleControls(eventUp) });
        }
        else {
            document.addEventListener('keydown', this.handleControls.bind(this));
            document.addEventListener('keyup', this.handleControls.bind(this));
        }
    }

    handleControls(kbEvent: KeyboardEvent): void {
        const type = kbEvent.type;
        const input = kbEvent.key;


        if(input == ' ') {
            this.isJumpKeyPressed = type == 'keydown';
        }
        if(input == 'Control') {
            this.isCrouchKeyPressed = type == 'keydown';
        }

        switch(this.dino.state) {
            case DinoStates.RUN:
                if(input == ' ') {
                    if(type == 'keydown') {
                        this.dino.jump();
                    }
                }
                else if(input == 'Control') {
                    if(type == 'keydown') {
                        this.dino.crouch();
                    }
                }
                break;
            case DinoStates.CROUCH:
                if(input == ' ') {
                    if(type == 'keydown') {
                        this.dino.run();
                    }
                }
                else if(input == 'Control') {
                    if(type == 'keyup') {
                        this.dino.run();
                    }
                }
                break;
            case DinoStates.STAND:
                if(input == ' ') {
                    if(type == 'keydown') {
                        this.dino.jump();
                    }
                }
                break;
        }
    }

    initWorld(): void {
        this.dino = this.playerCnt.addChild(new Dino());
        this.dino.position.set(100, this.FLOOR_Y);

        for(let i = 0; i < this.FLOOR_TILES_QUANTITY; i++) {
            this.spawnWorldObject(WorldObjectTypes.FLOOR_TILE);
        }
        this.spawnWorldObject(WorldObjectTypes.OBSTACLE);
        this.spawnWorldObject(WorldObjectTypes.OBSTACLE);
        this.spawnWorldObject(WorldObjectTypes.OBSTACLE);
        this.spawnWorldObject(WorldObjectTypes.OBSTACLE);
        this.spawnWorldObject(WorldObjectTypes.CLOUD);
        this.spawnWorldObject(WorldObjectTypes.CLOUD);

        this.obstacles[0].x = this.WIDTH*0.6;
        this.obstacles[1].x = this.WIDTH*0.9;
        this.obstacles[2].x = this.WIDTH*1.2;
    }

    spawnWorldObject(type: WorldObjectTypes, posX?: number): void {

        if(type == WorldObjectTypes.FLOOR_TILE) {
            const tile = this.worldCnt.addChild(FloorTile.getRandomObj());
            const lastTilePosX = this.floorTiles.length > 0 ? this.floorTiles[this.floorTiles.length - 1].x : -this.TILE_WIDTH/2;

            tile.position.set(lastTilePosX + tile.view.width, this.HEIGHT - tile.view.height/2);
            this.floorTiles.push(tile);
        }
        else if(type == WorldObjectTypes.CLOUD) {
            const cloud = this.worldCnt.addChild(Cloud.getRandomObj());
            const position = posX || this.WIDTH + cloud.view.width;
            cloud.position.set(position, this.HEIGHT * 0.1);
            this.skyObjects.push(cloud);

        }
        else if(type == WorldObjectTypes.OBSTACLE) {
            let newObstacle: Obstacle;
            let lastObstacle = this.obstacles[this.obstacles.length - 1];

            if(!lastObstacle) {
                newObstacle = this.worldCnt.addChild(Obstacle.getRandomObj(true));
                newObstacle.position.set(this.WIDTH + newObstacle.view.width / 2, this.HEIGHT - newObstacle.view.height/2);
            }
            else {
                let lastObstacleSubtype = lastObstacle?.getSubtype();

                //choose subtype of next obstacle. Bird can spawn only after cactus
                if(lastObstacleSubtype == 'bird')
                    newObstacle = this.worldCnt.addChild(Obstacle.getRandomObj(true));
                else
                    newObstacle = this.worldCnt.addChild(Obstacle.getRandomObj());

                let newObstacleSubtype = newObstacle.getSubtype();
                let posX;

                if(lastObstacleSubtype == 'cactus' && newObstacleSubtype == 'cactus') {
                    const leftEdge = Math.max(this.WIDTH, lastObstacle.y + this.dino.viewRun.width*3);
                    posX = Utils.randomFloat(leftEdge, leftEdge + this.dino.currentView.width*2);
                }
                else if(lastObstacleSubtype !== 'bird' || newObstacleSubtype !== 'bird') {
                    let posXAfterLastObs = lastObstacle.y + this.dino.currentView.width;
                    if(posXAfterLastObs > this.WIDTH) {
                        let potentialPositions = [posXAfterLastObs, Utils.randomFloat(this.WIDTH + newObstacle.view.width/2, this.WIDTH + this.dino.currentView.width*2)];
                        posX = potentialPositions[Math.ceil(Math.random())];
                    }
                    else
                        posX = Utils.randomFloat(this.WIDTH + newObstacle.view.width/2, this.WIDTH + this.dino.currentView.width*2);
                }

                if(newObstacle.framesList[0] == 'bird_1')
                    newObstacle.position.set(posX, this.HEIGHT * 0.05 + Math.random()*this.HEIGHT * 0.1);
                else
                    newObstacle.position.set(posX, this.HEIGHT - newObstacle.view.height/2);
            }

            this.obstacles.push(newObstacle);
        }
    }

    destroyGarbageObjects(): void {
        let garbageObjects: WorldObject[] = [];
        for(let i = 0; i < this.allObjectsArrays.length; i++) {
            garbageObjects = [...garbageObjects, ...this.allObjectsArrays[i].filter(e => e.isGarbage)];
            this.allObjectsArrays[i] = this.allObjectsArrays[i].filter(e => !e.isGarbage);
        }

        [ this.floorTiles, this.skyObjects, this.obstacles ] = this.allObjectsArrays;

        for(const obj of garbageObjects) {
            obj.parent.removeChild(obj);
            if(obj instanceof FloorTile) {
                this.spawnWorldObject(WorldObjectTypes.FLOOR_TILE)
            }
            else {
                this.queueWorldObject(obj.type);
            }
        }
    }

    queueWorldObject(type: WorldObjectTypes): void {
        if(type == WorldObjectTypes.CLOUD) {
                this.spawnWorldObject(type, this.WIDTH + Math.random()*50)
        }
        else if(type == WorldObjectTypes.OBSTACLE) {
                this.spawnWorldObject(type)
        }
    }

    moveWorldObjects(delta: number): void {
        for(const arr of this.allObjectsArrays) {
            for(const gameObj of arr) {
                let speed = this.PLAYER_MOVE_SPEED;
                if(gameObj instanceof Cloud || gameObj instanceof Obstacle)
                    speed += gameObj.speedOffset;
                gameObj.x -= speed * delta;
                if(gameObj.x < -gameObj.view.width/2) {
                    gameObj.isGarbage = true;
                }
            }
        }
    }

    controls(delta: number): void {
        if(this.dino.speedY != null) {
            if(this.isJumpKeyPressed && this.dino.y > this.JUMP_HEIGHT_MAX && this.dino.speedY < 0) {
                this.dino.speedY -= this.GRAV_ACCEL * delta;
            }
            else if(this.isCrouchKeyPressed) {
                this.dino.speedY += this.GRAV_ACCEL * 0.5 * delta;
            }

            this.dino.speedY += this.GRAV_ACCEL * delta;
            this.dino.y += this.dino.speedY * delta;

            if(this.dino.y >= this.FLOOR_Y) {
                this.dino.y = this.FLOOR_Y;
                this.dino.run();
                if(!this.isGameStarted)
                    this.isGameStarted = true;
            }
        }
    }

    checkCollisions(): void {
        for(const obstacle of this.obstacles) {
            //primary AABB collision check
            const dinoMainBox = Utils.adjustCollisionBox(this.dino, this.dino.viewRun, {x: 0, y: 0, width: this.dino.viewRun.width, height: this.dino.viewRun.height});
            const obstacleMainBox = Utils.adjustCollisionBox(obstacle, obstacle.view, {x: 0, y: 0, width: obstacle.view.width, height: obstacle.view.height});
            if(Utils.AABBOverlap(dinoMainBox, obstacleMainBox)) {
                let dinoColBoxes: CollisionBox[] = [];
                if(this.dino.state == DinoStates.CROUCH) {
                    dinoColBoxes = [{
                        x: 0,
                        y: 0,
                        width: this.dino.currentView.width,
                        height: this.dino.currentView.height
                    }];
                }
                else {
                    dinoColBoxes = this.dino.collisionBoxes;
                }

                for(const dinoColBox of dinoColBoxes) {
                    const adjustedDinoColBox = Utils.adjustCollisionBox(this.dino, this.dino.viewRun, dinoColBox);

                    const collBoxes = obstacle.getCurrCollBoxes();
                    for(const obsColBox of collBoxes) {
                        const adjustedObsColBox = Utils.adjustCollisionBox(obstacle, obstacle.view, obsColBox);
                        if(Utils.AABBOverlap(adjustedDinoColBox, adjustedObsColBox)) {
                            this.onGameOver();
                            return;
                        }
                    }
                }
            }
        }
    }

    updateScore(delta: number): void {
        this.score += delta/100;
        this.scoreFloored = Math.floor(this.score);
        const scoreUp = Math.floor(this.score/100);
        if(scoreUp > 0 && scoreUp > this.lastScoreUp) {
            this.lastScoreUp = scoreUp;
            sound.play('score_up');
            if(this.PLAYER_MOVE_SPEED < this.PLAYER_MOVE_SPEED_MAX)
                this.PLAYER_MOVE_SPEED += this.SPEED_INCREASE_STEP;
        }
    }

    onGameOver(): void {
        this.dino.crash();
        this.isGameOver = true;
        this.emit('game_over');
    }

    tick(delta: number): void {

        if(this.isGameOver) return;

        this.controls(delta);

        if(this.isGameStarted) {
            this.moveWorldObjects(delta);
            this.destroyGarbageObjects();
            this.checkCollisions();
            this.updateScore(delta);
        }
    }

}
