/**
 * 生蛋 / Soft-Boiled —— 执行组织。
 *
 * 核心念头：产下一枚温热的蛋，回复就装在蛋里——自己啄开吃掉，或者（分蛋）把它递给附近受伤的伙伴。
 *
 * 出手：共享节奏。windup（提交前）只播预告——脚边先聚起产蛋的暖光；准备可被打断，不花代价。
 * 产蛋（lay，提交后）：在脚边生成一枚真实的蛋（WorldBodies 持久实体，脑 world_combat:move/softboiled/egg），
 *   蛋里带着这一口回复；分蛋档先选定附近受伤的友方做受益人，自己放弃这一口。
 * 孵化（hatch）：蛋在 eatTicks 后啄开，按受益者最大生命的 heal 比例交付回复；蛋在这段时间里可以被敌人打碎（smashed），
 *   打碎就没有这一口；受益人已满血或离场则作废（wasted）。
 *
 * 反制：蛋放在世界里、有寿命——对手可以在孵化前把它打碎；分蛋虽然能救伙伴，但施法者自己拿不到这一口。
 * 与同族分开：自我再生按刻连续；生蛋把回复外化成一件可摧毁、可转赠的世界物件。
 */
namespace PokemonSkills {
    const softboiledScene = "world_combat:move_softboiled";
    const softboiledEggBrain = "world_combat:move/softboiled/egg";
    const softboiledTextLay = "world_combat.move.softboiled.text.lay";
    const softboiledTextHatch = "world_combat.move.softboiled.text.hatch";
    const softboiledTextShared = "world_combat.move.softboiled.text.shared";
    const softboiledTextWasted = "world_combat.move.softboiled.text.wasted";
    const softboiledTextSmashed = "world_combat.move.softboiled.text.smashed";

