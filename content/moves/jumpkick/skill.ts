/**
 * 飞踢 / jumpkick 的出手方式。
 *
 * 核心念头：一记助跑后的低平腾空飞踢——缩身、蹬地，沿一条浅浅的抛物线冲上去，腿在弧线上横着扫出。
 * 踢实就是把对手连人带势踹开；踢偏，脚踝硬磕地面，按坠势自伤。本招是跳击家族的基准线：干净、可读、
 * 风险中等，谁都用得起。
 *
 * 两幕（提交后由共享节奏驱动 execute）：
 *   起（windup，提交前）：缩身蓄势，只播预告表现，可免费打断。
 *   跃与踢（提交后）：逐刻沿抛物线先升后俯；上升阶段把落点钉在目标实时位置，进入俯冲时把落点锁死，
 *       此后对手横移就能让开。俯冲途中 trace 撞到活体即按 kick 结算接触伤害、沿飞踢方向踹开 shove 格；
 *       到达落点时在 hitRadius 内再选一次最近的敌人；都空才是踢偏，按 crash 比例自伤。落回地面后收招。
 *
 * 与同族分开：飞膝踢先拔高再直坠、更重更狠；下压踢是抬腿下劈的两拍；闪电强袭带电蓄势。
 * 飞踢是其中最低平、最快、反伤最轻的一记。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）与位移（world.displace）走同一条路。
 */
namespace PokemonSkills {
    const jumpkickScene = "world_combat:move_jumpkick";
    const jumpkickHitText = "world_combat.move.jumpkick.text.hit";
    const jumpkickCrashText = "world_combat.move.jumpkick.text.crash";

    /** 从某点脚下向下找到最近地表的顶面高度；找不到就返回该点脚底的高度。 */
    function jumpkickFloor(world: CombatWorld, point: CombatPoint, halfHeight: number): number {
        const feet = point.y() - halfHeight;
        for (let step = 0; step <= 24; step++) {
            const block = world.block(WorldCombat.point(point.x(), feet - step, point.z()));
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return Math.floor(feet - step) + 1;
        }
        return feet;
    }

    /** 把一个身体中心的水平位置投到其正下方地表，得到落点。 */
    function jumpkickGround(world: CombatWorld, point: CombatPoint, halfHeight: number): CombatPoint {
        const floor = jumpkickFloor(world, point, halfHeight);
        return WorldCombat.point(point.x(), floor, point.z());
    }

    /** 清一次坠落距离：腾空与落地由本招自己结算，不让原生物理再补一次坠落伤害。 */
    function jumpkickResetFall(world: CombatWorld, actor: CombatActor): void {
        try { const native = world.nativeEntity(actor); if (native) native.fallDistance = 0; } catch (error) { }
    }

