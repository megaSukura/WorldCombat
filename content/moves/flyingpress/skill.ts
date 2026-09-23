/**
 * 飞身重压 / flyingpress 的出手方式。
 *
 * 核心念头：先跃到目标头顶，再用整个身体的重量从上方压下来。它是「垂直轴」里唯一按自身体重结算、
 * 又能**打空中目标**的近身招：命中离地的对手时把它连同自己一起按到地面上，走地的对手挨一记重压并被撞开。
 * 这招同时算格斗与飞行两种属性（双属性的乘积由 parameters.ts 的两个自定义事实接进共享结算）。
 *
 * 三幕（提交后由本招自己驱动）：
 *   起（windup，提交前）：蹲身蓄力、只观察与预告，可免费打断。
 *   跃（leap → rise）：提交后直上到目标上方，边升边把落点钉在目标的实时位置上。
 *   压（dive → press / glance）：沿一条斜线俯冲下压；途中撞到活体或落到目标附近就结算接触重压，
 *       离地的目标被一并按到地面、被撞开；施法者随后落回地面。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（impact／hurt → PokemonDamage）与位移（world.displace）
 * 都走同一条路；只有属性相性/本系是宝可梦层。
 */
namespace PokemonSkills {
    const flyingpressScene = "world_combat:move_flyingpress";
    const flyingpressHitText = "world_combat.move.flyingpress.text.hit";
    const flyingpressMissText = "world_combat.move.flyingpress.text.miss";

    /** 正下方最近地表的顶面高度；找不到就返回脚底当前高度。 */
    function flyingpressSurface(world: CombatWorld, body: CombatObservation): number {
        const from = body.position(), feet = from.y() - body.height() * 0.5;
        for (let step = 0; step <= 24; step++) {
            const block = world.block(WorldCombat.point(from.x(), feet - step, from.z()));
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return Math.floor(feet - step) + 1;
        }
        return feet;
    }

