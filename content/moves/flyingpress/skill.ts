/**
 * 飞身重压 / flyingpress 的出手方式。
 *
 * 核心念头：先跃到目标头顶，再用整个身体的重量从上方压下来。它是「垂直轴」里唯一按自身体重结算、
 * 又能**打空中目标**的近身招：命中离地的对手时用原生受击冲量把它按向地面，走地的对手挨一记重压并被撞开。
 * 这招同时算格斗与飞行两种属性（双属性的乘积由 parameters.ts 的两个自定义事实接进共享结算）。
 *
 * 三幕（提交后由本招自己驱动）：
 *   起（windup，提交前）：蹲身蓄力、只观察与预告，可免费打断。
 *   跃（leap → rise）：提交后直上到目标上方；跃起高度从自身当前中心算，受顶板真实截断，边升边把落点钉在目标的实时位置。
 *   压（dive → press / glance）：到顶后只允许**一次**重新定向，随即锁死俯冲终点；沿一条斜线压下去。
 *       只有身体真实撞到敌方活体才结算接触重压（首碰的那一个）；撞墙只擦落尘、压到落点只扬尘，都不会回头补打原目标。
 *
 * 自由瞄准：`kind: "aim"`——可点实体，也可点空中/地面落点；提交不要求存在敌人。空中一次校向后可被侧移躲开。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（impact → PokemonDamage）与位移（hitDisplace／hitImpulse）
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

    /** 头顶到最近顶板之间的真实净空（按方块判定，忽略自身碰撞箱）；顶板/方块把它截短，返回真实可升程。 */
    function flyingpressRise(world: CombatWorld, body: CombatObservation, desired: number): number {
        const centre = body.position(), head = centre.y() + body.height() * 0.5;
        let clearance = desired + 1;
        for (let step = 0; step <= Math.ceil((desired + 1) / 0.5); step++) {
            const block = world.block(WorldCombat.point(centre.x(), head + step * 0.5, centre.z()));
            if (block === null) { clearance = step * 0.5; break; }
            const id = String(block.id());
            if (id !== "minecraft:air" && id !== "minecraft:cave_air" && id !== "minecraft:void_air" && id !== "minecraft:water") { clearance = step * 0.5; break; }
        }
        return Math.max(1.0, Math.min(desired, clearance - 0.2));
    }

    define({
        freeMovement: true,
        id: "flyingpress",
        name: "Flying Press",
        description: "跃到目标头顶再用整个身体压下来：这招同时算格斗与飞行两种属性、按自身体重结算；命中离地的对手时用原生受击冲量把它按向地面，走地的对手挨一记重压并被撞开。可点实体，也可点空中/地面的落点。",
        uses: ["从上方砸向一个空中目标", "用体重压制一个近身的硬目标", "跳过一小段人群压到后排"],
        kind: "aim",
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
            const aimPoint = action.targetPosition();
            const leapHeight = Math.max(1.5, p("flyingpress", "leapHeight", action));
            const leapSpeed = Math.max(0.2, p("flyingpress", "leapSpeed", action));
            const diveSpeed = Math.max(0.3, p("flyingpress", "diveSpeed", action));
            const radius = Math.max(0.4, p("flyingpress", "pressRadius", action));
            const power = p("flyingpress", "press", action);
            const push = Math.max(0, p("flyingpress", "push", action));
            const crush = Math.max(0, p("flyingpress", "crush", action));
            const reach = Math.max(1, p("flyingpress", "reach", action));
            const start = body.position();
            const rise = flyingpressRise(world, body, leapHeight);
            const apexY = start.y() + rise;
            const ascendTicks = Math.max(1, Math.ceil(rise / leapSpeed));
            const scale = radius / 0.9;
            let finished = false, diveEnd: CombatPoint | null = null;

            function finish(current: CombatAction): void { if (!finished) { finished = true; movementScenes.finish(current, done); } }
            /** 结算是发生在真实受击者身上，并只加限幅的原生受击运动。 */
            function knockdown(live: CombatWorld, victim: CombatActor, at: CombatPoint): void {
                const facts = live.observe(victim);
                if (facts === null) return;
                const away = facts.position().minus(at);
                if (away.length() > 0.2 && push > 0)
                    live.hitDisplace(victim, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                if (crush > 0) live.hitImpulse(victim, WorldCombat.point(0, -crush, 0));
            }
            /** 落地收束：压到实体才结算主伤与压制；撞墙只擦尘；压到落点只扬尘。都不回头补打原目标。 */
            function landed(current: CombatAction, at: CombatPoint, hit: CombatImpact | null, victim: CombatActor | null, mode: string): void {
                movementScenes.stop(current);
                const live = current.world();
                let applied = false;
                if (mode === "press" && hit !== null && victim !== null && live.valid(victim) && !live.friendly(victim))
                    applied = impact(current, hit, "flyingpress", power, { damage: damageSpec("flyingpress", "press"), contact: true });
                if (applied && victim !== null && live.valid(victim)) {
                    knockdown(live, victim, at);
                    WorldFeedback.emit(live, flyingpressScene, 1, at,
                        { moment: "press", target: String(victim.ref()), scale: scale,
                            intensity: Math.max(0.6, Math.min(2.2, power / 100)), count: Math.round(18 + power * 0.35) }, 30);
                    sound(current, "cobblemon:impact.fighting");
                    sound(current, "minecraft:entity.player.attack.strong");
                    WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.0, 0)), flyingpressHitText, [], 26);
                } else if (mode === "glance") {
                    WorldFeedback.emit(live, flyingpressScene, 1, at, { moment: "glance", scale: scale, face: hit !== null ? hit.blockFace() : "" }, 18);
                    WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.0, 0)), flyingpressMissText, [], 22);
                } else {
                    WorldFeedback.emit(live, flyingpressScene, 1, at,
                        { moment: "whiff", scale: scale, intensity: Math.max(0.5, Math.min(1.6, power / 120)) }, 18);
                    WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.0, 0)), flyingpressMissText, [], 22);
                }
                ground(current, 0, function () { finish(current); });
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
            /** 到顶后仅此一次重新定向：取当前目标位置或锁定瞄点，按 reach 预算截断后锁死。 */
            function beginDive(current: CombatAction): void {
                const live = current.world();
                const t = target !== null ? live.observe(target) : null;
                const at = t !== null && t.health() > 0 ? t.position() : aimPoint;
                const flat = WorldCombat.point(at.x() - start.x(), 0, at.z() - start.z());
                const distance = flat.length();
                diveEnd = distance > reach
                    ? WorldCombat.point(start.x() + flat.unit().scale(reach).x(), at.y(), start.z() + flat.unit().scale(reach).z())
                    : at;
                movementScenes.show(current, "mark", diveEnd,
                    { moment: "mark", scale: scale, intensity: Math.max(0.5, Math.min(1.6, power / 100)) });
                dive(current);
            }
            function dive(current: CombatAction): void {
                movementScenes.stop(current, "leap");
                const live = current.world(), self = live.observe(actor);
                if (self === null || diveEnd === null) { finish(current); return; }
                const toward = diveEnd.minus(self.position()), remaining = toward.length();
                if (remaining <= Math.max(0.4, radius)) { landed(current, diveEnd, null, null, "press"); return; }
                const step = Math.min(diveSpeed, remaining), delta = toward.unit().scale(step);
                const swept = sweepStep(current, delta, Math.max(0.35, radius * 0.7)), trace = swept.hit;
                const victim = trace.target();
                if (trace.hitEntity() && victim !== null && !current.sense().friendly(victim)) { landed(current, trace.position(), trace, victim, "press"); return; }
                if (trace.blocked()) { landed(current, trace.blockPosition() || current.origin(), trace, null, "glance"); return; }
                const moved = swept.moved + (trace.hitEntity() && swept.remaining.length() > 0.001 ? live.displace(actor, swept.remaining) : 0);
                if (moved < Math.min(0.05, step * 0.4)) { landed(current, current.origin(), null, null, "whiff"); return; }
                current.after(1, function (next: CombatAction) { dive(next); });
            }
            function ascend(current: CombatAction, step: number): void {
                const live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                if (step >= ascendTicks || self.position().y() >= apexY - 0.05) { beginDive(current); return; }
                const up = Math.min(leapSpeed, apexY - self.position().y());
                const moved = live.displace(actor, WorldCombat.point(0, up, 0));
                if (moved < up * 0.5) { beginDive(current); return; }
                current.after(1, function (next: CombatAction) { ascend(next, step + 1); });
            }

            sound(action, "cobblemon:move.aerialace.actor_1");
            movementScenes.show(action, "leap", start,
                { moment: "leap", height: rise, scale: scale, intensity: Math.max(0.7, Math.min(2, power / 100)) });
            ascend(action, 0);
        }
    });
}
