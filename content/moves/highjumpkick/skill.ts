/**
 * 飞膝踢 / highjumpkick 的出手方式。
 *
 * 核心念头：一记先垂直拔高、再直坠落膝的重击。压腿蓄力后几乎笔直拔上高空，在顶点短暂悬停——这段时间
 * 把落点画给对手看——随后膝头朝下砸进落点。命中是全族最重的一记接触伤害；砸空，整条腿硬磕地面，自伤最狠。
 * 它靠高度取胜，所以射程比飞踢短、起手更慢，顶点停滞既是签名也是被让开的窗口。
 *
 * 三幕（提交后由共享节奏驱动 execute）：
 *   起（windup，提交前）：压腿蓄力，只播预告，可免费打断。
 *   拔（提交后 rise）：逐刻上升，落点钉在目标实时位置；到顶后进入悬停。
 *   坠（apex → dive）：顶点 emit 落点标记并悬停 holdTicks，把落点锁死；随后沿直线下坠，途中 trace 撞到活体
 *       即按 knee 结算接触伤害并撞开 shove 格；到达落点在 hitRadius 内再选一次最近的敌人；都空即砸偏，按 crash 自伤。
 *
 * 与飞踢分开：飞踢是低平长弧，本招是先拔高再直坠的竖直线；顶点停滞与更重的膝击/自伤是它的签名。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）与位移（world.displace）走同一条路。
 */
namespace PokemonSkills {
    const highjumpkickScene = "world_combat:move_highjumpkick";
    const highjumpkickHitText = "world_combat.move.highjumpkick.text.hit";
    const highjumpkickCrashText = "world_combat.move.highjumpkick.text.crash";

