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
        /** 「完全抵挡对手的攻击」：只接敌对来源的一击，摔落、灼伤等自身来源不消耗穹顶。 */
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            return !!incoming.source && String(incoming.source.ref()) !== String(effect.target().ref()) && !world.friendly(incoming.source);
        },
        pulse: function (effect, state) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            const initial = (<any>state).initial || state.capacity || 1;
            WorldFeedback.keep(world, protectHoldKey, protectScene, 1, body.position(), {
                moment: "hold", target: String(effect.target().ref()),
                scale: protectRadiusScale((<any>state).radius), intensity: protectIntensity(state.capacity, initial)
            }, 20);
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
                WorldFeedback.emit(world, protectScene, 1, body.position(), { moment: "shatter", target: String(target.ref()), scale: scale }, 26);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), protectShatterText, [], 30);
                world.sound("minecraft:item.shield.break", body.position(), 16, "{}");
            }
        }
    });

    define({
        id: "protect",
        cooldownParameter: "charge",
        name: "Protect",
        description: "Enables the user to evade all attacks. Its chance of failing rises if it is used in succession.",
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
            const failed = action.sense().random() < p("protect", "fizzle", action);
            action.data(key, JSON.stringify({ failed: failed }));
            return failed ? "world_combat:fizzle" : "";
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const window = p("protect", "window", action);
            const capacity = p("protect", "capacity", action);
            const radius = p("protect", "radius", action);
            const previous = state(world, actor, GuardEffects.stallKey), now = world.tick();
            const count = previous && typeof previous.stall === "number" && now - (previous.at || 0) <= p("protect", "stallReset", action) ? previous.stall : 0;
            setState(world, actor, GuardEffects.stallKey, { stall: count + 1, at: now });
            const guard: any = { rule: ProtectRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, initial: capacity, radius: radius };
            GuardEffects.apply(world, actor, guard, window);
            if (config && config.braced) world.effect("world_combat:rooted", actor, "{}", window);
            sound(action, "cobblemon:move.protect.actor");
            action.present("world_combat:move_protect:raise2", protectScene, 1, action.origin(), JSON.stringify({ moment: "raise", scale: protectRadiusScale(radius) }));
            done(action);
        }
    });
}
