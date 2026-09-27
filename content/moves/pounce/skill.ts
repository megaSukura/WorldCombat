/**
 * 虫扑 / pounce 的出手方式。
 *
 * 核心念头：从远处高高跃起，沿一条抛物线甩过空中，落在目标身上——体重下坠把它压住，腿脚随即缠住它的动作，
 * 让它沉下来、慢下来。命中后施法者留在目标身边，目标挂着 clung 身份。它与起草（贴地草绿窜跃）、踢倒
 * （直线突进踢）不同：虫扑是**高弧落在目标身上**，落点就是目标本身，之后多出一段缠身的持续状态。
 *
 * 选取：kind 为 aim——可以锁定一个实体、也可以朝一个方向或世界点空跳。快照在提交后锁定，空点同样执行。
 *
 * 三幕：
 *   起（crouch，提交前）：屈膝压地、看准目标背侧，只播预告。
 *   扑（launch → leap，提交后）：起点只播蹬地并标出落点预告（不预先涂满整条弧），随后身体逐刻沿同一条弧的真实
 *       增量移动；每刻用 `moveSweep` 先真实接触、再结算，已接触的友方记进忽略表继续扫剩余段，不用裸 displace 越过。
 *       空中最先碰到非友方活体时，就地伤害；伤害真的落地后才挂 cling（载体）并把掉速窗口归该载体所有、腿脚被压住
 *       一瞬。接触一点即收势，之后身体自然下落，不先报落地。途中撞上方块（顶棚、墙）即收束落地。
 *   落（miss）：一路扑到底都没碰到人，就在身体实际所在处扬起尘土。
 *
 * 弧终点按目标附近真实可容身支撑或明确可接触的空中目标生成；掉速走 `NativeEffects.boostWindow` 的共享速度窗口，
 * 对宝可梦和其他生物同一条路，清除 cling 即撤其掉速。
 */
namespace PokemonSkills {
    const pounceScene = "world_combat:move_pounce";
    const pounceCling = "world_combat:pounce_cling";
    const pounceClingMark = "world_combat:move_pounce/cling_mark";
    const pounceClingText = "world_combat.move.pounce.text.cling";
    const pounceMissText = "world_combat.move.pounce.text.miss";

