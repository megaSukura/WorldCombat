/**
 * 闪电强袭 / supercellslam 的出手方式。
 *
 * 核心念头：一次蓄电—下坠的电击落体。起手让身体带电（电荷按蓄电配置与升空时间累积，身上电花越聚越密），
 * 随后腾空压向对手；命中时把整身电荷在落点一次放掉，电花迸发、对手被顶开；落空则是带电身体砸在地上，
 * 电荷反噬自己。它是跳击家族里唯一带电、唯一的远程属性伤害。
 *
 * 三幕（提交后由共享节奏驱动 execute）：
 *   起（windup，提交前）：带电蓄势，只播预告，可免费打断。
 *   腾（提交后 rise）：逐刻上升；提交即锁线，之后只朝冻结的落点爬升，电荷随实际爬升高度累积（表现层）。
 *   坠（提交后 dive）：沿锁定斜线扑下，真实本体 sweep 撞到第一个非友方活体即命中并落地收势（共享结算电属性相性/本系）、
 *       在命中点放掉电荷、把对手顶开 shove 格；半途撞墙或到点都为空扑，就在真实落点按 crash 反噬一次，不回头补目标。
 *
 * 与同族分开：其余三招是纯格斗的暖色弧线，本招是电黄近白的蓄电落体，签名是升空期间不断叠加的电荷与落点那一下放电。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）与位移（world.displace）走同一条路；
 * 电属性相性/本系是宝可梦层，由共享结算完成。
 */
namespace PokemonSkills {
    const supercellslamScene = "world_combat:move_supercellslam";
    const supercellslamHitText = "world_combat.move.supercellslam.text.hit";
    const supercellslamCrashText = "world_combat.move.supercellslam.text.crash";

