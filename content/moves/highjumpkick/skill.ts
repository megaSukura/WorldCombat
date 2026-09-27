/**
 * 飞膝踢 / highjumpkick 的出手方式。
 *
 * 核心念头：一记先垂直拔高、再直坠落膝的重击。压腿蓄力后几乎笔直拔上高空，在顶点短暂悬停——这段时间
 * 把落点画给对手看——随后膝头朝下砸进落点。命中是全族最重的一记接触伤害；砸空，整条腿在真实地面磕响，
 * 自伤最狠。它靠高度取胜，所以射程比飞踢短、起手更慢，顶点停滞既是签名也是被让开的窗口。
 *
 * 三幕（提交后由共享节奏驱动 execute）：
 *   起（windup，提交前）：压腿蓄力，只播预告，可免费打断。
 *   拔（提交后 rise）：逐刻上升，落点钉在目标实时位置；但目标不能把落点无限带远——水平距离截到射程。
 *       垂直形态改为近身落膝：落点截在起跳点附近，几乎原地拔落。头顶按整身体积与真实净空限高，不强行抬升。
 *   坠（apex → dive）：顶点 emit 落点标记并悬停 holdTicks，把落点锁死；随后沿直线下坠，本体真实接触撞到活体
 *       即按 knee 结算接触伤害并撞开 shove 格；下坠全程没有接触就砸在真实支撑面上，按 crash 自伤。撞到的友方
 *       记进 moveSweep 忽略表后继续扫剩余段。不绕墙补目标，脚没落地不播磕地。
 *
 * 落空代价：从释放跃击起，取消（硬中断）也不能免掉约定风险。账记在一个 actor 托管的债务效果上：正常落地结算
 * 时撤销债务；动作被打断时，债务在自己的作用域里补付 crash，而不是靠已消失的 action.after。
 *
 * 与飞踢分开：飞踢是低平长弧，本招是先拔高再直坠的竖直线；顶点停滞与更重的膝击/自伤是它的签名。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）与位移（hitDisplace）走同一条路。
 */
namespace PokemonSkills {
    const highjumpkickScene = "world_combat:move_highjumpkick";
    const highjumpkickDebt = "world_combat:highjumpkick_debt";
    const highjumpkickHitText = "world_combat.move.highjumpkick.text.hit";
    const highjumpkickCrashText = "world_combat.move.highjumpkick.text.crash";

    /** 真实碰撞顶面落点；点为中心，halfHeight 换算到脚底，drop 为向下探测深度。 */
    function highjumpkickGround(world: CombatWorld, centre: CombatPoint, halfHeight: number, drop: number): CombatPoint | null {
        return SurfacePaths.support(world, centre.minus(WorldCombat.point(0, halfHeight, 0)), 0.7, Math.max(1, drop));
    }

    function highjumpkickResetFall(world: CombatWorld, actor: CombatActor): void {
        world.motion(actor, WorldCombat.point(0, 0, 0), false);
        try { const native = world.nativeEntity(actor); if (native) native.fallDistance = 0; } catch (error) { }
    }

    function highjumpkickAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    function highjumpkickActionActive(world: CombatWorld, instance: number): boolean {
        const actions = world.actions();
        for (let index = 0; index < actions.length; index++)
            if (Number(actions[index].instance()) === instance) return true;
        return false;
    }

    function highjumpkickCrashPay(world: CombatWorld, self: CombatActor, at: CombatPoint, crash: number, dust: number, scale: number): number {
        const body = world.observe(self);
        if (body === null) return 0;
        const loss = -world.health(self, -body.maxHealth() * crash, "world_combat:crash");
        if (!(loss > 0)) return 0;
        WorldFeedback.emit(world, highjumpkickScene, 1, at,
            { moment: "crash", scale: scale, intensity: Math.max(0.7, Math.min(2.4, crash * 4)), dust: dust }, 30);
        WorldFeedback.text(world, highjumpkickAbove(at), highjumpkickCrashText, [], 28);
        world.sound("minecraft:entity.generic.big_fall", at, 16, "{}");
        return loss;
    }

