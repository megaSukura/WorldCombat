/**
 * 看穿 / detect 的出手方式。
 *
 * 念头的形状：凝神（raise）后打开一个很短的读招窗口；窗口内第一次进入的来袭被完整免除（read），
 * 读中即换来一段先机（opening，默认抬速度、反击取向抬攻击），然后收招；窗口走完没读到则落空（miss）。
 * 三幕：凝神 → 读招 → 先机／落空。免除本身复用共享 GuardEffects 的 pool（一次用完即收），
 * 落空由本单元自己的 detect_window 效果在窗口结束时判定。
 */
namespace PokemonSkills {
    const detectScene = "world_combat:move_detect";
    export const DetectRule = "world_combat:detect";
    const DetectOpening = "world_combat:opening";
    const DetectWindow = "world_combat:detect_window";
    const detectFocusKey = "world_combat:move_detect:focus";
    const detectReadText = "world_combat.move.detect.text.read";
    const detectOpeningText = "world_combat.move.detect.text.opening";
    const detectMissText = "world_combat.move.detect.text.miss";
    const detectRadiusReference = 1.2;
    /** 本次读招是否已经命中；窗口效果在结束时据此决定发不发落空。 */
    const detectRead: { [id: string]: boolean } = Object.create(null);

    function detectRadiusScale(radius: number): number {
        return Math.max(0.4, Math.min(2.2, (radius || detectRadiusReference) / detectRadiusReference));
    }

    function detectWindowData(json: string): string {
        const value = JSON.parse(json);
        if (typeof value.guard !== "number" || !isFinite(value.guard)) throw new Error("Invalid detect window");
        return JSON.stringify(value);
    }

    WorldCombat.effect(DetectWindow, 1, 400, "actor", detectWindowData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(DetectWindow, "start", function () { });
    WorldCombat.effectHandler(DetectWindow, "end", function (effect) {
        const data = JSON.parse(effect.state()), key = String(data.guard);
        if (!detectRead[key]) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body !== null) {
                WorldFeedback.emit(world, detectScene, 1, body.position(), { moment: "miss", target: String(effect.target().ref()) }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), detectMissText, [], 24);
            }
        }
        delete detectRead[key];
    });

    GuardEffects.register(DetectRule, {
        /** 只被敌对来源的攻击花掉读招，摔落、灼伤等自身来源不会误耗。 */
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            return !!incoming.source && String(incoming.source.ref()) !== String(effect.target().ref()) && !world.friendly(incoming.source);
        },
        pulse: function (effect, state) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            WorldFeedback.keep(world, detectFocusKey, detectScene, 1, body.position(), {
                moment: "focus", target: String(effect.target().ref()),
                scale: detectRadiusScale((<any>state).radius)
            }, 20);
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state, scale = detectRadiusScale(custom.radius);
            detectRead[String(effect.id())] = true;
            const power = Math.max(0.05, Math.min(1, amount / Math.max(1, body.maxHealth())));
            WorldFeedback.emit(world, detectScene, 1, body.position(), { moment: "read", target: String(target.ref()),
                scale: scale, power: power, intensity: custom.boost / 2 }, 26);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), detectReadText, [], 30);
            const previous = MobEffects.read(world, target, DetectOpening);
            const carrier = MobEffects.apply(world, target, DetectOpening, custom.opening, 0);
            if (carrier !== null) {
                const changes: { [stat: string]: number } = {}; changes[custom.stat] = custom.boost;
                NativeEffects.boostWindow(world, target, changes, custom.opening,
                    "world_combat:move/detect", carrier, previous);
            }
            WorldFeedback.keep(world, detectFocusKey, detectScene, 1, body.position(), { moment: "opening", target: String(target.ref()),
                scale: scale, intensity: custom.boost / 2 }, Math.max(24, custom.opening));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), detectOpeningText, [custom.boost], 26);
            world.sound("minecraft:entity.evoker.cast_spell", body.position(), 16, "{}");
            effect.end();
        }
    });

    define({
        id: "detect",
        cooldownParameter: "charge",
        name: "Detect",
        description: "在极短窗口内读穿下一次攻击并完整免除，成功后可获得一段先机（默认抬速度，可配置为抬攻击）；连续使用容易失败。",
        uses: ["对手起手瞬间拆掉它的第一击", "边靠近边读招，读中后立刻反击", "挡下一次致命的攻击"],
        kind: "self",
        range: 0,
        prepare: 6,
        active: 0,
        recover: 3,
        cooldown: 30,
        stationary: false,
        style: "read",
        defaults: { strike: false, ai: { range: 6 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["detect"], detail: { values: config }, world, actor, attributes };
            const strike = !!(config && config.strike);
            return {
                prepare: p("detect", "raise", context),
                recover: strike ? 5 : 3,
                cooldown: p("detect", "charge", context),
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_detect:focus", detectScene, 1, action.origin(), JSON.stringify({ moment: "focus",
                scale: detectRadiusScale(p("detect", "radius", action)) }));
            return prepare;
        },
        ready: function (action, config) {
            const key = "detect_fizzle", stored = action.data(key);
            if (stored !== null) return JSON.parse(stored).failed ? "world_combat:fizzle" : "";
            const failed = action.sense().random() < p("detect", "fizzle", action);
            action.data(key, JSON.stringify({ failed: failed }));
            return failed ? "world_combat:fizzle" : "";
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const window = p("detect", "readWindow", action);
            const radius = p("detect", "radius", action);
            const previous = state(world, actor, GuardEffects.stallKey), now = world.tick();
            const count = previous && typeof previous.stall === "number" && now - (previous.at || 0) <= p("detect", "stallReset", action) ? previous.stall : 0;
            setState(world, actor, GuardEffects.stallKey, { stall: count + 1, at: now });
            const guard: any = { rule: DetectRule, mode: "pool", capacity: 99999, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, radius: radius, boost: p("detect", "openingBoost", action),
                stat: config && config.strike ? "atk" : "spe", opening: p("detect", "opening", action) };
            const instance = GuardEffects.apply(world, actor, guard, window);
            world.effect(DetectWindow, actor, JSON.stringify({ guard: instance }), window);
            sound(action, "minecraft:block.amethyst_block.chime");
            action.present("world_combat:move_detect:focus2", detectScene, 1, action.origin(), JSON.stringify({ moment: "focus", scale: detectRadiusScale(radius) }));
            done(action);
        }
    });
}
