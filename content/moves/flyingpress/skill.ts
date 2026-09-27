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

    /** Native support includes slabs and collision shapes; no surface is not a landing. */
    function flyingpressSurface(world: CombatWorld, body: CombatObservation): number | null {
        const from = body.position(), feet = WorldCombat.point(from.x(), body.boundsMin().y(), from.z());
        const support = SurfacePaths.support(world, feet, 0.1, 24);
        return support === null ? null : support.y();
    }

    /** 头顶到最近顶板之间的真实净空（按方块判定，忽略自身碰撞箱）；顶板/方块把它截短，返回真实可升程。 */
    function flyingpressRise(world: CombatWorld, body: CombatObservation, desired: number): number {
        const centre = body.position();
        let clearance = 0;
        for (let step = 0.2; step <= desired + 0.2; step += 0.2) {
            const up = Math.min(step, desired);
            if (!world.freeSpace(WorldCombat.point(centre.x(), body.boundsMin().y() + up, centre.z()), body.width(), body.height())) break;
            clearance = up;
            if (up === desired) break;
        }
        return clearance;
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
        windup: function (action, config, prepare) {
            action.present("flyingpress:crouch", flyingpressScene, 1, action.origin(),
                JSON.stringify({ moment: "crouch", highDive: config && config.highDive === true }));
            // 保留 resolve 已经算进高低档成本的起手，不再退回公式原值。
            return prepare;
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
                const horizontal = WorldCombat.point(away.x(), 0, away.z());
                if (horizontal.length() > 0.2 && push > 0)
                    live.hitDisplace(victim, horizontal.unit().scale(push));
                if (crush > 0) live.hitImpulse(victim, WorldCombat.point(0, -crush, 0));
            }
            /** 落地收束：压到实体才结算主伤与压制；撞墙只擦尘；压到落点只扬尘。都不回头补打原目标。 */
            function landed(current: CombatAction, at: CombatPoint, hit: CombatImpact | null, victim: CombatActor | null, mode: string): void {
                movementScenes.stop(current);
                const live = current.world();
                // 先记住受击者身份：这一击可能把它打倒，成功反馈不能因为 valid 变 false 而丢失。
                const victimRef = victim !== null ? String(victim.ref()) : "";
                let applied = false;
                if (mode === "press" && hit !== null && victim !== null && live.valid(victim) && !live.friendly(victim))
                    applied = impact(current, hit, "flyingpress", power, { damage: damageSpec("flyingpress", "press"), contact: true });
                if (applied) {
                    if (victim !== null && live.valid(victim)) knockdown(live, victim, at);
                    WorldFeedback.emit(live, flyingpressScene, 1, at,
                        { moment: "press", target: victimRef, scale: scale,
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
                ground(current, 0, finish);
            }
            function ground(current: CombatAction, guard: number, complete: (current: CombatAction) => void): void {
                const live = current.world(), self = live.observe(actor);
                if (self === null || guard > 60) { complete(current); return; }
                const feet = self.boundsMin().y(), floor = flyingpressSurface(live, self);
                if (floor === null) { complete(current); return; }
                if (feet > floor + 0.05) {
                    // 归地逐短段，贴近真实支撑面下落，不一步跨过。
                    live.displace(actor, WorldCombat.point(0, -Math.max(0.25, Math.min(0.6, feet - floor + 0.1)), 0));
                    current.after(1, function (next: CombatAction) { ground(next, guard + 1, complete); });
                    return;
                }
                // 只有脚真正落到支撑面才播落地。
                WorldFeedback.emit(live, flyingpressScene, 1, self.position(), { moment: "land" }, 16);
                complete(current);
            }
            /** 到顶后仅此一次重新定向：取当前目标位置或锁定瞄点，按 reach 预算截断后锁死。 */
            function beginDive(current: CombatAction): void {
                const live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                const t = target !== null ? live.observe(target) : null;
                const locked = t !== null && t.health() > 0;
                const at = locked ? t!.position() : aimPoint;
                const flat = WorldCombat.point(at.x() - start.x(), 0, at.z() - start.z());
                const distance = flat.length();
                // 俯压只能向下：锁点高于当刻身体时压不到，止于当刻高度，成为一次贴低压/空过。
                const pressedY = Math.min(at.y(), self.position().y());
                const toward = distance > reach
                    ? WorldCombat.point(start.x() + flat.unit().scale(reach).x(), pressedY, start.z() + flat.unit().scale(reach).z())
                    : WorldCombat.point(at.x(), pressedY, at.z());
                diveEnd = toward;
                // 脚点预告：锁到实体时钉在它脚下，否则落在锁定水平位置的真实支撑面上；与实际下压终点同一水平位置。
                const foot = locked && t !== null ? WorldCombat.point(at.x(), t.boundsMin().y(), at.z()) : WorldGeometry.ground(live, toward, 8);
                movementScenes.show(current, "mark", foot,
                    { moment: "mark", scale: scale, intensity: Math.max(0.5, Math.min(1.6, power / 100)) });
                // 持续俯冲姿态：源绑定的尾迹沿身体的真实下压路线发射。
                movementScenes.show(current, "dive", self.position(),
                    { moment: "dive", scale: scale, intensity: Math.max(0.6, Math.min(2, power / 100)) });
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