    /**
     * 缠身托管载体：把「贴在目标身上的缠足画面」绑在真实 cling 状态的生命周期上，
     * 自然到期、牛奶／`/effect clear` 提前拿掉都随它一起停，不靠固定时长的独立 keep 残留。
     */
    function pounceClingWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        if (!world.valid(target)) { effect.end(); return; }
        const body = world.observe(target);
        if (body === null) { effect.end(); return; }
        const carrier = world.mobEffect(target, pounceCling);
        if (carrier === null) { effect.end(); return; }
        const state = JSON.parse(effect.state() || "{}");
        const stages = typeof state.stages === "number" && state.stages > 0 ? state.stages : 1;
        const motes = typeof state.motes === "number" && state.motes > 0 ? state.motes : 14;
        const intensity = typeof state.intensity === "number" ? state.intensity : 1;
        const scale = typeof state.scale === "number" ? state.scale : 1;
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        WorldFeedback.onEffect(world, effect.id(), "cling", pounceScene, 1, body.position(),
            { moment: "cling", target: String(target.ref()), stages: stages, motes: motes, intensity: intensity, scale: scale, tick: remaining });
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effect(pounceClingMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid pounce cling mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(pounceClingMark, "start", pounceClingWatch);
    WorldCombat.effectHandler(pounceClingMark, "watch", pounceClingWatch);
    WorldCombat.effectHandler(pounceClingMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 状态被牛奶／/effect clear 提前拿掉时，立即撤掉托管表现，不等它自己的下一次巡检。
    WorldCombat.on("world_combat:move_pounce/cling-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== pounceCling) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新会重建 carrier：仍带着同类载体时保留新标记，不误收。
        if (world.mobEffect(actor, pounceCling) !== null) return;
        world.effects(actor, pounceClingMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    define({
        freeMovement: true,
        id: "pounce",
        name: "Pounce",
        description: "从远处高高跃起，沿一条抛物线甩过空中、落在目标身上：体重下坠把它压住，腿脚随即缠住它的动作，让它沉下来、慢下来，并只结算最先碰上的那一个。命中后施法者留在目标身边、自然落下。缠身式缠得更久、掉速更深，单发更轻。",
        uses: ["从中距离扑上去贴住对手", "先缠住，再用重招收掉", "压住想跑的对手的速度"],
        kind: "aim",
        range: 4.4,
        maxRange: 5.4,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 26,
        style: "leap",
        defaults: { cling: false, ai: { maxChase: 8, preferFresh: true } },
        fields: [
            flag("cling", "缠身")
        ],
        indicator: function (config, pokemon) {
            return { radius: p("pounce", "leap", pokemon) + 0.5, geometry: "line", style: "leap",
                color: 0xA6C24A, label: config && config.cling === true ? "虫扑·缠身" : "虫扑" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["pounce"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const cling = !!(config && config.cling);
            return { prepare: Math.round(p("pounce", "tempo", context)) + (cling ? 2 : 0), recover: 8 + (cling ? 3 : 0),
                cooldown: 26 + (cling ? 6 : 0), active: 0, range: p("pounce", "leap", context) + 0.6 };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_pounce:crouch", pounceScene, 1, action.origin(),
                JSON.stringify({ moment: "crouch", cling: config && config.cling ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const movementScenes = WorldFeedback.actionScenes(pounceScene);
            const startFeet = body.position().minus(WorldCombat.point(0, body.height() / 2, 0));
            const aimPoint = action.targetPosition();
            const target = action.target();
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const targetRef = target === null ? "" : String(target.ref());
            const distance0 = p("pounce", "leap", action);
            const pace = p("pounce", "pace", action);
            const apex = p("pounce", "apex", action);
            const girth = p("pounce", "girth", action);
            const power = p("pounce", "slam", action);
            const stages = Math.max(1, Math.round(p("pounce", "slowStages", action)));
            const clingTicks = Math.max(30, Math.round(p("pounce", "clingTicks", action)));
            const rootTicks = Math.max(0, Math.round(p("pounce", "rootTicks", action)));
            const motes = Math.max(10, Math.round(p("pounce", "motes", action)));
            const cling = !!(config && config.cling);
            const scale = (body.width() + body.height()) / 2.3;
            const intensity = Math.max(0.6, Math.min(2.2, power / 50));
            let dx = aimPoint.x() - startFeet.x(), dz = aimPoint.z() - startFeet.z();
            const gap0 = Math.sqrt(dx * dx + dz * dz);
            if (gap0 < 0.01) { const facing = aim(action); dx = facing.x(); dz = facing.z(); }
            const span = Math.sqrt(dx * dx + dz * dz) || 1;
            const ux = dx / span, uz = dz / span;
            const distance = Math.min(distance0, Math.max(1.5, gap0));
            const steps = Math.max(3, Math.round(distance / pace));
            // 弧终点按目标附近真实可容身支撑或明确可接触的空中目标生成；够不到时保持自身高度。
            let landingY = startFeet.y();
            if (gap0 <= distance0 + 0.01) {
                if (targetBody !== null) landingY = targetBody.boundsMin().y();
                else {
                    const support = SurfacePaths.support(world, aimPoint, 0.6, 3);
                    if (support !== null) landingY = support.y();
                }
            }
            function feetOf(observation: CombatObservation): CombatPoint {
                return observation.position().minus(WorldCombat.point(0, observation.height() / 2, 0));
            }
            // 弧线在脚坐标上定义，终点高度进入曲线；身体的实际移动取这条弧的逐刻增量，交给原生 sweep 碰撞。
            function arcFeet(t: number): CombatPoint {
                return WorldCombat.point(startFeet.x() + ux * distance * t,
                    startFeet.y() + (landingY - startFeet.y()) * t + apex * 4 * t * (1 - t),
                    startFeet.z() + uz * distance * t);
            }
            const landingFeet = arcFeet(1);
            const ignored: string[] = [];
            let settled = false;
            sound(action, "cobblemon:move.aerialace.actor_1");
            // 起点蹬地 + 落点标记：只播明确未到达的预告，不把整条弧预先涂满；真实轨迹由 leap 随身体经过描出。
            WorldFeedback.emit(world, pounceScene, 1, landingFeet,
                { moment: "launch", target: targetRef, motes: motes, scale: scale, intensity: intensity,
                    cling: cling ? 1 : 0, apex: apex, landing: [landingFeet.x(), landingFeet.y(), landingFeet.z()] }, 30);

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                movementScenes.finish(current, done);
            }

            /** 落空/被挡住：从身体实际所在处出反馈，不再拿计划弧点冒充落点。 */
            function miss(current: CombatAction, reason: string): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self === null ? landingFeet : self.position();
                movementScenes.stop(current, "leap");
                WorldFeedback.emit(scope, pounceScene, 1, at,
                    { moment: "miss", motes: motes, scale: scale, intensity: intensity, reason: reason }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), pounceMissText, [], 22);
                sound(current, "minecraft:entity.player.attack.weak");
                finish(current);
            }

            /** 第一处身体接触：先真实接触，成功与拒伤分别反馈；carrier 成功后才挂掉速窗口。 */
            function strike(current: CombatAction, victim: CombatActor, hit: CombatImpact): void {
                if (settled) return;
                const scope = current.world();
                const landed = hurt(current, victim, "pounce", power, { damage: damageSpec("pounce", "slam"), contact: true });
                const at = scope.observe(victim);
                if (landed && at !== null && scope.valid(victim)) {
                    // carrier 成功后 boostWindow：掉速窗口归缠身载体所有，清除缠身即撤其掉速。
                    // 刷新时传上一次 carrier 快照，续期旧窗口而不是叠一层；先撤旧标记，避免留下失效锚。
                    const previous = world.mobEffect(victim, pounceCling);
                    const carrier = MobEffects.apply(scope, victim, pounceCling, clingTicks, 0);
                    if (carrier !== null) {
                        scope.effects(victim, pounceClingMark).forEach(function (view) {
                            scope.operation(view.id(), "world_combat:dispel", "{}");
                        });
                        const window = NativeEffects.boostWindow(scope, victim, { spe: -stages }, clingTicks,
                            "world_combat:pounce_cling", carrier, previous);
                        scope.effect(pounceClingMark, victim,
                            JSON.stringify({ stages: stages, motes: motes, intensity: intensity, scale: scale }), clingTicks);
                        if (window !== 0)
                            WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.1, 0)), pounceClingText, [stages], 28);
                    }
                    if (rootTicks > 0) WorldEffects.apply(scope, victim, "rooted", {}, rootTicks);
                    WorldFeedback.emit(scope, pounceScene, 1, at.position(),
                        { moment: "impact", target: String(victim.ref()), motes: motes, intensity: intensity, scale: scale }, 26);
                } else {
                    const where = at !== null ? at.position() : hit.position();
                    WorldFeedback.emit(scope, pounceScene, 1, where,
                        { moment: "refuse", target: String(victim.ref()), scale: scale }, 20);
                }
                sound(current, "cobblemon:impact.bug");
                movementScenes.stop(current, "leap");
                finish(current);
            }

            /**
             * 沿弧的真实增量用 `moveSweep` 推进：本刻预算内连续扫过，已接触的友方记进忽略表再扫剩余段，
             * 既不越过后方敌体、也不裸 displace 跳人；首个非友方接触即结算终局。
             */
            function step(current: CombatAction, index: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                if (index >= steps) { miss(current, "spent"); return; }
                const t1 = (index + 1) / steps;
                let remaining = arcFeet(t1).minus(feetOf(self));
                let guard = 0;
                while (remaining.length() > 0.001 && guard++ < 8) {
                    const before = current.origin();
                    const hit = current.moveSweep(remaining, girth, JSON.stringify(ignored));
                    const moved = current.origin().minus(before).length();
                    if (hit.hitEntity()) {
                        const victim = hit.target();
                        if (victim !== null && !scope.friendly(victim) && String(victim.ref()) !== String(actor.ref())) {
                            strike(current, victim, hit); return;
                        }
                        const ref = victim !== null ? String(victim.ref()) : String(hit.entity());
                        if (ignored.indexOf(ref) < 0) ignored.push(ref);
                        if (moved < 0.001) break;
                        const now = scope.observe(actor);
                        if (now === null) { finish(current); return; }
                        remaining = arcFeet(t1).minus(feetOf(now));
                        continue;
                    }
                    if (hit.blocked()) { miss(current, "blocked"); return; }
                    if (moved < 0.02) { miss(current, "stalled"); return; }
                    break;
                }
                const after = scope.observe(actor);
                // 只有真实虫身逐刻经过才拖尾：显示位置取当前身体，而不是计划弧点。
                movementScenes.show(current, "leap", after === null ? current.origin() : after.position(),
                    { moment: "leap", motes: Math.round(motes * (0.5 + t1 * 0.5)), scale: scale, progress: t1,
                        intensity: intensity, cling: cling ? 1 : 0 });
                current.after(1, function (next: CombatAction) { step(next, index + 1); });
            }

            step(action, 0);
        }
    });
}