    function softboiledAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.8, 0)); }

    /** 回复走共享健康写入；返回本次实际补进的世界生命量。 */
    function softboiledHeal(world: CombatWorld, target: CombatActor, amount: number, cause: string): number {
        if (!(amount > 0) || !world.valid(target)) return 0;
        var before = world.observe(target);
        if (!before) return 0;
        if (String(target.domain()) === "cobblemon") {
            var pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            world.health(target, amount, "world_combat:" + cause);
        }
        var after = world.observe(target);
        return after ? Math.max(0, after.health() - before.health()) : 0;
    }

    /** 分蛋档：找身边最近的一只受伤友方（不含自己）；没有就回 null。 */
    function softboiledFriend(world: CombatWorld, self: CombatActor, point: CombatPoint, reach: number): CombatActor | null {
        var found = world.query(point, Math.max(1.5, reach), true), best: CombatActor | null = null, shortest = reach + 0.001;
        for (var i = 0; i < found.length; i++) {
            var other = found[i];
            if (String(other.ref()) === String(self.ref()) || !world.friendly(other)) continue;
            var body = world.observe(other);
            if (!body || body.health() <= 0 || body.health() >= body.maxHealth() - 0.01) continue;
            var distance = body.position().minus(point).length();
            if (distance < shortest) { shortest = distance; best = other; }
        }
        return best;
    }

    function softboiledState(brain: CombatEffect): any { return JSON.parse(brain.state()); }

    function softboiledSchedule(brain: CombatEffect): void {
        var world = brain.world(), state = softboiledState(brain), remaining = state.hatchAt - world.tick();
        brain.unschedule("softboiled:hatch");
        brain.schedule("softboiled:hatch", "hatch", Math.max(1, remaining), "{}");
    }

    function softboiledCradle(brain: CombatEffect): void {
        var world = brain.world(), state = softboiledState(brain), egg = world.observe(brain.target());
        if (!egg) return;
        WorldFeedback.keep(world, "softboiled:egg:" + String(brain.target().ref()), softboiledScene, 1, egg.position(),
            { moment: "cradle", scale: state.scale, cradle: state.cradle, shells: state.shells }, 12);
    }

    function softboiledHatch(brain: CombatEffect): void {
        var world = brain.world(), state = softboiledState(brain), egg = world.observe(brain.target());
        var at = egg ? egg.position() : null;
        var recipient = world.actor(state.recipient), healed = 0, shared = String(state.recipient) !== String(state.owner);
        if (recipient && world.valid(recipient)) {
            var body = world.observe(recipient);
            if (body && body.health() < body.maxHealth() - 0.01) {
                healed = softboiledHeal(world, recipient, body.maxHealth() * state.fraction, "softboiled");
                if (healed > 0) {
                    feedback(world, recipient, body.position(), "heal", { amount: Math.round(healed * 10) / 10 });
                    world.sound("minecraft:block.amethyst_block.chime", body.position(), 16, "{}");
                    WorldFeedback.emit(world, softboiledScene, 1, body.position(),
                        { moment: "hatch", target: String(recipient.ref()), point: [body.position().x(), body.position().y(), body.position().z()],
                            shells: state.shells, scale: state.scale, healed: Math.round(healed * 10) / 10 }, 32);
                    WorldFeedback.text(world, softboiledAbove(body.position()), shared ? softboiledTextShared : softboiledTextHatch,
                        [Math.round(healed * 10) / 10], 30);
                }
            }
        }
        if (healed <= 0 && at) {
            WorldFeedback.emit(world, softboiledScene, 1, at,
                { moment: "wasted", target: String(brain.target().ref()), shells: state.shells, scale: state.scale }, 24);
            WorldFeedback.text(world, softboiledAbove(at), softboiledTextWasted, [], 24);
        }
        brain.end();
    }

    function softboiledSmashed(brain: CombatEffect): void {
        var world = brain.world(), egg = world.observe(brain.target()), state = softboiledState(brain);
        if (!egg) return;
        world.sound("minecraft:block.glass.break", egg.position(), 14, "{}");
        WorldFeedback.emit(world, softboiledScene, 1, egg.position(),
            { moment: "smashed", target: String(brain.target().ref()), shells: state.shells, scale: state.scale }, 26);
        WorldFeedback.text(world, softboiledAbove(egg.position()), softboiledTextSmashed, [], 26);
    }

    WorldBodies.define(softboiledEggBrain, {
        schema: 1,
        maxTicks: 600,
        start: function (brain) { softboiledSchedule(brain); },
        resume: function (brain) { softboiledSchedule(brain); },
        tick: { every: 8, handler: function (brain) { softboiledCradle(brain); } },
        handlers: { hatch: function (brain) { softboiledHatch(brain); } },
        died: function (brain) { softboiledSmashed(brain); },
        end: function () { }
    });

    define({
        id: softboiledId, name: "生蛋",
        description: "产下一枚带着回复的蛋，片刻后啄开回复最大生命的一半左右；蛋留在世界里、孵化前可以被敌人打碎（打碎就没了）。开启分蛋时把蛋递给附近受伤的伙伴，代价是自己拿不到这一口。",
        uses: ["把回复留在身边慢慢取用", "在安全位置产蛋再回来吃", "把蛋让给受伤的伙伴"],
        kind: "self", range: 0, prepare: 12, active: 0, recover: 10, cooldown: 220, style: "egg", maximumTicks: 500,
        defaults: { share: false },
        fields: [],
        indicator: function (config) { return { radius: 1, style: "egg", label: config && config.share === true ? "分蛋" : "自食" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[softboiledId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(4, Math.round(p(softboiledId, "lay", context))),
                recover: Math.max(3, Math.round(p(softboiledId, "settleTicks", context))),
                cooldown: Math.round(p(softboiledId, "cooldown", context)),
                active: 0, range: 0
            };
        },
        ready: function (action, config) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            if (config && config.share === true) {
                var reach = Math.max(1.5, p(softboiledId, "eggReach", action));
                return softboiledFriend(world, self, body.position(), reach) ? "" : "no-wounded-friend";
            }
            return body.health() >= body.maxHealth() - 0.01 ? "nothing-to-restore" : "";
        },
        windup: function (action, _config, prepare) {
            action.present("softboiled:windup", softboiledScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()), cradle: p(softboiledId, "cradle", action) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var share = config && config.share === true;
            var fraction = Math.max(0.05, Math.min(0.9, p(softboiledId, "heal", action)));
            var eatTicks = Math.max(10, Math.round(p(softboiledId, "eatTicks", action)));
            var reach = Math.max(1.5, p(softboiledId, "eggReach", action));
            var shells = Math.max(8, Math.round(p(softboiledId, "shells", action)));
            var cradle = Math.max(4, Math.round(p(softboiledId, "cradle", action)));
            var scale = Math.max(0.7, Math.min(1.8, body.height() / 1.4));
            var recipient = self;
            if (share) {
                var friend = softboiledFriend(world, self, body.position(), reach);
                if (friend) recipient = friend;
            }
            var point = body.position().plus(WorldCombat.point(0, -body.height() / 2 + 0.2, 0));
            var state = { owner: String(self.ref()), recipient: String(recipient.ref()), fraction: fraction,
                radius: reach, shells: shells, cradle: cradle, scale: scale, hatchAt: world.tick() + eatTicks };
            sound(action, "minecraft:entity.chicken.egg");
            WorldBodies.spawn(world, point, { appearance: { item: "minecraft:egg", spin: true, scale: scale },
                size: [0.4, 0.4], health: 6, gravity: true, pushable: false, invulnerable: false, silent: true, knockbackResistance: 0.5 },
                softboiledEggBrain, state, eatTicks + 200);
            WorldFeedback.emit(world, softboiledScene, 1, point,
                { moment: "lay", target: String(self.ref()), shells: shells, scale: scale, hatchAt: eatTicks }, 30);
            WorldFeedback.text(world, softboiledAbove(point), softboiledTextLay, [], 30);
            done(action);
        }
    });
}
