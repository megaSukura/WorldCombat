/**
 * 飞踢 / jumpkick 的出手方式。
 *
 * 核心念头：一记助跑后的低平腾空飞踢——缩身、蹬地，沿一条浅浅的抛物线冲上去，腿在弧线上横着扫出。
 * 踢实就是把对手连人带势踹开；踢偏，脚踝在真实地面磕响，按坠势自伤。本招是跳击家族的基准线：干净、
 * 可读、风险中等，谁都用得起。
 *
 * 两幕（提交后由共享节奏驱动 execute）：
 *   起（windup，提交前）：缩身蓄势，只播预告表现，可免费打断。
 *   跃与踢（提交后）：逐刻沿抛物线先升后俯；提交即锁线，方向固定不再拐向目标，之后对手横移就能让开。
 *       上升途中头顶遇到真实方块就及时转入俯冲，不再空耗上升预算。俯冲途中真实本体撞到首个活体即按 kick
 *       结算接触伤害、用 hitDisplace 沿飞踢方向踹开 shove 格，并继续落到真实地面收势；撞到的若是友方，
 *       把它记进 moveSweep 的忽略表后继续扫剩余段，不裸 displace 穿过别人。半途撞墙、或到点都没有接触就是
 *       踢偏，只在脚真正触到真实支撑面后才磕地自伤——脚没落地就不播磕地。
 *
 * 落空代价：从释放跃击起，取消（硬中断）也不能免掉约定风险。账记在一个 actor 托管的债务效果上：正常落地结算
 * 时撤销债务；动作被打断时，债务在自己的作用域里补付 crash，而不是靠已消失的 action.after。
 *
 * 与同族分开：飞膝踢先拔高再直坠、更重更狠；下压踢是抬腿下劈的两拍；闪电强袭带电蓄势。飞踢是其中最低平、
 * 最快、反伤最轻的一记。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）与位移（hitDisplace）走同一条路。
 */
namespace PokemonSkills {
    const jumpkickScene = "world_combat:move_jumpkick";
    const jumpkickDebt = "world_combat:jumpkick_debt";
    const jumpkickHitText = "world_combat.move.jumpkick.text.hit";
    const jumpkickCrashText = "world_combat.move.jumpkick.text.crash";

    /** 在 x/z 处向下探真实碰撞顶面（花草、液体这类无碰撞面不算）；没有可落面返回 null。 */
    function jumpkickGround(world: CombatWorld, point: CombatPoint, drop: number): CombatPoint | null {
        return SurfacePaths.support(world, point, 0.7, Math.max(1, drop));
    }

    /** 清一次坠落距离：腾空与落地由本招自己结算，不让原生物理再补一次坠落伤害。 */
    function jumpkickResetFall(world: CombatWorld, actor: CombatActor): void {
        try { const native = world.nativeEntity(actor); if (native) native.fallDistance = 0; } catch (error) { }
    }

    function jumpkickAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    function jumpkickActionActive(world: CombatWorld, instance: number): boolean {
        const actions = world.actions();
        for (let index = 0; index < actions.length; index++)
            if (Number(actions[index].instance()) === instance) return true;
        return false;
    }

    function jumpkickCrashPay(world: CombatWorld, self: CombatActor, at: CombatPoint, crash: number, dust: number, scale: number): number {
        const body = world.observe(self);
        if (body === null) return 0;
        const loss = -world.health(self, -body.maxHealth() * crash, "world_combat:crash");
        if (!(loss > 0)) return 0;
        WorldFeedback.emit(world, jumpkickScene, 1, at,
            { moment: "crash", scale: scale, intensity: Math.max(0.6, Math.min(2.2, crash * 4)), dust: dust }, 26);
        WorldFeedback.text(world, jumpkickAbove(at), jumpkickCrashText, [], 26);
        world.sound("minecraft:entity.generic.big_fall", at, 16, "{}");
        return loss;
    }

