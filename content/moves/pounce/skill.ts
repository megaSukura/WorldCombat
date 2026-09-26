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
 *   扑（launch → leap，提交后）：先画出这一扑会经过的弧线（预告，不是身体本身），随后身体逐刻沿同一条弧的真实
 *       增量移动；每刻用 `sweepStep` 先真实接触、再结算。空中最先碰到非友方活体时，就地伤害、掉速度等级、挂 clung、
 *       腿脚被压住一瞬，飞行场景到此停止。途中撞上方块（顶棚、墙）即收束落地。
 *   落（miss）：一路扑到底都没碰到人，就在身体实际所在处扬起尘土。
 *
 * 掉速走 `NativeEffects.boost` 的共享速度等级，对宝可梦和其他生物同一条路。
 */
namespace PokemonSkills {
    const pounceScene = "world_combat:move_pounce";
    const pounceCling = "world_combat:pounce_cling";
    const pounceClingText = "world_combat.move.pounce.text.cling";
    const pounceMissText = "world_combat.move.pounce.text.miss";

    define({
        freeMovement: true,
        id: "pounce",
        name: "Pounce",
        description: "从远处高高跃起，沿一条抛物线甩过空中、落在目标身上：体重下坠把它压住，腿脚随即缠住它的动作，让它沉下来、慢下来，并只结算最先碰上的那一个。命中后施法者留在目标身边。缠身式缠得更久、掉速更深，单发更轻。",
        uses: ["从中距离扑上去贴住对手", "先缠住，再用重招收掉", "压住想跑的对手的速度"],
        kind: "aim",
        range: 4.4,
        maxRange: 4.4,
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
            const half = body.height() / 2;
            const startFeet = body.position().minus(WorldCombat.point(0, half, 0));
            const aimPoint = action.targetPosition();
            const targetRef = action.target() === null ? "" : String(action.target()!.ref());
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
            const gap = Math.sqrt(dx * dx + dz * dz);
            if (gap < 0.01) { const facing = aim(action); dx = facing.x(); dz = facing.z(); }
            const span = Math.sqrt(dx * dx + dz * dz) || 1;
            const ux = dx / span, uz = dz / span;
            const distance = Math.min(distance0, Math.max(1.5, gap));
            const steps = Math.max(3, Math.round(distance / pace));
            const landingFeet = WorldCombat.point(startFeet.x() + ux * distance, startFeet.y(), startFeet.z() + uz * distance);
            // 弧线在脚坐标上定义；身体的实际移动取这条弧的逐刻增量，交给原生 sweep 碰撞。
            function arcFeet(t: number): CombatPoint {
                return WorldCombat.point(startFeet.x() + ux * distance * t,
                    startFeet.y() + apex * 4 * t * (1 - t),
                    startFeet.z() + uz * distance * t);
            }
            const path: number[][] = [];
            for (let sample = 0; sample <= 6; sample++) {
                const at = arcFeet(sample / 6);
                path.push([at.x(), at.y(), at.z()]);
            }
            let settled = false;
            sound(action, "cobblemon:move.aerialace.actor_1");
            // 弧线预告：把这一扑会经过的线画出来给对手读，不等于身体已经飞过。
            WorldFeedback.emit(world, pounceScene, 1, startFeet,
                { moment: "launch", target: targetRef, motes: motes, scale: scale, intensity: intensity,
                    cling: cling ? 1 : 0, apex: apex, path: path,
                    landing: [landingFeet.x(), landingFeet.y(), landingFeet.z()] }, 30);

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

            /** 第一处身体接触：先真实接触，再按伤害回执结算减速与缠身。 */
            function strike(current: CombatAction, target: CombatActor, hit: CombatImpact): void {
                if (settled) return;
                const scope = current.world();
                const landed = hurt(current, target, "pounce", power, { damage: damageSpec("pounce", "slam"), contact: true });
                const at = scope.observe(target);
                if (landed && at !== null && scope.valid(target)) {
                    NativeEffects.boost(scope, target, "spe", -stages);
                    MobEffects.apply(scope, target, pounceCling, clingTicks, 0);
                    if (rootTicks > 0) WorldEffects.apply(scope, target, "rooted", {}, rootTicks);
                    WorldFeedback.keep(scope, "pounce:cling:" + String(target.ref()), pounceScene, 1, at.position(),
                        { moment: "cling", target: String(target.ref()), stages: stages, motes: motes,
                            intensity: intensity, tick: clingTicks }, clingTicks);
                    WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.1, 0)), pounceClingText, [stages], 28);
                }
                const where = at !== null ? at.position() : hit.position();
                WorldFeedback.emit(scope, pounceScene, 1, where,
                    { moment: "impact", target: String(target.ref()), motes: motes, intensity: intensity, scale: scale }, 26);
                sound(current, "cobblemon:impact.bug");
                movementScenes.stop(current, "leap");
                finish(current);
            }

            function step(current: CombatAction, index: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                if (index >= steps) { miss(current, "spent"); return; }
                const t1 = (index + 1) / steps;
                const feet = self.position().minus(WorldCombat.point(0, self.height() / 2, 0));
                const delta = arcFeet(t1).minus(feet);
                if (delta.length() < 1e-6) { current.after(1, function (next: CombatAction) { step(next, index + 1); }); return; }
                const swept = sweepStep(current, delta, girth), hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && !scope.friendly(victim)) { strike(current, victim, hit); return; }
                    // 友方挡在弧线上不算命中：把没走完的直线补上继续飞。
                    if (swept.remaining.length() > 0.001) scope.displace(actor, swept.remaining);
                }
                const after = scope.observe(actor);
                // 只有真实虫身逐刻经过才拖尾：显示位置取当前身体，而不是计划弧点。
                movementScenes.show(current, "leap", after === null ? hit.position() : after.position(),
                    { moment: "leap", motes: Math.round(motes * (0.5 + t1 * 0.5)), scale: scale, progress: t1,
                        intensity: intensity, cling: cling ? 1 : 0 });
                if (hit.blocked() || swept.moved < 0.02) { miss(current, hit.blocked() ? "blocked" : "stalled"); return; }
                current.after(1, function (next: CombatAction) { step(next, index + 1); });
            }

            step(action, 0);
        }
    });
}
