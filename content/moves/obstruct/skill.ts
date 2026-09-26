/**
 * 拦堵 / obstruct 的出手方式。
 *
 * 念头的形状：从地面顶起一圈带刺拒马（raise），用比守住更薄的量挡下来袭（hold → block）；
 * 每一次接触攻击撞上来，撞的人在同一个窗口里被扎一次、防御大幅下降（punish）；量尽则崩解（shatter）。
 * 三幕：立拒马 → 拒止 → 崩解。拒马本体是共享 GuardEffects 的 pool，撑罩期间用 world_combat:rooted 定身。
 */
namespace PokemonSkills {
    const obstructScene = "world_combat:move_obstruct";
    export const ObstructRule = "world_combat:obstruct";
    const obstructHoldKey = "world_combat:move_obstruct:hold";
    const obstructBlockText = "world_combat.move.obstruct.text.block";
    const obstructPunishText = "world_combat.move.obstruct.text.punish";
    const obstructShatterText = "world_combat.move.obstruct.text.shatter";
    /** 每个攻击者在本次拒马窗口里是否已经被扎过。 */
    const obstructPunished: { [key: string]: boolean } = Object.create(null);

    function obstructIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function obstructContact(data: any): boolean {
        return DamageSemantics.read(data).contact;
    }

    GuardEffects.register(ObstructRule, {
        /** 只挡敌对来源的攻击；自身来源（摔落、灼伤）不消耗拒马。 */
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            return !!incoming.source && String(incoming.source.ref()) !== String(effect.target().ref()) && !world.friendly(incoming.source);
        },
        pulse: function (effect, state) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            if (effect.remaining() <= 8) Object.keys(obstructPunished).forEach(function (entry) { if (entry.indexOf(String(effect.id()) + ":") === 0) delete obstructPunished[entry]; });
            const initial = (<any>state).initial || state.capacity || 1;
            WorldFeedback.keep(world, obstructHoldKey, obstructScene, 1, body.position(), {
                moment: "hold", target: String(effect.target().ref()),
                reach: (<any>state).radius, intensity: obstructIntensity(state.capacity, initial)
            }, 20);
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const attacker = incoming.source && String(incoming.source.ref()) !== String(target.ref()) && world.observe(incoming.source) !== null ? incoming.source : null;
            const attackerBody = attacker !== null ? world.observe(attacker) : null;
            // 来向：away 从攻击者指向拒马（打在哪一侧），toAttacker 从拒马指向攻击者（刺从哪边顶出去）。
            const away = attackerBody !== null ? body.position().minus(attackerBody.position()) : null;
            const toAttacker = attackerBody !== null ? attackerBody.position().minus(body.position()) : null;
            if (attacker !== null && attackerBody !== null && obstructContact(incoming.data) && !world.friendly(attacker)) {
                const key = String(effect.id()) + ":" + String(attacker.ref());
                if (!obstructPunished[key]) {
                    obstructPunished[key] = true;
                    const drop = custom.drop || 1, point = attackerBody.position();
                    NativeEffects.boost(world, attacker, "def", -drop);
                    const punish: any = { moment: "punish", target: String(attacker.ref()), drop: drop, punishCount: drop * 8 };
                    if (toAttacker !== null && toAttacker.length() > 0.01) {
                        const direction = toAttacker.unit();
                        punish.direction = [direction.x(), direction.y(), direction.z()];
                    }
                    WorldFeedback.emit(world, obstructScene, 1, point, punish, 24);
                    WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.4, 0)), obstructPunishText, [drop], 30);
                    world.sound("minecraft:entity.iron_golem.attack", point, 16, "{}");
                }
            }
            const blocked = Math.round(amount * 10) / 10, remaining = Math.round(state.capacity * 10) / 10;
            const block: any = { moment: "block", target: String(target.ref()),
                intensity: obstructIntensity(state.capacity, custom.initial || 1), blocked: blocked, remaining: remaining };
            if (away !== null && away.length() > 0.01) {
                const direction = away.unit();
                block.direction = [direction.x(), direction.y(), direction.z()];
            }
            WorldFeedback.emit(world, obstructScene, 1, body.position(), block, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), obstructBlockText, [blocked, remaining], 30);
            world.sound("minecraft:item.shield.block", body.position(), 16, "{}");
            if (state.capacity <= 0) {
                Object.keys(obstructPunished).forEach(function (entry) { if (entry.indexOf(String(effect.id()) + ":") === 0) delete obstructPunished[entry]; });
                WorldFeedback.emit(world, obstructScene, 1, body.position(), { moment: "shatter", target: String(target.ref()), reach: custom.radius }, 26);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), obstructShatterText, [], 30);
                world.sound("minecraft:item.shield.break", body.position(), 16, "{}");
            }
        }
    });

    define({
        freeMovement: true,
        id: "obstruct",
        cooldownParameter: "charge",
        name: "Obstruct",
        description: "立起一道拒马并钉在原地，用总量完整挡下来自敌人的伤害；接触它的攻击者防御会大幅下降，连续使用容易失败。",
        uses: ["引诱近战对手撞上拒马", "为后续攻击先把对手打软", "站在要道上，用拒马替自己扛下一轮集火"],
        kind: "self",
        range: 0,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 80,
        stationary: false,
        style: "barricade",
        defaults: { barbs: false, ai: { range: 4 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["obstruct"], detail: { values: config }, world, actor, attributes };
            const barbs = !!(config && config.barbs);
            return {
                prepare: p("obstruct", "raise", context),
                recover: barbs ? 6 : 10,
                cooldown: p("obstruct", "charge", context),
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_obstruct:raise", obstructScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", reach: p("obstruct", "radius", action) }));
            return prepare;
        },
        ready: function (action, config) {
            const key = "obstruct_fizzle", stored = action.data(key);
            if (stored !== null) return JSON.parse(stored).failed ? "world_combat:fizzle" : "";
            const failed = action.sense().random() < p("obstruct", "fizzle", action);
            action.data(key, JSON.stringify({ failed: failed }));
            return failed ? "world_combat:fizzle" : "";
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const window = p("obstruct", "window", action);
            const capacity = p("obstruct", "capacity", action);
            const radius = p("obstruct", "radius", action);
            const previous = state(world, actor, GuardEffects.stallKey), now = world.tick();
            const count = previous && typeof previous.stall === "number" && now - (previous.at || 0) <= p("obstruct", "stallReset", action) ? previous.stall : 0;
            setState(world, actor, GuardEffects.stallKey, { stall: count + 1, at: now });
            const guard: any = { rule: ObstructRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, initial: capacity, radius: radius, drop: p("obstruct", "drop", action) };
            GuardEffects.apply(world, actor, guard, window);
            world.effect("world_combat:rooted", actor, "{}", window);
            sound(action, "minecraft:block.deepslate.place");
            action.present("world_combat:move_obstruct:raise2", obstructScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", reach: radius }));
            done(action);
        }
    });
}
