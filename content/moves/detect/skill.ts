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
    /** 本次读招是否已经命中；窗口效果在结束时据此决定发不发落空。 */
    const detectRead: { [id: string]: boolean } = Object.create(null);

    /** 闪光半径作为世界单位交给表现；参数本身已夹在 1..2，这里只再兜一次底。 */
    function detectReach(radius: number): number {
        return Math.max(0.5, Math.min(4, radius || 1.2));
    }

    /**
     * 当前离自己最近、且正在威胁自己的敌对生物方向（单位向量）；凝神幕朝它张开。
     * 用一次只读 survey 找目标：优先正在攻击自己的，其次最近的敌对生物；没有就不给方向。
     */
    function detectThreatDirection(world: CombatWorld, actor: CombatActor): number[] | null {
        const body = world.observe(actor);
        if (body === null) return null;
        const here = body.position(), self = String(actor.ref());
        let records: any;
        try { records = JSON.parse(world.survey(here, 16, true, 12, "", "")); }
        catch (error) { return null; }
        if (!Array.isArray(records)) return null;
        let best: any = null, bestScore = Infinity;
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            if (!record || record.ref === self || record.friendly === true || !(record.health > 0) || !Array.isArray(record.point)) continue;
            const dx = record.point[0] - here.x(), dy = record.point[1] - here.y(), dz = record.point[2] - here.z();
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (!(distance > 0.01)) continue;
            const score = record.attacking === self ? distance - 6 : distance;
            if (score < bestScore) { bestScore = score; best = record; }
        }
        if (best === null) return null;
        const dx = best.point[0] - here.x(), dy = best.point[1] - here.y(), dz = best.point[2] - here.z();
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return length > 0.01 ? [dx / length, dy / length, dz / length] : null;
    }

    /** 把方向和半径并进表现载荷；没有方向时保持 undefined，让 JSON 省略它。 */
    function detectFocusData(radius: number, direction: number[] | null): any {
        const data: any = { moment: "focus", reach: detectReach(radius) };
        if (direction !== null) data.direction = direction;
        return data;
    }

    function detectWindowData(json: string): string {
        const value = JSON.parse(json);
        if (typeof value.guard !== "number" || !isFinite(value.guard)) throw new Error("Invalid detect window");
        if (typeof value.radius !== "number" || !isFinite(value.radius)) throw new Error("Invalid detect window radius");
        return JSON.stringify(value);
    }

    WorldCombat.effect(DetectWindow, 1, 400, "actor", detectWindowData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(DetectWindow, "start", function () { });
    WorldCombat.effectHandler(DetectWindow, "end", function (effect) {
        const data = JSON.parse(effect.state()), key = String(data.guard);
        if (!detectRead[key]) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body !== null) {
                WorldFeedback.emit(world, detectScene, 1, body.position(),
                    { moment: "miss", target: String(effect.target().ref()), reach: detectReach(data.radius) }, 20);
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
            const data = detectFocusData((<any>state).radius, detectThreatDirection(world, effect.target()));
            data.target = String(effect.target().ref());
            WorldFeedback.keep(world, detectFocusKey, detectScene, 1, body.position(), data, 20);
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            detectRead[String(effect.id())] = true;
            const power = Math.max(0.05, Math.min(1, amount / Math.max(1, body.maxHealth())));
            const data: any = { moment: "read", target: String(target.ref()),
                reach: detectReach(custom.radius), power: power, breakCount: Math.max(3, Math.round(power * 14)), intensity: custom.boost / 2 };
            const attacker = incoming.source && String(incoming.source.ref()) !== String(target.ref()) ? world.observe(incoming.source) : null;
            if (attacker !== null) {
                const away = body.position().minus(attacker.position());
                if (away.length() > 0.01) {
                    const direction = away.unit();
                    data.direction = [direction.x(), direction.y(), direction.z()];
                }
            }
            WorldFeedback.emit(world, detectScene, 1, body.position(), data, 26);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), detectReadText, [], 30);
            const previous = MobEffects.read(world, target, DetectOpening);
            const carrier = MobEffects.apply(world, target, DetectOpening, custom.opening, 0);
            if (carrier !== null) {
                const changes: { [stat: string]: number } = {}; changes[custom.stat] = custom.boost;
                NativeEffects.boostWindow(world, target, changes, custom.opening,
                    "world_combat:move/detect", carrier, previous);
            }
            WorldFeedback.keep(world, detectFocusKey, detectScene, 1, body.position(), { moment: "opening", target: String(target.ref()),
                intensity: custom.boost / 2 }, Math.max(24, custom.opening));
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
            action.present("world_combat:move_detect:focus", detectScene, 1, action.origin(),
                JSON.stringify(detectFocusData(p("detect", "radius", action), detectThreatDirection(action.sense(), action.actor()))));
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
            world.effect(DetectWindow, actor, JSON.stringify({ guard: instance, radius: radius }), window);
            sound(action, "minecraft:block.amethyst_block.chime");
            action.present("world_combat:move_detect:focus2", detectScene, 1, action.origin(),
                JSON.stringify(detectFocusData(radius, detectThreatDirection(world, actor))));
            done(action);
        }
    });
}
