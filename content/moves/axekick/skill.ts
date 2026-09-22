/**
 * 下压踢 / axekick 的出手方式。
 *
 * 核心念头：一次抬腿高劈、脚踵直落的两拍动作。先把腿抬到高处（起手，是对手读得到的预告），再一脚踵
 * 朝下劈进对手头顶；劈中会砸乱对手的架势，有概率把它劈得恍惚。劈空，脚踵砸地、自伤一截。它几乎原地起落，
 * 是跳击家族里最贴地、自伤最轻的一招，签名是那条抬起→直落的斧劈线。
 *
 * 三幕（提交后由共享节奏驱动 execute）：
 *   起（windup，提交前）：抬腿蓄势，只播预告，可免费打断。
 *   抬（提交后 rise）：短促拔起，落点钉在目标实时位置。
 *   劈（apex → chop）：顶点锁死落点并 emit 斧线；随后沿直线下劈，trace 撞到活体即按 chop 结算接触伤害、
 *       掷一次 dazeChance 决定是否把震撼挂成本单元的恍惚载体（共享身份 world_combat:status/confusion），
 *       并撞开 shove 格；到达落点在 hitRadius 内再选一次最近的敌人；都空即劈偏，按 crash 自伤。
 *
 * 恍惚行为（本单元写）：被劈晕的目标每次试图出手按载体振幅掷骰、中则本次出手作废；
 * 它打中非友方时按自身攻击结算一道自伤。消费方用 CombatStatus.has(world, actor, "confusion") 按身份读取。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）、位移（world.displace）与状态
 * （真实 MC MobEffect）都走同一条路。
 */
namespace PokemonSkills {
    const axekickScene = "world_combat:move_axekick";
    const axekickRing = "world_combat:axekick_ring";
    const axekickHitText = "world_combat.move.axekick.text.hit";
    const axekickCrashText = "world_combat.move.axekick.text.crash";
    const axekickDazeText = "world_combat.move.axekick.text.daze";
    const axekickRecoilFraction = 0.05;

    /** 从某点脚下向下找到最近地表的顶面高度；找不到就返回该点脚底的高度。 */
    function axekickFloor(world: CombatWorld, point: CombatPoint, halfHeight: number): number {
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

    function axekickGround(world: CombatWorld, point: CombatPoint, halfHeight: number): CombatPoint {
        return WorldCombat.point(point.x(), axekickFloor(world, point, halfHeight), point.z());
    }

    function axekickResetFall(world: CombatWorld, actor: CombatActor): void {
        world.motion(actor, WorldCombat.point(0, 0, 0), false);
        try { const native = world.nativeEntity(actor); if (native) native.fallDistance = 0; } catch (error) { }
    }

    function axekickAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    /** 本单元自己的恍惚载体：只有当代表载体就是本单元的 id 时，本单元的行为才接管。 */
    function axekickCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === axekickRing ? effect : null;
    }