    /** 从某点脚下向下找到最近地表的顶面高度；找不到就返回该点脚底的高度。 */
    function supercellslamFloor(world: CombatWorld, point: CombatPoint, halfHeight: number): number {
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

    function supercellslamGround(world: CombatWorld, point: CombatPoint, halfHeight: number): CombatPoint {
        return WorldCombat.point(point.x(), supercellslamFloor(world, point, halfHeight), point.z());
    }

    function supercellslamResetFall(world: CombatWorld, actor: CombatActor): void {
        try { const native = world.nativeEntity(actor); if (native) native.fallDistance = 0; } catch (error) { }
    }

    function supercellslamAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    define({
        freeMovement: true,
        id: "supercellslam",
        cooldownParameter: "recharge",
        name: "Supercell Slam",
        description: "蓄电后跃起，向目标猛冲并释放电击，将其击退。落空会使自身受到反伤。",
        uses: ["用带电压坠打出电属性的远程强袭", "把蓄好的电荷一次放掉、顶开贴脸的对手", "在安全距离用电击消耗硬目标"],
        kind: "enemy",
        range: 5.5,
        maxRange: 9,
        prepare: 7,
        active: 30,
        recover: 9,
        cooldown: 28,
        style: "aerial",
        maximumTicks: 220,
        interruptible: false,
        defaults: { charge: 0, ai: { maxChase: 10, minSelf: 0.3 } },
        fields: [],
        indicator: function (config, pokemon) {
            const level = config && typeof config.charge === "number" ? config.charge : 0;
            return { radius: p("supercellslam", "reach", pokemon), geometry: "circle", style: "aerial", color: 0xFFE463,
                label: level > 0 ? "蓄电强袭 " + level + " 级" : "快速轻坠" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["supercellslam"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("supercellslam", "tempo", context)),
                recover: Math.round(p("supercellslam", "aftercast", context)),
                cooldown: Math.round(p("supercellslam", "recharge", context)),
                range: p("supercellslam", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const level = config && typeof config.charge === "number" ? config.charge : 0;
            action.present("supercellslam:windup", supercellslamScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", charge: level }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(supercellslamScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { movementScenes.finish(action, done); return; }

            const leapHeight = Math.max(1.4, p("supercellslam", "leapHeight", action));
            const leapSpeed = Math.max(0.2, p("supercellslam", "leapSpeed", action));
            const diveSpeed = Math.max(0.4, p("supercellslam", "diveSpeed", action));
            const drift = Math.max(0, p("supercellslam", "drift", action));
            const hitRadius = Math.max(0.4, p("supercellslam", "hitRadius", action));
            const power = p("supercellslam", "slam", action);
            const crash = Math.max(0.03, Math.min(0.6, p("supercellslam", "crash", action)));
            const shove = Math.max(0, p("supercellslam", "shove", action));
            const dust = Math.max(4, Math.round(p("supercellslam", "dust", action)));
            const sparks = Math.max(6, Math.round(p("supercellslam", "sparks", action)));
            const charge = config && typeof config.charge === "number" ? config.charge : 0;
            const settleSpeed = Math.max(0.2, p("supercellslam", "settleSpeed", action));
            const scale = hitRadius / 0.7;
            const intensity = Math.max(0.6, Math.min(2.4, power / 100));
            // 提交后锁线：冻结最后一次目标点，之后整段下扑只走这条锁定线，不再追实体。
            action.releaseTarget();
            const start = self.position();
            const apexY = start.y() + leapHeight;
            const riseLimit = Math.max(1, Math.ceil(leapHeight / leapSpeed)) + 6;
            const locked = supercellslamGround(world, action.targetPosition(), 0.7);
            let charged = charge;
            let finished = false;

            /** 蓄电载荷：随实际爬升增长，供 leap 电柱的发射量消费。 */
            function chargeRate(level: number): number { return 10 + Math.max(0, Math.min(4, level)) * 9; }

            function finish(current: CombatAction): void { if (!finished) { finished = true; movementScenes.finish(current, done); } }

            sound(action, "cobblemon:move.thunderwave.actor");
            movementScenes.show(action, "leap", start, { moment: "leap", scale: scale, intensity: intensity, chargeRate: chargeRate(charge) });

            function settle(current: CombatAction): void {
                movementScenes.stop(current);
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                supercellslamResetFall(live, actor);
                const floor = supercellslamFloor(live, me.position(), me.height() * 0.5);
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
                    WorldFeedback.emit(live, supercellslamScene, 1, at,
                        { moment: "crash", scale: scale, intensity: Math.max(0.6, Math.min(2.4, crash * 4)), dust: dust, sparks: sparks }, 30);
                    WorldFeedback.text(live, supercellslamAbove(at), supercellslamCrashText, [], 28);
                }
                sound(current, "cobblemon:impact.electric");
                sound(current, "minecraft:entity.generic.big_fall");
                settle(current);
            }

            function impactOn(current: CombatAction, victim: CombatActor, at: CombatPoint, direction: CombatPoint): void {
                const live = current.world();
                const body = live.observe(victim);
                const point = body === null ? at : body.position();
                if (!hurt(current, victim, "supercellslam", power, { damage: damageSpec("supercellslam", "slam"), contact: true })) {
                    crashLanding(current, point); return;
                }
                if (live.valid(victim)) {
                    const me = live.observe(actor);
                    const away = me === null ? direction : point.minus(me.position());
                    const flat = WorldCombat.point(away.x(), 0, away.z());
                    const push = flat.length() < 0.01 ? direction : flat.unit();
                    live.displace(victim, push.scale(shove));
                }
                WorldFeedback.emit(live, supercellslamScene, 1, point,
                    { moment: "impact", target: String(victim.ref()), scale: scale, intensity: intensity, dust: dust,
                        sparks: sparks, count: Math.round(18 + power * 0.3), hitRadius: hitRadius }, 32);
                sound(current, "cobblemon:impact.electric");
                sound(current, "minecraft:entity.lightning_bolt.thunder");
                WorldFeedback.text(live, supercellslamAbove(point), supercellslamHitText, [], 28);
                settle(current);
            }

            /** 没有任何真实接触：就在落体当下的真实位置砸一次，按原比例反噬，不回头补目标。 */
            function land(current: CombatAction): void {
                const live = current.world(), me = live.observe(actor);
                const at = me === null ? current.origin() : supercellslamGround(live, me.position(), me.height() * 0.5);
                crashLanding(current, at);
            }

            function dive(current: CombatAction): void {
                movementScenes.stop(current, "leap");
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                const from = me.position();
                const toward = locked.minus(from);
                const distance = toward.length();
                const floor = supercellslamFloor(live, from, me.height() * 0.5);
                if (distance <= Math.max(0.5, hitRadius) || from.y() - me.height() * 0.5 <= floor + 0.15) {
                    land(current);
                    return;
                }
                const dir = toward.unit();
                const stepLen = Math.min(diveSpeed, distance);
                const delta = dir.scale(stepLen);
                supercellslamResetFall(live, actor);
                const swept = sweepStep(current, delta, hitRadius);
                const trace = swept.hit;
                if (trace.hitEntity()) {
                    const victim = trace.target();
                    if (victim !== null && String(victim.ref()) !== String(actor.ref()) && !live.friendly(victim)) {
                        impactOn(current, victim, trace.position(), dir);
                        return;
                    }
                }
                if (trace.blocked()) { land(current); return; }
                const moved = swept.moved + (trace.hitEntity() && swept.remaining.length() > 0.001 ? live.displace(actor, swept.remaining) : 0);
                if (moved < Math.min(0.06, stepLen * 0.4)) { land(current); return; }
                movementScenes.show(current, "dive", from, { moment: "dive", scale: scale, intensity: intensity,
                        direction: [dir.x(), dir.y(), dir.z()],
                        path: [[from.x(), from.y(), from.z()], [locked.x(), locked.y(), locked.z()]] });
                current.after(1, function (next) { dive(next); });
            }

            function rise(current: CombatAction, step: number): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                if (step >= riseLimit || me.position().y() >= apexY - 0.05) { dive(current); return; }
                const up = Math.min(leapSpeed, Math.max(0, apexY - me.position().y()));
                const flatX = locked.x() - me.position().x(), flatZ = locked.z() - me.position().z();
                const flat = Math.sqrt(flatX * flatX + flatZ * flatZ);
                const horiz = Math.min(drift, flat);
                const delta = WorldCombat.point(flat < 0.01 ? 0 : flatX / flat * horiz, up, flat < 0.01 ? 0 : flatZ / flat * horiz);
                supercellslamResetFall(live, actor);
                live.displace(actor, delta);
                // 蓄电量绑定实际爬升：爬得越高，身上电花才越聚越密。
                const climbed = Math.max(0, Math.min(1, (me.position().y() - start.y()) / Math.max(0.001, leapHeight)));
                charged = charge + climbed;
                movementScenes.show(current, "leap", me.position(), { moment: "leap", scale: scale, intensity: intensity, chargeRate: chargeRate(charged) });
                current.after(1, function (next) { rise(next, step + 1); });
            }

            rise(action, 0);
        }
    });
}
