/**
 * 闪电强袭 / supercellslam 的出手方式。
 *
 * 核心念头：一次由玩家控制的**短跳蓄电—松手压坠**。按住技能键，短准备后真实起跳；脚底离地后，
 * 每真实滞空一刻攒一档电：离地 6/12 刻亮到第一/第二档，18 刻满档并自动压坠；提前松手就按已得的档位落下。
 * 落点在**松开那一刻**才锁定：蓄电期间玩家还能调准线，对手也能侧移或开火。下坠走整条身体碰撞，
 * 撞上第一个非友方活体就结算一次并收势；撞墙或全程没碰到人就带电砸地、按最大生命反噬。
 *
 * 三幕（提交后由本招自己驱动 execute）：
 *   起（windup，提交前）：蓄势预告，登记物理松键回调，可免费打断。
 *   腾（execute 前段）：真实起跳，只有脚底已离开支撑、净空允许且仍真实停空才积电；本招自带的
 *       有界作用域重力只撑住这段最多 18 刻的停空，取消/中断/完成时随作用域收回，不会长期飞行。
 *   坠（execute 后段）：按释放时的准线锁定落点，完整身体 3D moveSweep 下压；命中即结算这一档的电击伤害
 *       并用 hitDisplace 顶开，撞墙或落空就在真实落点按 crash 自伤。
 *
 * 与同族分开：其余跳击提交即锁线、没有可控滞空窗口；本招的签名是离地时长决定档位、玩家决定何时往哪落。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）与位移（hitDisplace）走同一条路；
 * 电属性相性／本系是宝可梦层，由共享结算完成。
 */
namespace PokemonSkills {
    const supercellslamScene = "world_combat:move_supercellslam";
    const supercellslamHitText = "world_combat.move.supercellslam.text.hit";
    const supercellslamCrashText = "world_combat.move.supercellslam.text.crash";

    /** Native supporting collision face; no support is not a landing. */
    function supercellslamFloor(world: CombatWorld, point: CombatPoint, halfHeight: number): number {
        const feet = point.y() - halfHeight;
        const support = SurfacePaths.support(world, WorldCombat.point(point.x(), feet, point.z()), 0.1, 24);
        return support === null ? -Infinity : support.y();
    }

    function supercellslamGround(world: CombatWorld, point: CombatPoint, halfHeight: number): CombatPoint {
        const floor = supercellslamFloor(world, point, halfHeight);
        return isFinite(floor) ? WorldCombat.point(point.x(), floor, point.z()) : point;
    }

    function supercellslamResetFall(world: CombatWorld, actor: CombatActor): void {
        try { const native = world.nativeEntity(actor); if (native) native.fallDistance = 0; } catch (error) { }
    }

    function supercellslamAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    /** 释放那一刻的准线：手动持续输入取当刻样本点，AI（无 token）取当前目标身体中心。 */
    function supercellslamAim(action: CombatAction): CombatPoint {
        const input = JSON.parse(action.control() || "{}");
        const sample = input.samples && input.samples[0];
        const manual = typeof input.token === "number" && input.token > 0;
        if (!manual) {
            const target = action.target();
            if (target !== null && action.sense().valid(target)) {
                const body = action.sense().observe(target);
                if (body !== null) return body.position();
            }
        }
        return sample && sample.point
            ? WorldCombat.point(sample.point[0], sample.point[1], sample.point[2])
            : action.targetPosition();
    }