    // actor 托管的落空债务：动作被取消时在它自己的作用域里补付踢偏代价。
    WorldCombat.effect(jumpkickDebt, 1, 600, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["instance", "crash", "dust", "scale"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid jumpkick debt: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(jumpkickDebt, "start", function (effect) {
        const world = effect.world();
        if (!world.valid(effect.target())) { effect.end(); return; }
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(jumpkickDebt, "watch", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const instance = Number(data.instance);
        if (jumpkickActionActive(world, instance)) { effect.schedule("watch", "watch", 1, "{}"); return; }
        // 正常结束（stage=finished）不补付；只有被取消/打断才结清已承担的落空代价。
        const receipt = world.action(instance);
        if (receipt !== null && String(receipt.stage()) === "finished") { effect.end(); return; }
        const body = world.observe(self);
        if (body !== null) jumpkickCrashPay(world, self, body.position().minus(WorldCombat.point(0, body.height() * 0.5, 0)),
            data.crash, data.dust, data.scale);
        effect.end();
    });
    WorldCombat.effectHandler(jumpkickDebt, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        freeMovement: true,
        id: "jumpkick",
        cooldownParameter: "recharge",
        name: "Jump Kick",
        description: "一记低平的腾空飞踢：缩身蹬地，沿浅弧冲上去，腿横着扫出。踢实就把对手踹开，踢偏脚踝硬磕地面、自伤一截。跳击家族里最干净、最快的一记。",
        uses: ["用一记便宜的腾空踢打出接触伤害", "把贴脸的对手踹开、拉出身位", "给残血对手补上最后一脚"],
        kind: "aim",
        range: 5.5,
        maxRange: 9,
        prepare: 7,
        active: 30,
        recover: 9,
        cooldown: 26,
        style: "aerial",
        maximumTicks: 220,
        interruptible: false,
        defaults: { running: false, ai: { maxChase: 9, preferWeak: true, minSelf: 0.2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("jumpkick", "reach", pokemon), geometry: "circle", style: "aerial", color: 0xA9CF7A,
                label: config && config.running === true ? "长跃飞踢" : "原地飞踢" };
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
            const movementScenes = WorldFeedback.actionScenes(jumpkickScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { movementScenes.finish(action, done); return; }

            const leapHeight = Math.max(1.2, p("jumpkick", "leapHeight", action));
            const leapSpeed = Math.max(0.2, p("jumpkick", "leapSpeed", action));
            const diveSpeed = Math.max(0.4, p("jumpkick", "diveSpeed", action));
            const drift = Math.max(0, p("jumpkick", "drift", action));
            const hitRadius = Math.max(0.4, p("jumpkick", "hitRadius", action));
            const power = p("jumpkick", "kick", action);
            const crash = Math.max(0.03, Math.min(0.6, p("jumpkick", "crash", action)));
            const shove = Math.max(0, p("jumpkick", "shove", action));
            const dust = Math.max(4, Math.round(p("jumpkick", "dust", action)));
            const settleSpeed = Math.max(0.2, p("jumpkick", "settleSpeed", action));
            const scale = hitRadius / 0.65;
            const intensity = Math.max(0.6, Math.min(2.2, power / 100));
            // 提交即锁线：冻结选点/目标点，之后只沿这条线飞，不自动拐向原敌。
            action.releaseTarget();
            const start = self.position();
            const apexY = start.y() + leapHeight;
            const riseLimit = Math.max(1, Math.ceil(leapHeight / leapSpeed)) + 6;
            const targetActor = action.target();
            const targetBody = targetActor !== null && world.valid(targetActor) ? world.observe(targetActor) : null;
            const targetPoint = targetBody !== null ? targetBody.position() : action.targetPosition();
            const ground = jumpkickGround(world, targetPoint, 24);
            const locked = ground !== null ? ground : WorldCombat.point(targetPoint.x(), targetPoint.y(), targetPoint.z());
            const heading = WorldGeometry.flatUnit(locked.minus(start), action.direction());
            let finished = false;
            let debt = 0;

            function finish(current: CombatAction): void { if (!finished) { finished = true; movementScenes.finish(current, done); } }
            function disarm(current: CombatAction): void {
                if (debt <= 0) return;
                current.world().operation(debt, "world_combat:dispel", "{}");
                debt = 0;
            }
            /** 友方接触记进 moveSweep 的忽略表，让身体继续扫过他们而不是停住。 */
            function ignoredFriends(live: CombatWorld, at: CombatPoint, radius: number): string {
                const refs: string[] = [];
                const found = live.query(at, radius, false);
                for (let index = 0; index < found.length; index++) {
                    const facts = live.observe(found[index]);
                    if (facts !== null && facts.friendly()) refs.push(String(found[index].ref()));
                }
                return JSON.stringify(refs);
            }

            sound(action, "minecraft:entity.player.attack.strong");
            movementScenes.show(action, "leap", start, { moment: "leap", scale: scale, intensity: intensity, dust: dust,
                    direction: [heading.x(), 0, heading.z()], path: [[start.x(), start.y(), start.z()], [start.x(), start.y(), start.z()]] });
            debt = world.effect(jumpkickDebt, actor,
                JSON.stringify({ instance: action.id(), crash: crash, dust: dust, scale: scale }), 600);

            function crashLanding(current: CombatAction, at: CombatPoint): void {
                disarm(current);
                jumpkickCrashPay(current.world(), actor, at, crash, dust, scale);
                finish(current);
            }

            /** 真实支撑面落地：脚未触地就继续下坠；只有真触地、且这一趟踢空才磕地自伤。 */
            function descend(current: CombatAction, whiffed: boolean, stalled?: number): void {
                const wait = stalled === undefined ? 0 : stalled;
                const live = current.world(), me = live.observe(actor);
                if (me === null) { disarm(current); finish(current); return; }
                jumpkickResetFall(live, actor);
                const feet = me.position().y() - me.height() * 0.5;
                const support = SurfacePaths.support(live, WorldCombat.point(me.position().x(), feet, me.position().z()), 0.7, 8);
                if (support !== null && feet > support.y() + 0.15) {
                    const drop = Math.max(0.4, Math.min(settleSpeed, feet - support.y() + 0.3));
                    const moved = live.displace(actor, WorldCombat.point(0, -drop, 0));
                    const now = live.observe(actor);
                    const to = now === null ? me.position() : now.position();
                    movementScenes.show(current, "dive", to, { moment: "dive", scale: scale, intensity: intensity,
                        path: [[me.position().x(), me.position().y(), me.position().z()], [to.x(), to.y(), to.z()]] });
                    // 被别的身体/方块挡住落不下来时，不能再无限重试。
                    if (moved < 0.02 && wait >= 2) {
                        if (whiffed) crashLanding(current, WorldCombat.point(me.position().x(), support.y(), me.position().z()));
                        else { disarm(current); finish(current); }
                        return;
                    }
                    current.after(1, function (next) { descend(next, whiffed, moved < 0.02 ? wait + 1 : 0); });
                    return;
                }
                if (whiffed && support !== null) { crashLanding(current, WorldCombat.point(me.position().x(), support.y(), me.position().z())); return; }
                disarm(current);
                finish(current);
            }

            function impactOn(current: CombatAction, victim: CombatActor, at: CombatPoint, direction: CombatPoint): void {
                const live = current.world();
                const body = live.observe(victim);
                const point = body === null ? at : body.position();
                if (!hurt(current, victim, "jumpkick", power, { damage: damageSpec("jumpkick", "kick"), contact: true })) {
                    descend(current, true); return;
                }
                disarm(current);
                if (live.valid(victim)) {
                    const me = live.observe(actor);
                    const away = me === null ? direction : point.minus(me.position());
                    const flat = WorldCombat.point(away.x(), 0, away.z());
                    const push = flat.length() < 0.01 ? direction : flat.unit();
                    live.hitDisplace(victim, push.scale(shove));
                }
                WorldFeedback.emit(live, jumpkickScene, 1, point,
                    { moment: "impact", target: String(victim.ref()), scale: scale, intensity: intensity,
                        count: Math.round(18 + power * 0.35) }, 30);
                sound(current, "cobblemon:impact.fighting");
                sound(current, "minecraft:entity.player.attack.strong");
                WorldFeedback.text(live, jumpkickAbove(point), jumpkickHitText, [], 26);
                descend(current, false);
            }

            function dive(current: CombatAction): void {
                movementScenes.stop(current, "leap");
                const live = current.world(), me = live.observe(actor);
                if (me === null) { disarm(current); finish(current); return; }
                const from = me.position();
                const toward = locked.minus(from);
                const distance = toward.length();
                if (distance <= Math.max(0.5, hitRadius)) { descend(current, true); return; }
                const dir = toward.unit();
                const stepLen = Math.min(diveSpeed, distance);
                const delta = dir.scale(stepLen);
                jumpkickResetFall(live, actor);
                const before = current.origin();
                const trace = current.moveSweep(delta, hitRadius, ignoredFriends(live, from, hitRadius + 1));
                const moved = current.origin().minus(before).length();
                if (trace.hitEntity()) {
                    const victim = trace.target();
                    if (victim !== null && String(victim.ref()) !== String(actor.ref()) && !live.friendly(victim)) {
                        impactOn(current, victim, trace.position(), dir);
                        return;
                    }
                }
                if (trace.blocked()) { descend(current, true); return; }
                if (moved < Math.min(0.06, stepLen * 0.4)) { descend(current, true); return; }
                const now = current.origin();
                movementScenes.show(current, "dive", from, { moment: "dive", scale: scale, intensity: intensity,
                        direction: [dir.x(), dir.y(), dir.z()],
                        path: [[from.x(), from.y(), from.z()], [now.x(), now.y(), now.z()]] });
                current.after(1, function (next) { dive(next); });
            }

            function rise(current: CombatAction, count: number): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { disarm(current); finish(current); return; }
                if (count >= riseLimit || me.position().y() >= apexY - 0.05) { dive(current); return; }
                const up = Math.min(leapSpeed, Math.max(0, apexY - me.position().y()));
                // 头顶真实净空：撞到方块就及时收，转入俯冲，而不是空耗上升预算。
                const head = me.position().plus(WorldCombat.point(0, me.height() * 0.5, 0));
                if (WorldGeometry.blockHit(live, head, head.plus(WorldCombat.point(0, up + 0.15, 0))) !== null) { dive(current); return; }
                const flatX = locked.x() - me.position().x(), flatZ = locked.z() - me.position().z();
                const flat = Math.sqrt(flatX * flatX + flatZ * flatZ);
                const horiz = Math.min(drift, flat);
                const delta = WorldCombat.point(flat < 0.01 ? 0 : flatX / flat * horiz, up, flat < 0.01 ? 0 : flatZ / flat * horiz);
                jumpkickResetFall(live, actor);
                live.displace(actor, delta);
                const now = live.observe(actor);
                const to = now === null ? me.position() : now.position();
                movementScenes.show(current, "leap", to, { moment: "leap", scale: scale, intensity: intensity, dust: dust,
                        direction: [heading.x(), 0, heading.z()],
                        path: [[me.position().x(), me.position().y(), me.position().z()], [to.x(), to.y(), to.z()]] });
                current.after(1, function (next) { rise(next, count + 1); });
            }

            rise(action, 0);
        }
    });
}
