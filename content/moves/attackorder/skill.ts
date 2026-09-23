/**
 * 攻击指令 / attackorder 的出手方式。
 *
 * 核心念头：振翅下令，一队手下从身边依次扑向对手，每只扑到身上刺一下；被中途打掉的手下不再落这一刺。
 *   每只手下各自结算一小段伤害，所以「容易击中要害」在这里就是「小刺越多，越容易撞上要害」。
 *
 * 两幕：
 *   起（call，提交前）：振翅，只播预告。
 *   扑（call → gather → fly → sting / slain）：提交后按 `underlings` 放出持久实体手下（WorldBodies 脑
 *       world_combat:move/attackorder/underling），它们按 `stagger` 依次起飞、朝目标追去；每只追到身上就用
 *       施法者的属性结算一记 sting（各自掷会心）；被对手打掉的手下在 `slain` 中散去、不再输出。
 *   收（spent）：够不到目标或寿命到头的手下自行散去。
 *
 * 与回复指令分开：同一个虫群，回复指令的手下围着施法者把治疗带回来，攻击指令的手下扑向敌人把伤害送出去；
 * 两者都把手下的存活当回事——打掉一只就少一份。
 */
namespace PokemonSkills {
    function attackorderState(brain: CombatEffect): any { return JSON.parse(brain.state()); }

    /** 手下每 2 刻推进一次：未起飞就原地待命，起飞后朝目标追；追到身上就落刺。 */
    function attackorderStep(brain: CombatEffect): void {
        var world = brain.world(), state = attackorderState(brain);
        var self = world.observe(brain.target());
        if (self === null) { brain.end(); return; }
        var owner = world.actor(state.owner), target = world.actor(state.target);
        if (owner === null || !world.valid(owner) || target === null || !world.valid(target)) { brain.end(); return; }
        var body = world.observe(target);
        if (body === null) { brain.end(); return; }
        if (world.tick() < state.launchAt) {
            WorldFeedback.keep(world, "attackorder:gather:" + String(brain.target().ref()), attackorderScene, 1, self.position(),
                { moment: "gather", target: String(owner.ref()), scale: state.scale, size: 0.14 * state.scale }, 20);
            return;
        }
        var goal = body.position().plus(WorldCombat.point(0, body.height() * 0.5, 0));
        var delta = goal.minus(self.position()), distance = delta.length();
        if (distance <= 1.15) { attackorderSting(brain, owner, target, state, self); return; }
        world.motion(brain.target(), delta.unit().scale(Math.min(state.speed, Math.max(0.05, distance))), false);
        WorldFeedback.keep(world, "attackorder:fly:" + String(brain.target().ref()), attackorderScene, 1, self.position(),
            { moment: "fly", target: String(target.ref()), scale: state.scale, size: 0.16 * state.scale }, 20);
    }

    /** 手下扑到目标身上：用施法者的属性结算一记 sting（各自掷会心），再把结果放回世界。 */
    function attackorderSting(brain: CombatEffect, owner: CombatActor, target: CombatActor, state: any, self: CombatObservation): void {
        var world = brain.world();
        var template = CobblemonCombat.moveTemplate(attackorderId);
        var features = damageFeatures(attackorderId, "sting");
        features.power = state.power;
        var result = PokemonDamage.resolve(world, owner, target, template, features, 0);
        var point = self.position();
        if (result.amount > 0 && world.valid(target)) {
            world.hurt(target, result.amount, result.metadata);
            var at = world.observe(target);
            if (at !== null) point = at.position();
        }
        WorldFeedback.emit(world, attackorderScene, 1, point,
            { moment: "sting", target: String(target.ref()), scale: state.scale, power: state.power,
                count: Math.round(6 + state.power * 0.3) }, 20);
        world.sound("cobblemon:impact.bug", point, 14, "{}");
        brain.end();
    }

    WorldBodies.define(attackorderUnderling, {
        schema: 1,
        maxTicks: 200,
        start: function (brain) {
            var world = brain.world(), state = attackorderState(brain), self = world.observe(brain.target());
            if (self !== null) WorldFeedback.emit(world, attackorderScene, 1, self.position(),
                { moment: "gather", target: state.target, scale: state.scale }, 18);
        },
        tick: { every: 2, handler: function (brain) { attackorderStep(brain); } },
        end: function (brain) {
            var world = brain.world(), body = world.observe(brain.target());
            if (body === null) return;
            WorldFeedback.emit(world, attackorderScene, 1, body.position(),
                { moment: brain.reason() === "died" ? "slain" : "spent" }, 18);
        }
    });

    define({
        id: attackorderId,
        cooldownParameter: "recharge",
        name: "Attack Order",
        description: "The user calls out its underlings to pummel the target.",
        uses: ["召一队手下扑向目标各自刺一下", "用多次小刺多撞几次会心", "让手下成为能被清场的输出"],
        kind: "enemy",
        range: 5.5,
        maxRange: 7.5,
        prepare: 10,
        active: 0,
        recover: 9,
        cooldown: 34,
        style: "order",
        defaults: { swarm: false, ai: { maxChase: 12, swarm: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(attackorderId, "reach", pokemon) : 5.5, geometry: "circle", style: "order",
                color: 0xF2C14E, label: config && config.swarm === true ? "虫海式" : "精锐式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[attackorderId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(attackorderId, "tempo", context)),
                recover: Math.round(p(attackorderId, "aftercast", context)),
                cooldown: Math.round(p(attackorderId, "recharge", context)),
                active: 0,
                range: p(attackorderId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present(attackorderScene + ":call", attackorderScene, 1, action.origin(),
                JSON.stringify({ moment: "call", swarm: config && config.swarm ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world();
            var actor = action.actor();
            var body = world.observe(actor);
            var target = action.target();
            if (body === null || target === null || !world.valid(target)) { done(action); return; }
            var count = Math.max(1, Math.round(p(attackorderId, "underlings", action)));
            var power = p(attackorderId, "sting", action);
            var speed = Math.max(0.2, p(attackorderId, "flight", action));
            var stagger = Math.max(1, Math.round(p(attackorderId, "stagger", action)));
            var health = Math.max(1, Math.round(p(attackorderId, "underlingHealth", action)));
            var ttl = Math.max(40, Math.round(p(attackorderId, "ttl", action)));
            var scale = Math.max(0.6, Math.min(2.0, power / 24));
            var radius = 0.5 + body.width() * 0.3, hover = body.height() * 0.5 + 0.2;
            for (var i = 0; i < count; i++) {
                var angle = i * (Math.PI * 2 / count) + world.random() * 0.4;
                var point = body.position().plus(WorldCombat.point(Math.cos(angle) * radius, hover, Math.sin(angle) * radius));
                WorldBodies.spawn(world, point, {
                    appearance: { sprite: "cobblemon:generic/flying_bugs", scale: 0.8, tint: 0xF2C14E, glow: true },
                    size: [0.35, 0.35], health: health, gravity: false, pushable: false, invulnerable: false,
                    silent: true, knockbackResistance: 0.6
                }, attackorderUnderling, {
                    owner: String(actor.ref()), target: String(target.ref()), power: power, speed: speed,
                    launchAt: world.tick() + i * stagger, scale: scale
                }, ttl);
            }
            sound(action, "minecraft:block.beehive.exit");
            WorldFeedback.emit(world, attackorderScene, 1, body.position(),
                { moment: "call", target: String(target.ref()), burst: count * 8, count: count, scale: scale }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), attackorderCallText, [count], 30);
            done(action);
        }
    });
}