    /** 从某点脚下向下找到最近地表的顶面高度；找不到就返回该点脚底的高度。 */
    function highjumpkickFloor(world: CombatWorld, point: CombatPoint, halfHeight: number): number {
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

    function highjumpkickGround(world: CombatWorld, point: CombatPoint, halfHeight: number): CombatPoint {
        return WorldCombat.point(point.x(), highjumpkickFloor(world, point, halfHeight), point.z());
    }

    function highjumpkickResetFall(world: CombatWorld, actor: CombatActor): void {
        try { const native = world.nativeEntity(actor); if (native) native.fallDistance = 0; } catch (error) { }
    }

    function highjumpkickAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    define({
        id: "highjumpkick",
        name: "High Jump Kick",
        description: "跳起后用膝盖撞对手进行攻击。如果撞偏则自己会受到伤害。",
        uses: ["用全族最重的一记接触伤害砸穿硬目标", "从上方压制一只贴脸的对手", "以一次高空跃击换取击退与身位"],
        kind: "enemy",
        range: 5.0,
        maxRange: 8.5,
        prepare: 8,
        active: 36,
        recover: 10,
        cooldown: 30,
        style: "aerial",
        maximumTicks: 240,
        interruptible: false,
        defaults: { vertical: false, ai: { maxChase: 9, minSelf: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("highjumpkick", "reach", pokemon), geometry: "circle", style: "aerial", color: 0xE25C4A,
                label: config && config.vertical === true ? "垂直落膝" : "斜向飞膝" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["highjumpkick"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("highjumpkick", "tempo", context)),
                recover: Math.round(p("highjumpkick", "aftercast", context)),
                cooldown: Math.round(p("highjumpkick", "recharge", context)),
                range: p("highjumpkick", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("highjumpkick:windup", highjumpkickScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", vertical: config && config.vertical === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }

            const leapHeight = Math.max(1.4, p("highjumpkick", "leapHeight", action));
            const leapSpeed = Math.max(0.2, p("highjumpkick", "leapSpeed", action));
            const diveSpeed = Math.max(0.4, p("highjumpkick", "diveSpeed", action));
            const drift = Math.max(0, p("highjumpkick", "drift", action));
            const hitRadius = Math.max(0.4, p("highjumpkick", "hitRadius", action));
            const power = p("highjumpkick", "knee", action);
            const crash = Math.max(0.03, Math.min(0.7, p("highjumpkick", "crash", action)));
            const shove = Math.max(0, p("highjumpkick", "shove", action));
            const dust = Math.max(4, Math.round(p("highjumpkick", "dust", action)));
            const holdTicks = Math.max(1, Math.round(p("highjumpkick", "holdTicks", action)));
            const settleSpeed = Math.max(0.2, p("highjumpkick", "settleSpeed", action));
            const scale = hitRadius / 0.7;
            const intensity = Math.max(0.6, Math.min(2.4, power / 130));
            const start = self.position();
            const apexY = start.y() + leapHeight;
            const target = action.target();
            const riseLimit = Math.max(1, Math.ceil(leapHeight / leapSpeed)) + 6;
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            let locked = targetBody !== null ? highjumpkickGround(world, targetBody.position(), targetBody.height() * 0.5)
                : highjumpkickGround(world, action.targetPosition(), 0.7);
            let finished = false;

            function finish(current: CombatAction): void { if (!finished) { finished = true; done(current); } }

            sound(action, "cobblemon:move.aerialace.actor_1");
            WorldFeedback.emit(world, highjumpkickScene, 1, start,
                { moment: "leap", height: leapHeight, scale: scale, intensity: intensity, dust: dust,
                    path: [[start.x(), start.y(), start.z()], [start.x(), apexY, start.z()]] }, 34);

            function settle(current: CombatAction): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                highjumpkickResetFall(live, actor);
                const floor = highjumpkickFloor(live, me.position(), me.height() * 0.5);
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
                    WorldFeedback.emit(live, highjumpkickScene, 1, at,
                        { moment: "crash", scale: scale, intensity: Math.max(0.7, Math.min(2.4, crash * 4)), dust: dust }, 30);
                    WorldFeedback.text(live, highjumpkickAbove(at), highjumpkickCrashText, [], 28);
                    sound(current, "minecraft:entity.generic.big_fall");
                }
                settle(current);
            }

            function impactOn(current: CombatAction, victim: CombatActor, at: CombatPoint, direction: CombatPoint): void {
                const live = current.world();
                const body = live.observe(victim);
                const point = body === null ? at : body.position();
                hurt(current, victim, "highjumpkick", power, { damage: damageSpec("highjumpkick", "knee"), contact: true });
                if (live.valid(victim)) {
                    const away = point.minus(live.observe(actor)!.position());
                    const flat = WorldCombat.point(away.x(), 0, away.z());
                    const push = flat.length() < 0.01 ? direction : flat.unit();
                    live.displace(victim, push.scale(shove));
                }
                WorldFeedback.emit(live, highjumpkickScene, 1, point,
                    { moment: "impact", target: String(victim.ref()), scale: scale, intensity: intensity, dust: dust,
                        count: Math.round(22 + power * 0.4),
                        direction: [direction.x(), direction.y(), direction.z()] }, 34);
                sound(current, "cobblemon:impact.fighting");
                sound(current, "minecraft:entity.player.attack.strong");
                WorldFeedback.text(live, highjumpkickAbove(point), highjumpkickHitText, [], 28);
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
                const floor = highjumpkickFloor(live, from, me.height() * 0.5);
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
                highjumpkickResetFall(live, actor);
                const moved = live.displace(actor, delta);
                if (moved < Math.min(0.06, stepLen * 0.4)) { resolve(current, from, dir); return; }
                WorldFeedback.keep(live, "highjumpkick:dive:" + String(actor.ref()), highjumpkickScene, 1, from,
                    { moment: "dive", scale: scale, intensity: intensity, hitRadius: hitRadius,
                        direction: [dir.x(), dir.y(), dir.z()],
                        path: [[from.x(), from.y(), from.z()], [locked.x(), locked.y(), locked.z()]] }, 5);
                current.after(1, function (next) { dive(next); });
            }

            function apex(current: CombatAction, wait: number): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                highjumpkickResetFall(live, actor);
                if (wait >= holdTicks) { dive(current); return; }
                WorldFeedback.keep(live, "highjumpkick:apex:" + String(actor.ref()), highjumpkickScene, 1, me.position(),
                    { moment: "apex", scale: scale, hitRadius: hitRadius, intensity: intensity,
                        point: [locked.x(), locked.y(), locked.z()] }, 8);
                current.after(1, function (next) { apex(next, wait + 1); });
            }

            function rise(current: CombatAction, step: number): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                if (target !== null && live.valid(target)) {
                    const body = live.observe(target);
                    if (body !== null) locked = highjumpkickGround(live, body.position(), body.height() * 0.5);
                }
                if (step >= riseLimit || me.position().y() >= apexY - 0.05) { apex(current, 0); return; }
                const up = Math.min(leapSpeed, Math.max(0, apexY - me.position().y()));
                const flatX = locked.x() - me.position().x(), flatZ = locked.z() - me.position().z();
                const flat = Math.sqrt(flatX * flatX + flatZ * flatZ);
                const horiz = Math.min(drift, flat);
                const delta = WorldCombat.point(flat < 0.01 ? 0 : flatX / flat * horiz, up, flat < 0.01 ? 0 : flatZ / flat * horiz);
                highjumpkickResetFall(live, actor);
                live.displace(actor, delta);
                WorldFeedback.keep(live, "highjumpkick:rise:" + String(actor.ref()), highjumpkickScene, 1, me.position(),
                    { moment: "leap", height: leapHeight, scale: scale, intensity: intensity, dust: dust }, 6);
                current.after(1, function (next) { rise(next, step + 1); });
            }

            rise(action, 0);
        }
    });
}