    function jumpkickAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    define({
        freeMovement: true,
        id: "jumpkick",
        cooldownParameter: "recharge",
        name: "Jump Kick",
        description: "一记低平的腾空飞踢：缩身蹬地，沿浅弧冲上去，腿横着扫出。踢实就把对手踹开，踢偏脚踝硬磕地面、自伤一截。跳击家族里最干净、最快的一记。",
        uses: ["用一记便宜的腾空踢打出接触伤害", "把贴脸的对手踹开、拉出身位", "给残血对手补上最后一脚"],
        kind: "enemy",
        range: 5.5,
        maxRange: 9,
        prepare: 7,
        active: 30,
        recover: 9,
        cooldown: 26,
        style: "aerial",
        maximumTicks: 220,
        interruptible: false,
        defaults: { running: false, ai: { maxChase: 9, preferWeak: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("jumpkick", "reach", pokemon), geometry: "circle", style: "aerial", color: 0xA9CF7A,
                label: config && config.running === true ? "助跑飞踢" : "原地飞踢" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["jumpkick"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("jumpkick", "tempo", context)),
                recover: Math.round(p("jumpkick", "aftercast", context)),
                cooldown: Math.round(p("jumpkick", "recharge", context)),
                range: p("jumpkick", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("jumpkick:windup", jumpkickScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", running: config && config.running === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }

            const leapHeight = Math.max(1.2, p("jumpkick", "leapHeight", action));
            const leapSpeed = Math.max(0.2, p("jumpkick", "leapSpeed", action));
            const diveSpeed = Math.max(0.4, p("jumpkick", "diveSpeed", action));
            const drift = Math.max(0, p("jumpkick", "drift", action));
            const hitRadius = Math.max(0.4, p("jumpkick", "hitRadius", action));
            const power = p("jumpkick", "kick", action);
            const crash = Math.max(0.03, Math.min(0.6, p("jumpkick", "crash", action)));
            const shove = Math.max(0, p("jumpkick", "shove", action));
            const dust = Math.max(4, Math.round(p("jumpkick", "dust", action)));
            const traceAhead = Math.max(1, p("jumpkick", "traceAhead", action));
            const settleSpeed = Math.max(0.2, p("jumpkick", "settleSpeed", action));
            const scale = hitRadius / 0.65;
            const intensity = Math.max(0.6, Math.min(2.2, power / 100));
            const start = self.position();
            const apexY = start.y() + leapHeight;
            const target = action.target();
            const riseLimit = Math.max(1, Math.ceil(leapHeight / leapSpeed)) + 6;
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            let locked = targetBody !== null ? jumpkickGround(world, targetBody.position(), targetBody.height() * 0.5)
                : jumpkickGround(world, action.targetPosition(), 0.7);
            let finished = false;

            function finish(current: CombatAction): void { if (!finished) { finished = true; done(current); } }

            sound(action, "minecraft:entity.player.attack.strong");
            WorldFeedback.emit(world, jumpkickScene, 1, start,
                { moment: "leap", height: leapHeight, scale: scale, intensity: intensity, dust: dust,
                    path: [[start.x(), start.y(), start.z()], [locked.x(), apexY, locked.z()]] }, 30);

            function settle(current: CombatAction): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                jumpkickResetFall(live, actor);
                const floor = jumpkickFloor(live, me.position(), me.height() * 0.5);
                const feet = me.position().y() - me.height() * 0.5;
                if (feet > floor + 0.15) {
                    live.displace(actor, WorldCombat.point(0, -Math.max(0.4, Math.min(settleSpeed, feet - floor + 0.3)), 0));
                    current.after(1, function (next) { settle(next); });
                    return;
                }
                finish(current);
            }

            function crashLanding(current: CombatAction, at: CombatPoint): void {
                const live = current.world(), body = live.observe(actor);
                if (body !== null) {
                    live.health(actor, -body.maxHealth() * crash, "world_combat:crash");
                    WorldFeedback.emit(live, jumpkickScene, 1, at,
                        { moment: "crash", scale: scale, intensity: Math.max(0.6, Math.min(2.2, crash * 4)), dust: dust }, 26);
                    WorldFeedback.text(live, jumpkickAbove(at), jumpkickCrashText, [], 26);
                }
                sound(current, "minecraft:entity.generic.big_fall");
                settle(current);
            }

            function impactOn(current: CombatAction, victim: CombatActor, at: CombatPoint, direction: CombatPoint): void {
                const live = current.world();
                const body = live.observe(victim);
                const point = body === null ? at : body.position();
                hurt(current, victim, "jumpkick", power, { damage: damageSpec("jumpkick", "kick"), contact: true });
                if (live.valid(victim)) {
                    const away = point.minus(live.observe(actor)!.position());
                    const flat = WorldCombat.point(away.x(), 0, away.z());
                    const push = flat.length() < 0.01 ? direction : flat.unit();
                    live.displace(victim, push.scale(shove));
                }
                WorldFeedback.emit(live, jumpkickScene, 1, point,
                    { moment: "impact", target: String(victim.ref()), scale: scale, intensity: intensity, dust: dust,
                        count: Math.round(18 + power * 0.35),
                        direction: [direction.x(), direction.y(), direction.z()] }, 30);
                sound(current, "cobblemon:impact.fighting");
                sound(current, "minecraft:entity.player.attack.strong");
                WorldFeedback.text(live, jumpkickAbove(point), jumpkickHitText, [], 26);
                settle(current);
            }

            function resolve(current: CombatAction, at: CombatPoint, direction: CombatPoint): void {
                const live = current.world();
                let victim: CombatActor | null = null, best = 1e9;
                const region = WorldGeometry.ring(at, 0, hitRadius, { below: 1, above: 2 });
                WorldGeometry.selectEnemies(live, region, function (candidate, facts) {
                    if (String(candidate.ref()) === String(actor.ref())) return;
                    const gap = facts.position().minus(at).length();
                    if (gap < best) { best = gap; victim = candidate; }
                });
                if (victim === null && target !== null && live.valid(target)) {
                    const body = live.observe(target);
                    if (body !== null && body.health() > 0 && body.position().minus(at).length() <= hitRadius + body.width()) victim = target;
                }
                if (victim !== null) impactOn(current, victim, at, direction);
                else crashLanding(current, at);
            }

            function dive(current: CombatAction): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                const from = me.position();
                const toward = locked.minus(from);
                const distance = toward.length();
                const floor = jumpkickFloor(live, from, me.height() * 0.5);
                if (distance <= Math.max(0.5, hitRadius) || from.y() - me.height() * 0.5 <= floor + 0.15) {
                    resolve(current, locked, toward.length() < 0.01 ? WorldCombat.point(0, -1, 0) : toward.unit());
                    return;
                }
                const dir = toward.unit();
                const stepLen = Math.min(diveSpeed, distance);
                const delta = dir.scale(stepLen);
                const trace = current.trace(from, from.plus(dir.scale(Math.max(stepLen, hitRadius))), hitRadius);
                if (trace.hitEntity()) {
                    const victim = trace.target();
                    if (victim !== null && String(victim.ref()) !== String(actor.ref()) && !live.friendly(victim)) {
                        impactOn(current, victim, trace.position(), dir);
                        return;
                    }
                }
                if (trace.blocked()) { resolve(current, from.plus(delta.scale(0.5)), dir); return; }
                jumpkickResetFall(live, actor);
                const moved = live.displace(actor, delta);
                if (moved < Math.min(0.06, stepLen * 0.4)) { resolve(current, from, dir); return; }
                WorldFeedback.keep(live, "jumpkick:dive:" + String(actor.ref()), jumpkickScene, 1, from,
                    { moment: "dive", scale: scale, intensity: intensity, hitRadius: hitRadius,
                        direction: [dir.x(), dir.y(), dir.z()],
                        path: [[from.x(), from.y(), from.z()], [locked.x(), locked.y(), locked.z()]] }, 5);
                current.after(1, function (next) { dive(next); });
            }

            function rise(current: CombatAction, step: number): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                if (target !== null && live.valid(target)) {
                    const body = live.observe(target);
                    if (body !== null) locked = jumpkickGround(live, body.position(), body.height() * 0.5);
                }
                if (step >= riseLimit || me.position().y() >= apexY - 0.05) { dive(current); return; }
                const up = Math.min(leapSpeed, Math.max(0, apexY - me.position().y()));
                const flatX = locked.x() - me.position().x(), flatZ = locked.z() - me.position().z();
                const flat = Math.sqrt(flatX * flatX + flatZ * flatZ);
                const horiz = Math.min(drift, flat);
                const delta = WorldCombat.point(flat < 0.01 ? 0 : flatX / flat * horiz, up, flat < 0.01 ? 0 : flatZ / flat * horiz);
                jumpkickResetFall(live, actor);
                live.displace(actor, delta);
                WorldFeedback.keep(live, "jumpkick:rise:" + String(actor.ref()), jumpkickScene, 1, me.position(),
                    { moment: "leap", height: leapHeight, scale: scale, intensity: intensity, dust: dust }, 6);
                current.after(1, function (next) { rise(next, step + 1); });
            }

            rise(action, 0);
        }
    });
}