    define({
        id: "axekick",
        name: "Axe Kick",
        description: "将踢起的脚跟往下劈向对手进行攻击。有时会使对手混乱。如果劈偏则自己会受到伤害。",
        uses: ["用一记直落的下劈砸穿硬目标", "给刚起手/刚增益的对手一记恍惚", "贴脸时用最轻自伤的一记收尾"],
        kind: "enemy",
        range: 4.2,
        maxRange: 7.5,
        prepare: 7,
        active: 30,
        recover: 9,
        cooldown: 28,
        style: "aerial",
        maximumTicks: 220,
        interruptible: false,
        defaults: { high: false, ai: { maxChase: 8, spareConfused: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("axekick", "reach", pokemon), geometry: "circle", style: "aerial", color: 0x9B6BE0,
                label: config && config.high === true ? "高劈" : "低位快劈" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["axekick"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("axekick", "tempo", context)),
                recover: Math.round(p("axekick", "aftercast", context)),
                cooldown: Math.round(p("axekick", "recharge", context)),
                range: p("axekick", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("axekick:windup", axekickScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", high: config && config.high === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }

            const hopHeight = Math.max(1.0, p("axekick", "hopHeight", action));
            const hopSpeed = Math.max(0.2, p("axekick", "hopSpeed", action));
            const chopSpeed = Math.max(0.4, p("axekick", "chopSpeed", action));
            const drift = Math.max(0, p("axekick", "drift", action));
            const hitRadius = Math.max(0.4, p("axekick", "hitRadius", action));
            const power = p("axekick", "chop", action);
            const crash = Math.max(0.03, Math.min(0.6, p("axekick", "crash", action)));
            const shove = Math.max(0, p("axekick", "shove", action));
            const dust = Math.max(4, Math.round(p("axekick", "dust", action)));
            const dazeChance = p("axekick", "dazeChance", action);
            const fumbleChance = p("axekick", "fumbleChance", action);
            const dazeTicks = Math.max(20, Math.round(p("axekick", "dazeTicks", action)));
            const settleSpeed = Math.max(0.2, p("axekick", "settleSpeed", action));
            const scale = hitRadius / 0.6;
            const intensity = Math.max(0.6, Math.min(2.2, power / 120));
            const start = self.position();
            const apexY = start.y() + hopHeight;
            const target = action.target();
            const riseLimit = Math.max(1, Math.ceil(hopHeight / hopSpeed)) + 4;
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            let locked = targetBody !== null ? axekickGround(world, targetBody.position(), targetBody.height() * 0.5)
                : axekickGround(world, action.targetPosition(), 0.7);
            let finished = false;

            function finish(current: CombatAction): void { if (!finished) { finished = true; done(current); } }

            sound(action, "cobblemon:move.aerialace.actor_1");
            WorldFeedback.emit(world, axekickScene, 1, start,
                { moment: "raise", height: hopHeight, scale: scale, intensity: intensity, dust: dust,
                    path: [[start.x(), start.y(), start.z()], [start.x(), apexY, start.z()]] }, 30);

            function settle(current: CombatAction): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                axekickResetFall(live, actor);
                const floor = axekickFloor(live, me.position(), me.height() * 0.5);
                const feet = me.position().y() - me.height() * 0.5;
                if (feet > floor + 0.15) {
                    live.displace(actor, WorldCombat.point(0, -Math.max(0.4, Math.min(settleSpeed, feet - floor + 0.3)), 0));
                    current.after(1, function (next) { settle(next); });
                    return;
                }
                finish(current);
            }

            function daze(current: CombatAction, victim: CombatActor, at: CombatPoint): void {
                const live = current.world();
                const ticks = dazeTicks;
                if (live.random() >= dazeChance) return;
                if (!CombatStatus.apply(live, victim, "confusion", axekickRing, ticks, Math.round(fumbleChance * 100), { unique: true })) return;
                const body = live.observe(victim);
                const point = body === null ? at : body.position();
                WorldFeedback.emit(live, axekickScene, 1, point,
                    { moment: "daze", target: String(victim.ref()), scale: scale, chance: dazeChance,
                        intensity: Math.max(0.6, Math.min(2, dazeChance * 3)) }, 40);
                WorldFeedback.text(live, axekickAbove(point), axekickDazeText, [Math.round(ticks / 20)], 42);
                sound(current, "cobblemon:status.volatile.confusion.actor");
            }

            function crashLanding(current: CombatAction, at: CombatPoint): void {
                const live = current.world(), body = live.observe(actor);
                if (body !== null) {
                    live.health(actor, -body.maxHealth() * crash, "world_combat:crash");
                    WorldFeedback.emit(live, axekickScene, 1, at,
                        { moment: "crash", scale: scale, intensity: Math.max(0.6, Math.min(2.2, crash * 4)), dust: dust }, 24);
                    WorldFeedback.text(live, axekickAbove(at), axekickCrashText, [], 26);
                }
                sound(current, "minecraft:entity.generic.big_fall");
                settle(current);
            }

            function impactOn(current: CombatAction, victim: CombatActor, at: CombatPoint, direction: CombatPoint): void {
                const live = current.world();
                const body = live.observe(victim);
                const point = body === null ? at : body.position();
                if (!hurt(current, victim, "axekick", power, { damage: damageSpec("axekick", "chop"), contact: true })) {
                    crashLanding(current, at); return;
                }
                if (live.valid(victim)) {
                    const away = point.minus(live.observe(actor)!.position());
                    const flat = WorldCombat.point(away.x(), 0, away.z());
                    const push = flat.length() < 0.01 ? direction : flat.unit();
                    live.displace(victim, push.scale(shove));
                }
                WorldFeedback.emit(live, axekickScene, 1, point,
                    { moment: "impact", target: String(victim.ref()), scale: scale, intensity: intensity, dust: dust,
                        count: Math.round(18 + power * 0.35),
                        direction: [direction.x(), direction.y(), direction.z()] }, 28);
                sound(current, "cobblemon:impact.fighting");
                sound(current, "minecraft:entity.player.attack.sweep");
                WorldFeedback.text(live, axekickAbove(point), axekickHitText, [], 26);
                if (live.valid(victim)) daze(current, victim, point);
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
                if (victim === null && target !== null && live.valid(target) && !live.friendly(target)) {
                    const body = live.observe(target);
                    if (body !== null && body.visible() && body.health() > 0 && body.position().minus(at).length() <= hitRadius + body.width()) victim = target;
                }
                if (victim !== null) impactOn(current, victim, at, direction);
                else crashLanding(current, at);
            }

            function chop(current: CombatAction): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                const from = me.position();
                const toward = locked.minus(from);
                const distance = toward.length();
                const floor = axekickFloor(live, from, me.height() * 0.5);
                if (distance <= Math.max(0.5, hitRadius) || from.y() - me.height() * 0.5 <= floor + 0.15) {
                    resolve(current, from, toward.length() < 0.01 ? WorldCombat.point(0, -1, 0) : toward.unit());
                    return;
                }
                const dir = toward.unit();
                const stepLen = Math.min(chopSpeed, distance);
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
                axekickResetFall(live, actor);
                const moved = live.displace(actor, delta);
                if (moved < Math.min(0.06, stepLen * 0.4)) { resolve(current, from, dir); return; }
                WorldFeedback.keep(live, "axekick:chop:" + String(actor.ref()), axekickScene, 1, from,
                    { moment: "chop", scale: scale, intensity: intensity, hitRadius: hitRadius,
                        direction: [dir.x(), dir.y(), dir.z()],
                        path: [[from.x(), from.y(), from.z()], [locked.x(), locked.y(), locked.z()]] }, 5);
                current.after(1, function (next) { chop(next); });
            }

            function raise(current: CombatAction, step: number): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                if (target !== null && live.valid(target)) {
                    const body = live.observe(target);
                    if (body !== null) locked = axekickGround(live, body.position(), body.height() * 0.5);
                }
                if (step >= riseLimit || me.position().y() >= apexY - 0.05) { chop(current); return; }
                const up = Math.min(hopSpeed, Math.max(0, apexY - me.position().y()));
                const flatX = locked.x() - me.position().x(), flatZ = locked.z() - me.position().z();
                const flat = Math.sqrt(flatX * flatX + flatZ * flatZ);
                const horiz = Math.min(drift, flat);
                const delta = WorldCombat.point(flat < 0.01 ? 0 : flatX / flat * horiz, up, flat < 0.01 ? 0 : flatZ / flat * horiz);
                axekickResetFall(live, actor);
                live.displace(actor, delta);
                WorldFeedback.keep(live, "axekick:raise:" + String(actor.ref()), axekickScene, 1, me.position(),
                    { moment: "raise", height: hopHeight, scale: scale, intensity: intensity, dust: dust }, 6);
                current.after(1, function (next) { raise(next, step + 1); });
            }

            raise(action, 0);
        }
    });


    // 反噬：被劈晕的目标打中非友方时，按自身攻击结算一道自伤。
    WorldCombat.on("world_combat:move_axekick/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (axekickCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.atk || 0;
        const fraction = axekickRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
        if (loss <= 0) return;
        WorldFeedback.emit(world, axekickScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()) }, 22);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });

    // 恍惚存续期：目标头顶低密度绕一圈困惑气泡，每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_axekick/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== axekickRing) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "axekick:" + String(actor.ref()), axekickScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });
}
