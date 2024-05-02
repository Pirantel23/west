import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

// Отвечает является ли карта уткой.
function isDuck(card) {
    return card && card.quacks && card.swims;
}

// Отвечает является ли карта собакой.
function isDog(card) {
    return card instanceof Dog;
}

// Дает описание существа по схожести с утками и собаками
function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) {
        return 'Утка-Собака';
    }
    if (isDuck(card)) {
        return 'Утка';
    }
    if (isDog(card)) {
        return 'Собака';
    }
    return 'Существо';
}

class Creature extends Card {
    constructor(name, maxPower, image) {
        super(name, maxPower, image);
    }

    get currentPower() {
        return this._currentPower;
    }

    set currentPower(value) {
        this._currentPower = Math.min(this.maxPower, value);
    }

    getDescriptions() {
        return [
            getCreatureDescription(this),
            ...super.getDescriptions()
        ];
    }
}

class Duck extends Creature {
    constructor() {
        super('Мирная утка', 2);
    }
    
    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }
}

class Dog extends Creature {
    constructor() {
        super('Пес-бандит', 3);
    }
}

class Trasher extends Dog {
    constructor() {
        super();
        this.name = 'Громила';
        this.maxPower = 5;
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {
            continuation(value - 1);
        });
    }

    getDescriptions() {
        return [
            'Получает на 1 меньше урона',
            ...super.getDescriptions()
        ];
    }

}

class Gatling extends Creature {
    constructor() {
        super();
        this.name = 'Гатлинг';
        this.maxPower = 6;
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const oppositeCards = gameContext.oppositePlayer.table;
        taskQueue.push(onDone => this.view.showAttack(onDone));

        oppositeCards.forEach(oppositeCard => {
            taskQueue.push(onDone => {
                this.dealDamageToCreature(2, oppositeCard, gameContext, onDone);
            });
        });

        taskQueue.continueWith(continuation);
    }

    getDescriptions() {
        return [
            'При атаке наносит 2 урона каждому противнику',
            ...super.getDescriptions()
        ];
    }
}

class Lad extends Dog {
    constructor() {
        super();
        this.name = 'Браток';
        this.maxPower = 2;
    }

    static getBonus() {
        const count = this.getInGameCount();
        return count * (count + 1) / 2;
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    static increaseInGameCount() {
        this.setInGameCount(this.getInGameCount() + 1);
    }

    static decreaseInGameCount() {
        this.setInGameCount(this.getInGameCount() - 1);
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.increaseInGameCount();
        continuation();
    }

    doBeforeRemoving(continuation) {
        Lad.decreaseInGameCount();
        continuation();
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        continuation(value + Lad.getBonus());
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        continuation(Math.max(value - Lad.getBonus(), 0));
    }

    getDescriptions() {
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') ||
            Lad.prototype.hasOwnProperty('modifyTakenDamage')) {
            return [
                'Чем их больше, тем они сильнее',
                ...super.getDescriptions()
            ];
        }
        return super.getDescriptions();
    }
}

class Rogue extends Creature {
    constructor() {
        super('Изгой', 2);
    }

    doBeforeAttack(gameContext, continuation) {
        const oppositePlayer = gameContext.oppositePlayer;
        const oppositeCards = oppositePlayer.table;

        oppositeCards.forEach(card => {
            if (card instanceof Rogue) {
                return;
            }

            const prototype = Object.getPrototypeOf(card);

            Object.getOwnPropertyNames(prototype).forEach(property => {
                if (property === 'modifyDealedDamageToCreature' ||
                property === 'modifyDealedDamageToPlayer' ||
                property === 'modifyTakenDamage') {
                    this[property] = prototype[property];
                    delete prototype[property];
                }
            });
        });

        gameContext.updateView();
        continuation();
    }
}

class Brewer extends Duck {
    constructor() {
        super();
        this.name = 'Пивовар';
        this.maxPower = 2;
    }

    doBeforeAttack(gameContext, continuation) {
        const cards = gameContext.currentPlayer.table.concat(gameContext.oppositePlayer.table);

        cards.forEach(card => {
            if (isDuck(card)) {
                card.maxPower++;
                card.currentPower += 2;
                card.view.signalHeal(() => {});
                card.updateView();
            }
        });
        continuation();
    }
}

class PseudoDuck extends Dog {
    constructor() {
        super();
        this.name = 'Псевдоутка';
        this.maxPower = 3;
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }
}

class Nemo extends Creature {
    constructor() {
        super('Немо', 4);
    }

    doBeforeAttack(gameContext, continuation) {
        let oppositeCard = gameContext.oppositePlayer.table[gameContext.position];
        if (oppositeCard) {
            Object.setPrototypeOf(this, Object.getPrototypeOf(oppositeCard));
            gameContext.updateView();
        }
        this.doBeforeAttack(gameContext, continuation)
    }
}


const seriffStartDeck = [
    new Nemo(),
];
const banditStartDeck = [
    new Brewer(),
    new Brewer(),
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