    define({
        freeMovement: true,
        id: "flyingpress",
        name: "Flying Press",
        description: "跃到目标头顶再用整个身体压下来：这招同时算格斗与飞行两种属性、按自身体重结算；命中离地的对手时把它连同自己一起按到地面，走地的对手挨一记重压并被撞开。",
        uses: ["从上方砸向一个空中目标", "用体重压制一个近身的硬目标", "跳过一小段人群压到后排"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 8,
        active: 50,
        recover: 10,
        cooldown: 40,
        style: "aerial",
        maximumTicks: 200,
        defaults: { highDive: false, ai: { maxChase: 9, preferAir: true } },
        fields: [field(pathOf("highDive"), "高空压顶", "boolean", {
            help: "开启：跃高 +1.2 格、重压约 ×1.12、俯冲更快，但起手 +2 刻、冷却 +8 刻，适合砸空中与硬目标。关闭（低空快压）：贴地压过去、重压约 ×0.92，收手更快。"
        })],
        indicator: function (config, pokemon) {
            return { radius: p("flyingpress", "pressRadius", pokemon), geometry: "line", style: "aerial", color: 0xE0C878,
                label: config && config.highDive === true ? "高空压顶" : "低空快压" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["flyingpress"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const high = !!(config && config.highDive);
            return {
                prepare: Math.max(4, Math.round(p("flyingpress", "prepare", context)) + (high ? 2 : -1)),
                recover: Math.max(4, Math.round(p("flyingpress", "recover", context)) + (high ? 2 : -2)),
                cooldown: Math.max(20, Math.round(p("flyingpress", "cooldown", context)) + (high ? 8 : -5)),
                active: skills["flyingpress"].active,
                range: p("flyingpress", "reach", context)
            };
        },
        windup: function (action, config) {
            action.present("flyingpress:crouch", flyingpressScene, 1, action.origin(),
                JSON.stringify({ moment: "crouch", highDive: config && config.highDive === true }));
            return p("flyingpress", "prepare", action);
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(flyingpressScene);
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { movementScenes.finish(action, done); return; }
            const target = action.target();
            const leapHeight = Math.max(1.5, p("flyingpress", "leapHeight", action));
            const leapSpeed = Math.max(0.2, p("flyingpress", "leapSpeed", action));
            const diveSpeed = Math.max(0.3, p("flyingpress", "diveSpeed", action));
            const radius = Math.max(0.4, p("flyingpress", "pressRadius", action));
            const power = p("flyingpress", "press", action);
            const push = Math.max(0, p("flyingpress", "push", action));
            const crush = Math.max(0, p("flyingpress", "crush", action));
            const traceAhead = Math.max(1, p("flyingpress", "traceAhead", action));
            const surface = flyingpressSurface(world, body);
            const apexY = surface + leapHeight;
            const start = body.position();
            const locked = target !== null && world.observe(target) !== null ? world.observe(target)!.position() : action.targetPosition();
            const ascendTicks = Math.max(1, Math.ceil(leapHeight / leapSpeed));
            const scale = radius / 0.9;
            let finished = false;

            function finish(current: CombatAction): void { if (!finished) { finished = true; movementScenes.finish(current, done); } }
            function aimAt(live: CombatWorld): CombatPoint {
                if (target !== null) { const live2 = live.observe(target); if (live2 !== null && live2.health() > 0) return live2.position(); }
                return locked;
            }
            /** 把目标按到地面并撞开；离地时连本带利压到地面上。 */
            function knockdown(live: CombatWorld, at: CombatPoint): void {
                if (target === null || !live.valid(target)) return;
                const victim = live.observe(target);
                if (victim === null) return;
                const ground = flyingpressSurface(live, victim);
                const landed = WorldCombat.point(victim.position().x(), ground + victim.height() * 0.5, victim.position().z());
                let delta = WorldCombat.point(0, -crush, 0);
                if (!victim.grounded()) delta = victim.position().minus(landed);
                const away = victim.position().minus(at);
                if (away.length() > 0.2) delta = delta.plus(WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                live.displace(target, delta);
            }
            function ground(current: CombatAction, guard: number, complete: () => void): void {
                const live = current.world(), self = live.observe(actor);
                if (self === null || guard > 30) { complete(); return; }
                const feet = self.position().y() - self.height() * 0.5, floor = flyingpressSurface(live, self);
                if (feet > floor + 0.15) {
                    live.displace(actor, WorldCombat.point(0, -Math.max(0.4, feet - floor + 0.4), 0));
                    current.after(1, function (next: CombatAction) { ground(next, guard + 1, complete); });
                    return;
                }
                WorldFeedback.emit(live, flyingpressScene, 1, self.position(), { moment: "land" }, 16);
                complete();
            }
            function press(current: CombatAction, at: CombatPoint, hit: CombatImpact | null): void {
                movementScenes.stop(current);
                const live = current.world();
                let landed = false;
                if (target !== null && live.valid(target)) landed = hit !== null && hit.target() !== null
                    ? impact(current, hit, "flyingpress", power, { damage: damageSpec("flyingpress", "press"), contact: true })
                    : hurt(current, target, "flyingpress", power, { damage: damageSpec("flyingpress", "press"), contact: true });
                if (target !== null && live.valid(target)) {
                    knockdown(live, at);
                    WorldFeedback.emit(live, flyingpressScene, 1, at,
                        { moment: landed ? "press" : "glance", target: String(target.ref()), scale: scale,
                            intensity: Math.max(0.6, Math.min(2.2, power / 100)), count: Math.round(18 + power * 0.35) }, 30);
                    sound(current, "cobblemon:impact.fighting");
                    sound(current, "minecraft:entity.player.attack.strong");
                    WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.0, 0)), landed ? flyingpressHitText : flyingpressMissText, [], 26);
                } else {
                    WorldFeedback.emit(live, flyingpressScene, 1, at, { moment: "glance" }, 18);
                    WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.0, 0)), flyingpressMissText, [], 22);
                }
                ground(current, 0, function () { finish(current); });
            }
            function dive(current: CombatAction): void {
                movementScenes.stop(current, "leap");
                const live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                const at = aimAt(live), from = self.position(), toward = at.minus(from), remaining = toward.length();
                if (remaining <= Math.max(0.4, radius)) { press(current, at, null); return; }
                const direction = toward.unit(), step = Math.min(diveSpeed, remaining), delta = direction.scale(step);
                const swept = sweepStep(current, delta, Math.max(0.35, radius * 0.7)), trace = swept.hit;
                const victim = trace.target();
                if (trace.hitEntity() && victim !== null && !current.sense().friendly(victim)) { press(current, trace.position(), trace); return; }
                if (trace.blocked()) { press(current, current.origin(), null); return; }
                const moved = swept.moved + (trace.hitEntity() && swept.remaining.length() > 0.001 ? live.displace(actor, swept.remaining) : 0);
                if (moved < Math.min(0.05, step * 0.4)) { press(current, current.origin(), null); return; }
                current.after(1, function (next: CombatAction) { dive(next); });
            }
            function rise(current: CombatAction, step: number): void {
                const live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                if (step >= ascendTicks || self.position().y() >= apexY - 0.05) { dive(current); return; }
                const up = Math.min(leapSpeed, apexY - self.position().y());
                const moved = live.displace(actor, WorldCombat.point(0, up, 0));
                if (moved < up * 0.5) { dive(current); return; }
                current.after(1, function (next: CombatAction) { rise(next, step + 1); });
            }

            sound(action, "cobblemon:move.aerialace.actor_1");
            movementScenes.show(action, "leap", start, { moment: "leap", height: leapHeight, scale: scale, intensity: Math.max(0.7, Math.min(2, power / 100)) });
            rise(action, 0);
        }
    });
}
