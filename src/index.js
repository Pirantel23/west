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
        console.log(this.getInGameCount());
    }

    static decreaseInGameCount() {
        this.setInGameCount(this.getInGameCount() - 1);
        console.log(this.getInGameCount());
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


// «Изгой»
// От него все бегут, потому что он приходит и отнимает силы...

// Добавь карту `Rogue`:
// - называется Изгой, сила 2, наследуется от `Creature`.
// - перед атакой на карту забирает у нее все способности к увеличению наносимого урона или уменьшению получаемого урона.
//   Одновременно эти способности забираются у всех карт того же типа, но не у других типов карт.
//   Изгой получает эти способности, но не передает их другим Изгоям.

// Подсказки:
// - Изгой похищает эти способности: `modifyDealedDamageToCreature`, `modifyDealedDamageToPlayer`, `modifyTakenDamage`
// - Чтобы похитить способности у всех карт некоторого типа, надо взять их из прототипа
// - Получить доступ к прототипу некоторой карты можно так: `Object.getPrototypeOf(card)`
// - Чтобы не похищать способности у других типов, нельзя задевать прототип прототипа
// - `Object.getOwnPropertyNames` и `obj.hasOwnProperty` позволяют получать только собственные свойства объекта
// - Удалить свойство из объекта можно с помощью оператора `delete` так: `delete obj[propName]`
//   Это не то же самое, что `obj[propName] = undefined`
// - После похищения стоит обновить вид всех объектов игры. `updateView` из `gameContext` поможет это сделать.
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
                    console.log(property);
                    delete prototype[property];
                }
            });
        });

        gameContext.updateView();
        continuation();
    }
}

const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
    new Rogue(),
];
const banditStartDeck = [
    new Lad(),
    new Lad(),
    new Lad(),
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