    define({
        freeMovement: true,
        id: "supercellslam",
        cooldownParameter: "recharge",
        name: "Supercell Slam",
        description: "按住技能键短跳蓄电，松开时锁定当前准线、带着已蓄的电荷压向第一个撞到的敌人：离地 6/12/18 刻得三档，蓄得越久电得越狠，满档自动压坠。撞空或撞墙会按自身最大生命反噬。",
        uses: ["按住技能键蓄电，松手把这一记电击砸在准线上", "用可控的落点把贴脸的对手顶开", "对会走位的对手赌一次满蓄重击"],
        kind: "aim",
        range: 5.5,
        maxRange: 9,
        prepare: 7,
        active: 30,
        recover: 9,
        cooldown: 28,
        style: "aerial",
        maximumTicks: 220,
        interruptible: false,
        defaults: { ai: { maxChase: 10, minSelf: 0.3 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("supercellslam", "reach", pokemon), geometry: "circle", style: "aerial", color: 0xFFE463,
                label: "闪电强袭" };
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
            action.data("supercellslam/release", JSON.stringify({ released: false, tick: -1 }));
            // 监听物理松键：松手是正常释放，不是取消；记录时刻供 execute 读取已蓄档位。
            action.on("world_combat:input-release", function (current) {
                const state = JSON.parse(String(current.data("supercellslam/release") || "{}"));
                if (state.released) return;
                state.released = true; state.tick = current.sense().tick();
                current.data("supercellslam/release", JSON.stringify(state));
            });
            action.present("supercellslam:windup", supercellslamScene, 1, action.origin(), JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(supercellslamScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { movementScenes.finish(action, done); return; }

            const leapHeight = Math.max(1.2, p("supercellslam", "leapHeight", action));
            const leapSpeed = Math.max(0.2, p("supercellslam", "leapSpeed", action));
            const diveSpeed = Math.max(0.4, p("supercellslam", "diveSpeed", action));
            const drift = Math.max(0, p("supercellslam", "drift", action));
            const hitRadius = Math.max(0.4, p("supercellslam", "hitRadius", action));
            const power = Math.max(1, p("supercellslam", "slam", action));
            const crash = Math.max(0.03, Math.min(0.6, p("supercellslam", "crash", action)));
            const shove = Math.max(0, p("supercellslam", "shove", action));
            const dust = Math.max(4, Math.round(p("supercellslam", "dust", action)));
            const sparks = Math.max(6, Math.round(p("supercellslam", "sparks", action)));
            const reach = Math.max(1, p("supercellslam", "reach", action));
            const settleSpeed = Math.max(0.2, p("supercellslam", "settleSpeed", action));
            const tier1 = Math.max(1, Math.round(p("supercellslam", "hold1", action)));
            const tier2 = Math.max(tier1 + 1, Math.round(p("supercellslam", "hold2", action)));
            const tier3 = Math.max(tier2 + 1, Math.round(p("supercellslam", "hold3", action)));
            const scale = hitRadius / 0.7;
            const intensity = Math.max(0.6, Math.min(2.4, power / 100));

            const control = JSON.parse(action.control() || "{}");
            const manual = typeof control.token === "number" && control.token > 0;
            const target = action.target();
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            // AI 没有物理松键：同一动作自动有限 6 或 12 刻后释放，近敌短蓄、远敌多蓄一点。
            const aiHold = targetBody !== null && targetBody.position().minus(self.position()).length() > 3.5 ? tier2 : tier1;

            const start = self.position();
            // 净空决定真实拔高：头顶有方块就把顶点截到它下方，截到离不了地时不积电。
            let climb = 0;
            for (let up = 0.2; up <= leapHeight + 0.2; up += 0.2) {
                const height = Math.min(up, leapHeight);
                if (!world.freeSpace(WorldCombat.point(start.x(), self.boundsMin().y() + height, start.z()), self.width(), self.height())) break;
                climb = height;
                if (height === leapHeight) break;
            }
            const apexY = start.y() + climb;
            const riseLimit = Math.max(1, Math.ceil(leapHeight / leapSpeed)) + 6;
            let locked = start;
            let finished = false;

            function finish(current: CombatAction): void { if (!finished) { finished = true; movementScenes.finish(current, done); } }
            function tierOf(ticks: number): number { return ticks >= tier3 ? 1 : ticks >= tier2 ? 0.82 : 0.65; }
            function levelOf(ticks: number): number { return ticks >= tier2 ? 2 : ticks >= tier1 ? 1 : 0; }
            function released(current: CombatAction): boolean {
                const state = JSON.parse(String(current.data("supercellslam/release") || "{}"));
                return state.released === true;
            }
            /** 把当前准线投到地面并收在施放距离内；这个点只在释放那一刻算一次。 */
            function lockPoint(live: CombatWorld, from: CombatPoint, aim: CombatPoint): CombatPoint {
                const ground = supercellslamGround(live, aim, 0.7);
                const dx = ground.x() - from.x(), dz = ground.z() - from.z();
                const horiz = Math.sqrt(dx * dx + dz * dz);
                if (horiz <= reach || horiz < 1e-6) return ground;
                return WorldCombat.point(from.x() + dx / horiz * reach, ground.y(), from.z() + dz / horiz * reach);
            }

            function settle(current: CombatAction): void {
                movementScenes.stop(current);
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                supercellslamResetFall(live, actor);
                const floor = supercellslamFloor(live, me.position(), me.height() * 0.5);
                if (!isFinite(floor)) { finish(current); return; }
                const feet = me.position().y() - me.height() * 0.5;
                if (feet > floor + 0.15) {
                    const moved = live.displace(actor, WorldCombat.point(0, -Math.max(0.4, Math.min(settleSpeed, feet - floor + 0.3)), 0));
                    if (moved < 0.01) { finish(current); return; }
                    current.after(1, function (next) { settle(next); });
                    return;
                }
                finish(current);
            }

            function crashLanding(current: CombatAction, at: CombatPoint): void {
                const live = current.world(), body = live.observe(actor);
                if (body !== null) {
                    WorldFeedback.emit(live, supercellslamScene, 1, at,
                        { moment: "crash", scale: scale, intensity: Math.max(0.6, Math.min(2.4, crash * 4)), dust: dust, sparks: sparks }, 30);
                    WorldFeedback.text(live, supercellslamAbove(at), supercellslamCrashText, [], 28);
                    sound(current, "minecraft:entity.generic.big_fall");
                    sound(current, "cobblemon:impact.electric");
                    live.health(actor, -body.maxHealth() * crash, "world_combat:crash");
                    if (!live.valid(actor)) return;
                }
                settle(current);
            }

            function impactOn(current: CombatAction, victim: CombatActor, at: CombatPoint, direction: CombatPoint, factor: number): void {
                const live = current.world();
                const body = live.observe(victim);
                const point = body === null ? at : body.position();
                const slamPower = Math.max(1, power * factor);
                // 原生拒绝这次伤害时不发送命中提示，直接按落空结清。
                if (!hurt(current, victim, "supercellslam", slamPower, { damage: damageSpec("supercellslam", "slam"), contact: true })) {
                    crashLanding(current, point); return;
                }
                if (live.valid(victim)) {
                    const me = live.observe(actor);
                    const away = me === null ? direction : point.minus(me.position());
                    const flat = WorldCombat.point(away.x(), 0, away.z());
                    const push = flat.length() < 0.01 ? direction : flat.unit();
                    // 受害者被推走原生击退事件与抗击退：实际推多远由它决定。
                    live.hitDisplace(victim, push.scale(shove));
                }
                WorldFeedback.emit(live, supercellslamScene, 1, point,
                    { moment: "impact", target: String(victim.ref()), scale: scale,
                        intensity: Math.max(0.6, Math.min(2.4, slamPower / 100)), dust: dust,
                        sparks: Math.round(sparks * (0.8 + factor * 0.4)), count: Math.round(18 + slamPower * 0.3), hitRadius: hitRadius }, 32);
                sound(current, "cobblemon:impact.electric");
                sound(current, "minecraft:entity.lightning_bolt.thunder");
                WorldFeedback.text(live, supercellslamAbove(point), supercellslamHitText, [], 28);
                settle(current);
            }

            /** 全程没有真实接触：就在落体当下的真实地面砸一次，按 crash 比例自伤，不回头补目标。 */
            function land(current: CombatAction): void {
                const live = current.world(), me = live.observe(actor);
                const at = me === null ? current.origin() : supercellslamGround(live, me.position(), me.height() * 0.5);
                crashLanding(current, at);
            }

            function diveStep(current: CombatAction, factor: number): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                const from = me.position();
                const toward = locked.minus(from);
                const distance = toward.length();
                const floor = supercellslamFloor(live, from, me.height() * 0.5);
                if (distance <= Math.max(0.5, hitRadius) || from.y() - me.height() * 0.5 <= floor + 0.15) { land(current); return; }
                const dir = toward.unit();
                const stepLen = Math.min(diveSpeed, distance);
                const delta = dir.scale(stepLen);
                supercellslamResetFall(live, actor);
                const swept = sweepStep(current, delta, hitRadius), trace = swept.hit;
                if (trace.hitEntity()) {
                    const victim = trace.target();
                    if (victim !== null && String(victim.ref()) !== String(actor.ref()) && !live.friendly(victim)) {
                        impactOn(current, victim, trace.position(), dir, factor);
                        return;
                    }
                }
                if (trace.blocked()) { land(current); return; }
                const moved = swept.moved + (trace.hitEntity() && swept.remaining.length() > 0.001 ? live.displace(actor, swept.remaining) : 0);
                if (moved < Math.min(0.06, stepLen * 0.4)) { land(current); return; }
                // 表现与判定共用端点：每刻只画这一小步真实扫过的子段。
                const after = live.observe(actor);
                const to = after === null ? from : after.position();
                movementScenes.show(current, "dive", from, { moment: "dive", scale: scale,
                    intensity: Math.max(0.6, Math.min(2.4, power * factor / 100)),
                    direction: [dir.x(), dir.y(), dir.z()],
                    path: [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]] });
                current.after(1, function (next) { diveStep(next, factor); });
            }

            function dive(current: CombatAction, factor: number): void {
                movementScenes.stop(current, "charge");
                movementScenes.stop(current, "mark");
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                // 瞄点只在释放这一刻冻结；此后目标离场/移动都不再改线。
                locked = lockPoint(live, me.position(), supercellslamAim(current));
                current.releaseTarget();
                diveStep(current, factor);
            }

            /** 腾空蓄电：只有真实离地才计数，本招自己的有界重力撑住停空，满档或松手即转坠。 */
            function charge(current: CombatAction, ticks: number, step: number): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                supercellslamResetFall(live, actor);
                const floor = supercellslamFloor(live, me.position(), me.height() * 0.5);
                const feet = me.position().y() - me.height() * 0.5;
                const offGround = !me.grounded() && feet > floor + 0.15;
                if (offGround) ticks += 1;

                if ((manual ? released(current) : ticks >= aiHold) || ticks >= tier3) { dive(current, tierOf(ticks)); return; }
                if (!offGround && ticks === 0 && step >= riseLimit) { dive(current, 0.65); return; }

                const aim = supercellslamAim(current);
                const hold = apexY - me.position().y();
                if (offGround) {
                    // 保持顶点高度，并沿当前准线做有限的腾空前移。
                    const flatX = aim.x() - me.position().x(), flatZ = aim.z() - me.position().z();
                    const flat = Math.sqrt(flatX * flatX + flatZ * flatZ), horiz = Math.min(drift, flat);
                    live.displace(actor, WorldCombat.point(flat < 0.01 ? 0 : flatX / flat * horiz,
                        Math.max(-0.6, Math.min(0.6, hold)), flat < 0.01 ? 0 : flatZ / flat * horiz));
                    live.motion(actor, WorldCombat.point(0, 0, 0), false);
                } else if (hold > 0.02) {
                    live.displace(actor, WorldCombat.point(0, Math.min(leapSpeed, hold), 0));
                }

                const level = levelOf(ticks);
                movementScenes.show(current, "charge", me.position(), { moment: "charge", level: level,
                    motes: 10 + level * 12, pips: 6 + level * 6, charge: level, scale: scale, intensity: intensity });
                movementScenes.show(current, "mark", lockPoint(live, me.position(), aim), { moment: "mark",
                    radius: hitRadius, level: level, scale: scale, intensity: intensity });
                current.after(1, function (next) { charge(next, ticks, step + 1); });
            }

            // 有界作用域重力：只在本招这最多 18 刻停空内抵消原生重力，取消/完成随作用域收回。
            world.attribute(actor, "minecraft:generic.gravity", -1, "add_multiplied_total");
            sound(action, "cobblemon:move.thunderwave.actor");
            if (climb < 0.5) { dive(action, 0.65); return; }
            movementScenes.show(action, "charge", start, { moment: "charge", level: 0, motes: 10, pips: 6, charge: 0, scale: scale, intensity: intensity });
            charge(action, 0, 0);
        }
    });

    // 按住技能键：单一持续 point 选择，松开走 world_combat:input-release（见 windup）。
    WorldCombat.preview("world_combat:supercellslam",
        JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
