/**
 * 守住 / protect 的出手方式。
 *
 * 念头的形状：站定撑起一圈穹顶（raise），按护盾总量连续吸收迎面而来的攻击（hold → block）；
 * 总量被磨穿就碎裂、提前结束（shatter），时间走完则原地散去。三幕：起罩 → 持罩 → 碎裂或到期。
 * 穹顶是共享 GuardEffects 的 pool 模式，撑罩期间用世界已有的 world_combat:rooted 定身。
 * 连用计数写在本招 state 里，失误率与连用衰减由参数公式读同一份 state。
 */
namespace PokemonSkills {
    const protectScene = "world_combat:move_protect";
    export const ProtectRule = "world_combat:protect";
    const protectHoldKey = "world_combat:move_protect:hold";
    const protectBlockText = "world_combat.move.protect.text.block";
    const protectShatterText = "world_combat.move.protect.text.shatter";
    const protectRadiusReference = 1.7;
    /** 云罩剩余量换算成画面强度：满罩 1、见底趋近 0.15。 */
    function protectIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function protectRadiusScale(radius: number): number {
        return Math.max(0.5, Math.min(2.5, (radius || protectRadiusReference) / protectRadiusReference));
    }

    GuardEffects.register(ProtectRule, {
        start: function (effect, state) {
            const custom: any = state;
            if (custom.braced) {
                custom.root = effect.world().effect("world_combat:rooted", effect.target(), "{}", effect.remaining());
                effect.state(JSON.stringify(custom));
            }
        },
        end: function (effect, state) {
            const custom: any = state;
            if (custom.root > 0) effect.world().operation(custom.root, "world_combat:dispel", "{}");
        },
        /** 「完全抵挡对手的攻击」：只接敌对来源的一击，摔落、灼伤等自身来源不消耗穹顶。 */
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            return !!incoming.source && String(incoming.source.ref()) !== String(effect.target().ref()) && !world.friendly(incoming.source);
        },
        pulse: function (effect, state) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const initial = custom.initial || state.capacity || 1;
            // 护罩挂在真实 guard 效果上：碎裂、驱散、到期都随它一起收，不再留续期尾。
            WorldFeedback.onEffect(world, effect.id(), protectHoldKey, protectScene, 1, body.position(), {
                moment: "hold", target: String(target.ref()),
                scale: protectRadiusScale(custom.radius), intensity: protectIntensity(state.capacity, initial)
            });
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const initial = (<any>state).initial || state.capacity || 1;
            const scale = protectRadiusScale((<any>state).radius);
            const blocked = Math.round(amount * 10) / 10;
            const remaining = Math.round(state.capacity * 10) / 10;
            const data: any = { moment: "block", target: String(target.ref()), scale: scale,
                intensity: protectIntensity(state.capacity, initial), blocked: blocked, remaining: remaining };
            const attacker = incoming.source && String(incoming.source.ref()) !== String(target.ref()) && world.observe(incoming.source) !== null ? world.observe(incoming.source) : null;
            if (attacker !== null) {
                const away = body.position().minus(attacker.position());
                if (away.length() > 0.01) {
                    const direction = away.unit();
                    data.direction = [direction.x(), direction.y(), direction.z()];
                }
            }
            WorldFeedback.emit(world, protectScene, 1, body.position(), data, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), protectBlockText, [blocked, remaining], 30);
            world.sound("minecraft:item.shield.block", body.position(), 16, "{}");
            if (state.capacity <= 0) {
                // 穹顶在窗口内提前碎：立刻松开本次自己挂的守据定身，不让它留到整窗结束。
                if (typeof (<any>state).root === "number" && (<any>state).root > 0)
                    world.operation((<any>state).root, "world_combat:dispel", "{}");
                WorldFeedback.emit(world, protectScene, 1, body.position(), { moment: "shatter", target: String(target.ref()), scale: scale }, 26);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), protectShatterText, [], 30);
                world.sound("minecraft:item.shield.break", body.position(), 16, "{}");
            }
        }
    });

    define({
        freeMovement: function (config) { return !!config.braced; },
        id: "protect",
        cooldownParameter: "charge",
        name: "Protect",
        description: "在自己身上撑起穹顶，按护盾总量挡下敌人的攻击；盾量耗尽就碎裂，超出的伤害仍会打中你。守据姿态下撑罩期间无法移动，连续使用容易失败。",
        uses: ["预判远程齐射，提前撑罩", "被围时撑出一条退路", "为队友争取回血或撤走的时间"],
        kind: "self",
        range: 0,
        prepare: 10,
        active: 0,
        recover: 4,
        cooldown: 70,
        stationary: false,
        style: "guard",
        defaults: { braced: false, ai: { trigger: 10 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["protect"], detail: { values: config }, world, actor, attributes };
            const braced = !!(config && config.braced);
            return {
                prepare: p("protect", "raise", context),
                recover: braced ? 10 : 4,
                cooldown: p("protect", "charge", context),
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            const scale = protectRadiusScale(p("protect", "radius", action));
            action.present("world_combat:move_protect:raise", protectScene, 1, action.origin(), JSON.stringify({ moment: "raise", scale: scale }));
            return prepare;
        },
        ready: function (action, config) {
            const key = "protect_fizzle", stored = action.data(key);
            if (stored !== null) return JSON.parse(stored).failed ? "world_combat:fizzle" : "";
            const world = action.sense(), actor = action.actor();
            // 用与本次 execute 同一份时间戳连用计数，长暂停后失败率真的归零，而不是读那枚过期旧值。
            const effective = GuardEffects.stall(state(world, actor, GuardEffects.stallKey), world.tick(), p("protect", "stallReset", action));
            const variables: any = {}; variables["state." + GuardEffects.stallKey + "#stall"] = effective;
            const context: FactContext = { world: world, actor: actor, skill: skills["protect"], detail: { values: config }, variables: variables };
            const failed = world.random() < p("protect", "fizzle", context);
            action.data(key, JSON.stringify({ failed: failed }));
            return failed ? "world_combat:fizzle" : "";
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const window = p("protect", "window", action);
            const capacity = p("protect", "capacity", action);
            const radius = p("protect", "radius", action);
            const previous = state(world, actor, GuardEffects.stallKey), now = world.tick();
            const count = GuardEffects.stall(previous, now, p("protect", "stallReset", action));
            setState(world, actor, GuardEffects.stallKey, { stall: count + 1, at: now });
            const guard: any = { rule: ProtectRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, initial: capacity, radius: radius, braced: !!(config && config.braced) };
            if (!(GuardEffects.apply(world, actor, guard, window) > 0)) { done(action); return; }
            sound(action, "cobblemon:move.protect.actor");
            action.present("world_combat:move_protect:raise2", protectScene, 1, action.origin(), JSON.stringify({ moment: "raise", scale: protectRadiusScale(radius) }));
            done(action);
        }
    });
}