    // actor 托管的落空债务：动作被取消时在它自己的作用域里补付砸偏代价。
    WorldCombat.effect(highjumpkickDebt, 1, 600, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["instance", "crash", "dust", "scale"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid highjumpkick debt: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(highjumpkickDebt, "start", function (effect) {
        const world = effect.world();
        if (!world.valid(effect.target())) { effect.end(); return; }
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(highjumpkickDebt, "watch", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const instance = Number(data.instance);
        if (highjumpkickActionActive(world, instance)) { effect.schedule("watch", "watch", 1, "{}"); return; }
        // 正常结束（stage=finished）不补付；只有被取消/打断才结清已承担的落空代价。
        const receipt = world.action(instance);
        if (receipt !== null && String(receipt.stage()) === "finished") { effect.end(); return; }
        const body = world.observe(self);
        if (body !== null) highjumpkickCrashPay(world, self, body.position().minus(WorldCombat.point(0, body.height() * 0.5, 0)),
            data.crash, data.dust, data.scale);
        effect.end();
    });
    WorldCombat.effectHandler(highjumpkickDebt, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        freeMovement: true,
        id: "highjumpkick",
        cooldownParameter: "recharge",
        name: "High Jump Kick",
        description: "先垂直拔高、再直坠落膝的重击：顶点短暂滞空时把落点画给对手看，随后膝头朝下砸进落点。命中是全族最重的一记接触伤害；砸偏，整条腿硬磕地面，自伤最狠。",
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
            const movementScenes = WorldFeedback.actionScenes(highjumpkickScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { movementScenes.finish(action, done); return; }

            const vertical = config && config.vertical === true;
            const leapHeight = Math.max(1.4, p("highjumpkick", "leapHeight", action));
            const leapSpeed = Math.max(0.2, p("highjumpkick", "leapSpeed", action));
            const diveSpeed = Math.max(0.4, p("highjumpkick", "diveSpeed", action));
            const drift = Math.max(0, p("highjumpkick", "drift", action));
            const hitRadius = Math.max(0.4, p("highjumpkick", "hitRadius", action));
            const reach = Math.max(1.5, p("highjumpkick", "reach", action));
            const power = p("highjumpkick", "knee", action);
            const crash = Math.max(0.03, Math.min(0.7, p("highjumpkick", "crash", action)));
            const shove = Math.max(0, p("highjumpkick", "shove", action));
            const dust = Math.max(4, Math.round(p("highjumpkick", "dust", action)));
            const holdTicks = Math.max(1, Math.round(p("highjumpkick", "holdTicks", action)));
            const settleSpeed = Math.max(0.2, p("highjumpkick", "settleSpeed", action));
            const scale = hitRadius / 0.7;
            const intensity = Math.max(0.6, Math.min(2.4, power / 130));
            const start = self.position();
            const bodyHeight = self.height();
            // 头顶按整身体积与真实净空限高：探针从头顶到头顶上方「拔高 + 整身高」，不强行抬 1 格。
            const head = start.plus(WorldCombat.point(0, bodyHeight * 0.5, 0));
            const probe = WorldGeometry.blockHit(world, head, head.plus(WorldCombat.point(0, leapHeight + bodyHeight + 0.4, 0)));
            let climb = leapHeight;
            if (probe !== null) {
                const ceiling = probe.position().y();
                climb = Math.max(0, Math.min(leapHeight, ceiling - head.y() - bodyHeight * 0.5 - 0.1));
            }
            const apexY = start.y() + climb;
            const target = action.target();
            const riseLimit = Math.max(1, Math.ceil(leapHeight / leapSpeed)) + 6;
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const targetPoint = targetBody !== null ? targetBody.position() : action.targetPosition();
            const targetHalf = targetBody !== null ? targetBody.height() * 0.5 : 0.7;
            const targetGround = highjumpkickGround(world, targetPoint, targetHalf, 24);
            let locked = targetGround !== null ? targetGround : WorldCombat.point(targetPoint.x(), targetPoint.y(), targetPoint.z());
            if (vertical) {
                // 垂直落膝：落点截在起跳点近身，不再从原位斜飞到远处目标。
                const horizontal = WorldCombat.point(locked.x() - start.x(), 0, locked.z() - start.z());
                const near = Math.max(0.4, self.width());
                const limited = horizontal.length() > near ? horizontal.unit().scale(near) : horizontal;
                locked = WorldCombat.point(start.x() + limited.x(), locked.y(), start.z() + limited.z());
            }
            let finished = false;
            let debt = 0;

            function finish(current: CombatAction): void { if (!finished) { finished = true; movementScenes.finish(current, done); } }
            function disarm(current: CombatAction): void {
                if (debt <= 0) return;
                current.world().operation(debt, "world_combat:dispel", "{}");
                debt = 0;
            }
            function ignoredFriends(live: CombatWorld, at: CombatPoint, radius: number): string {
                const refs: string[] = [];
                const found = live.query(at, radius, false);
                for (let index = 0; index < found.length; index++) {
                    const facts = live.observe(found[index]);
                    if (facts !== null && facts.friendly()) refs.push(String(found[index].ref()));
                }
                return JSON.stringify(refs);
            }
            /** 目标实时落点，但水平距离截到射程，移动目标不能把锁点无限带远。 */
            function trackLock(live: CombatWorld): void {
                if (vertical || target === null || !live.valid(target)) return;
                const body = live.observe(target);
                if (body === null) return;
                const ground = highjumpkickGround(live, body.position(), body.height() * 0.5, 24);
                const candidate = ground !== null ? ground : WorldCombat.point(body.position().x(), body.position().y(), body.position().z());
                const dx = candidate.x() - start.x(), dz = candidate.z() - start.z();
                const flat = Math.sqrt(dx * dx + dz * dz);
                locked = flat > reach
                    ? WorldCombat.point(start.x() + dx / flat * reach, candidate.y(), start.z() + dz / flat * reach)
                    : candidate;
            }

            sound(action, "cobblemon:move.aerialace.actor_1");
            movementScenes.show(action, "leap", start, { moment: "leap", height: climb, scale: scale, intensity: intensity, dust: dust });
            debt = world.effect(highjumpkickDebt, actor,
                JSON.stringify({ instance: action.id(), crash: crash, dust: dust, scale: scale }), 600);

            function crashLanding(current: CombatAction, at: CombatPoint): void {
                disarm(current);
                highjumpkickCrashPay(current.world(), actor, at, crash, dust, scale);
                finish(current);
            }

            /** 真实支撑面落地：脚未触地就继续下坠；只有真触地、且这趟砸空才磕地自伤。 */
            function descend(current: CombatAction, whiffed: boolean, stalled?: number): void {
                const wait = stalled === undefined ? 0 : stalled;
                const live = current.world(), me = live.observe(actor);
                if (me === null) { disarm(current); finish(current); return; }
                highjumpkickResetFall(live, actor);
                const feet = me.position().y() - me.height() * 0.5;
                const support = SurfacePaths.support(live, WorldCombat.point(me.position().x(), feet, me.position().z()), 0.7, 8);
                if (support !== null && feet > support.y() + 0.15) {
                    const drop = Math.max(0.4, Math.min(settleSpeed, feet - support.y() + 0.3));
                    const moved = live.displace(actor, WorldCombat.point(0, -drop, 0));
                    const now = live.observe(actor);
                    const to = now === null ? me.position() : now.position();
                    movementScenes.show(current, "dive", to, { moment: "dive", scale: scale, intensity: intensity,
                        path: [[me.position().x(), me.position().y(), me.position().z()], [to.x(), to.y(), to.z()]] });
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
                if (!hurt(current, victim, "highjumpkick", power, { damage: damageSpec("highjumpkick", "knee"), contact: true })) {
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
                WorldFeedback.emit(live, highjumpkickScene, 1, point,
                    { moment: "impact", target: String(victim.ref()), scale: scale, intensity: intensity, dust: dust,
                        count: Math.round(22 + power * 0.4) }, 34);
                sound(current, "cobblemon:impact.fighting");
                sound(current, "minecraft:entity.player.attack.strong");
                WorldFeedback.text(live, highjumpkickAbove(point), highjumpkickHitText, [], 28);
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
                highjumpkickResetFall(live, actor);
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

            function apex(current: CombatAction, wait: number): void {
                movementScenes.stop(current, "leap");
                const live = current.world(), me = live.observe(actor);
                if (me === null) { disarm(current); finish(current); return; }
                highjumpkickResetFall(live, actor);
                if (wait >= holdTicks) { dive(current); return; }
                movementScenes.show(current, "apex", me.position(), { moment: "apex", scale: 1, hitRadius: hitRadius, intensity: intensity,
                        point: [locked.x(), locked.y(), locked.z()] });
                current.after(1, function (next) { apex(next, wait + 1); });
            }

            function rise(current: CombatAction, count: number): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { disarm(current); finish(current); return; }
                trackLock(live);
                if (count >= riseLimit || me.position().y() >= apexY - 0.05) { apex(current, 0); return; }
                const up = Math.min(leapSpeed, Math.max(0, apexY - me.position().y()));
                // 头顶真实净空：撞到方块就及时转入顶点，不再空耗上升预算。
                const top = me.position().plus(WorldCombat.point(0, me.height() * 0.5, 0));
                if (WorldGeometry.blockHit(live, top, top.plus(WorldCombat.point(0, up + 0.15, 0))) !== null) { apex(current, 0); return; }
                const flatX = locked.x() - me.position().x(), flatZ = locked.z() - me.position().z();
                const flat = Math.sqrt(flatX * flatX + flatZ * flatZ);
                const horiz = Math.min(drift, flat);
                const delta = WorldCombat.point(flat < 0.01 ? 0 : flatX / flat * horiz, up, flat < 0.01 ? 0 : flatZ / flat * horiz);
                highjumpkickResetFall(live, actor);
                live.displace(actor, delta);
                const now = live.observe(actor);
                const to = now === null ? me.position() : now.position();
                movementScenes.show(current, "leap", to, { moment: "leap", height: climb, scale: scale, intensity: intensity, dust: dust,
                        path: [[me.position().x(), me.position().y(), me.position().z()], [to.x(), to.y(), to.z()]] });
                current.after(1, function (next) { rise(next, count + 1); });
            }

            rise(action, 0);
        }
    });
}
