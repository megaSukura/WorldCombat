/**
 * 地狱翻滚 / submission 的出手方式。
 *
 * 核心念头：贴身抓摔。压低身形扑上去抓住目标，拧身把它连同自己一起砸向地面——对方被按倒爬不起来，
 * 自己也垫在下面摔得生疼；对方块头越大越摔不动。抓得动就抱摔，抓不动（贴墙、被固定、载具等推不开）就只算
 * 原地角力重击：伤害与反噬照旧，但不把人按倒。中途脱手或拉开太远就收空，不隔空摔。
 * 一句话：不是撞过去，而是抓住再摔下去——本族里唯一有「抓取窗口」和「落地结果」的一招。
 *
 * 三幕：
 *   起（windup，提交前）：压低身形、探出身子，只播预告表现。
 *   抓（lunge → grab）：提交后逐刻沿瞄准方向扑过去；碰到活体即抓住——先排除友体、确认还够得着，再借本次 carrier
 *       的归属给目标挂上 `world_combat:submission_grip`（共享身份 partiallytrapped），双方停步。
 *   摔（slam）：抓取窗口走完，先确认目标还在手里、每刻的真实接触与视线都成立；逐刻把它沿扑抓方向前下推，
 *       量出真实位移（走 hitDisplace，保留原生抗击退）。推得动：按实际伤害结算、按比例反噬、真实伤害命中才按倒。
 *       推不开：保留同一时刻的伤害与反噬，只播角力接触的压缩纹，不位移、不按倒。
 *
 * 抓持与取消：抓取用本次动作 carrier 的 lease 归属，抓取窗口每刻复核真实间距与遮挡；失败、脱手或取消都同时释放。
 * 配置 pin（压制/抛摔）由 resolve 与公式共同改变结果，提交后才触碰世界。
 */
namespace PokemonSkills {
    const submissionScene = "world_combat:move_submission";
    const submissionGripEffect = "world_combat:submission_grip";
    const submissionPinEffect = "world_combat:submission_pin";
    const submissionHitText = "world_combat.move.submission.text.hit";
    const submissionMissText = "world_combat.move.submission.text.miss";
    const submissionGrabText = "world_combat.move.submission.text.grab";
    const submissionLostText = "world_combat.move.submission.text.lost";
    const submissionClashText = "world_combat.move.submission.text.clash";
    /** 判定「还抱在手里」的两体表面间距上限；超过就算脱手，不隔空摔。 */
    const submissionHoldGap = 1.2;

    function submissionSurfaceGap(first: CombatObservation, second: CombatObservation): number {
        return first.position().minus(second.position()).length() - (first.width() + second.width()) * 0.5;
    }

    define({
        freeMovement: true,
        id: "submission",
        cooldownParameter: "recharge",
        name: "Submission",
        description: "扑上去抓住目标再摔向地面：命中造成接触伤害，能搬动且真实受伤就把对方按倒、移动大幅变慢，自己按实际伤害反噬一部分；推不动的大敌改为原地角力重击，伤害照旧但不被按倒。块头越大的目标摔得越轻、压制越短；扑空则没有伤害与自伤。",
        uses: ["把贴脸的目标抓住按倒，为队友创造输出窗口", "抓住贴脸的对手，让它一段时间动弹不得", "对推不动的大敌改成原地角力，照样打满伤害"],
        kind: "enemy",
        range: 3,
        maxRange: 4.2,
        prepare: 6,
        active: 30,
        recover: 12,
        cooldown: 36,
        style: "grapple",
        stationary: true,
        defaults: { pin: false, ai: { maxChase: 6, minHealth: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("submission", "gripRadius", pokemon) * 1.6, geometry: "line", style: "grapple", color: 0xB07A50, label: "地狱翻滚" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["submission"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("submission", "tempo", context)),
                recover: Math.round(p("submission", "aftercast", context)),
                cooldown: Math.round(p("submission", "recharge", context)),
                range: p("submission", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_submission:windup", submissionScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", pin: !!(config && config.pin) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(submissionScene);
            const world = action.world();
            const actor = action.actor();
            const reach = p("submission", "reach", action);
            const pace = p("submission", "pace", action);
            const radius = p("submission", "gripRadius", action);
            const grip = Math.max(1, Math.round(p("submission", "gripTicks", action)));
            const throwDistance = p("submission", "throw", action);
            const dust = Math.round(p("submission", "dust", action));
            const minimumMove = p("submission", "minimumMove", action);
            const pin = !!(config && config.pin);
            const direction = aim(action);
            const scale = radius / 0.55;
            let gripToken = 0, travelled = 0;

            const start = action.origin();
            const end = start.plus(direction.scale(reach));
            sound(action, "minecraft:entity.player.attack.strong");
            movementScenes.show(action, "lunge", start, { moment: "lunge", direction: [direction.x(), direction.y(), direction.z()],
                    path: [[start.x(), start.y(), start.z()], [end.x(), end.y(), end.z()]],
                    dust: dust, scale: scale });

            /** 本次 carrier 的归属：释放后原生载体一起撤下，取消或失败时不残留抓持。 */
            function releaseGrip(scope: CombatWorld): void {
                if (gripToken > 0) { MobEffects.release(scope, gripToken); gripToken = 0; }
            }

            function whiff(current: CombatAction, key: string): void {
                const scope = current.world();
                releaseGrip(scope);
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, submissionScene, 1, body.position(), { moment: "whiff", dust: dust, scale: scale }, 26);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), key, [], 28);
                }
                sound(current, "minecraft:block.sand.break");
                movementScenes.finish(current, done);
            }

            /** 逐刻前下摔：真实撞击面与原生位移先结算，三段推完才量出移得动与否。 */
            function slam(current: CombatAction, victim: CombatActor): void {
                const scope = current.world(), self = current.actor();
                const selfBody = scope.observe(self), targetBody = scope.observe(victim);
                if (selfBody === null || targetBody === null || MobEffects.read(scope, victim, submissionGripEffect) === null
                    || submissionSurfaceGap(selfBody, targetBody) > submissionHoldGap) {
                    whiff(current, submissionLostText);
                    return;
                }
                releaseGrip(scope);
                // 实际抓到谁，就用谁的体格重算摔击、反噬与压制；不看最初选中的目标。
                const victimContext = withTarget(factContext(current), victim);
                const slamPower = p("submission", "slam", victimContext);
                const recoilPct = p("submission", "recoil", victimContext);
                const victimPinTicks = Math.max(1, Math.round(p("submission", "pinTicks", victimContext)));
                const intensity = Math.max(0.6, Math.min(2.4, slamPower / 85));
                const down = direction.scale(throwDistance).plus(WorldCombat.point(0, -0.5, 0));
                const selfDown = direction.scale(throwDistance * 0.4).plus(WorldCombat.point(0, -0.25, 0));
                const steps = 3;
                let index = 0, moved = 0;

                function fall(next: CombatAction): void {
                    const stepScope = next.world();
                    if (stepScope.observe(victim) === null) { whiff(next, submissionLostText); return; }
                    moved += stepScope.hitDisplace(victim, down.scale(1 / steps));
                    if (stepScope.valid(self)) stepScope.displace(self, selfDown.scale(1 / steps));
                    index++;
                    if (index < steps) { next.after(1, fall); return; }
                    land(next);
                }

                function land(next: CombatAction): void {
                    const scope = next.world();
                    const after = scope.observe(victim);
                    const landing = after !== null ? after.position() : targetBody!.position();
                    // 位移被拒（贴墙、被固定、载具等）：只算角力接触，不强行位移、不按倒；伤害与反噬仍按时序结算。
                    const immovable = down.length() > 0.001 && moved <= 0.02;
                    const landed = hurt(next, victim, "submission", slamPower,
                        { damage: damageSpec("submission", "slam"), contact: true, recoil: recoilPct });
                    sound(next, "minecraft:item.mace.smash_ground_heavy");
                    sound(next, "minecraft:entity.player.attack.sweep");
                    if (immovable || !landed) {
                        // 推不动或没能真正伤到：只播接触处的压缩纹，不按倒、不出重尘；伤害失败时不擅附 pin。
                        WorldFeedback.emit(scope, submissionScene, 1, landing,
                            { moment: "clash", target: String(victim.ref()), dust: dust, scale: scale, intensity: intensity,
                                hits: Math.round(8 + dust * 0.4) }, 30);
                        WorldFeedback.text(scope, landing.plus(WorldCombat.point(0, 1.3, 0)),
                            immovable ? submissionClashText : submissionGrabText, [], 28);
                        movementScenes.finish(next, done);
                        return;
                    }
                    MobEffects.apply(scope, victim, submissionPinEffect, victimPinTicks, 0);
                    WorldFeedback.emit(scope, submissionScene, 1, landing,
                        { moment: "slam", target: String(victim.ref()), dust: dust, scale: scale, intensity: intensity,
                            hits: Math.round(12 + dust * 0.6), pinned: pin ? 1 : 0, pin: victimPinTicks,
                            seconds: Math.round(victimPinTicks / 20 * 10) / 10 }, 34);
                    WorldFeedback.text(scope, landing.plus(WorldCombat.point(0, 1.3, 0)), submissionHitText, [], 28);
                    movementScenes.finish(next, done);
                }

                fall(current);
            }

            /** 抓取窗口：每刻复核真实 AABB 接近与视线，一断就脱手收空；窗口走完进入摔。 */
            function hold(current: CombatAction, victim: CombatActor, remaining: number): void {
                if (remaining <= 0) { slam(current, victim); return; }
                const scope = current.world();
                const selfBody = scope.observe(current.actor()), targetBody = scope.observe(victim);
                if (selfBody === null || targetBody === null || !scope.valid(victim)
                    || submissionSurfaceGap(selfBody, targetBody) > submissionHoldGap
                    || !scope.clear(selfBody.position(), targetBody.position())) {
                    whiff(current, submissionLostText);
                    return;
                }
                current.after(1, function (next: CombatAction) { hold(next, victim, remaining - 1); });
            }

            function grab(current: CombatAction, victim: CombatActor, point: CombatPoint): void {
                const scope = current.world();
                // 首碰先排友体：友方身体不算抓住。
                if (scope.friendly(victim)) { whiff(current, submissionMissText); return; }
                const selfBody = scope.observe(current.actor()), targetBody = scope.observe(victim);
                // 够不够得着：两体表面间距太大就只是擦过，不算抓住。
                if (selfBody === null || targetBody === null || submissionSurfaceGap(selfBody, targetBody) > submissionHoldGap) {
                    whiff(current, submissionMissText);
                    return;
                }
                movementScenes.stop(current);
                // 抓住：目标被真实载体握住，自己也停步。载体归属本次动作，取消或失败一起释放。
                const applied = MobEffects.apply(scope, victim, submissionGripEffect, grip + 2, 0);
                if (applied === null) { whiff(current, submissionMissText); return; }
                gripToken = MobEffects.bind(scope, victim, submissionGripEffect, applied);
                scope.stopMovement(victim);
                scope.stopMovement(current.actor());
                if (gripToken <= 0) { whiff(current, submissionMissText); return; }
                const from = selfBody.position();
                WorldFeedback.emit(scope, submissionScene, 1, point,
                    { moment: "grab", target: String(victim.ref()), scale: scale, seconds: Math.round(grip / 20 * 10) / 10,
                        path: [[from.x(), from.y(), from.z()], [point.x(), point.y(), point.z()]] }, 28);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), submissionGrabText, [], 26);
                sound(current, "minecraft:entity.player.attack.strong");
                hold(current, victim, grip);
            }

            function lunge(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(pace, Math.max(0, reach - travelled));
                if (step <= 0.001) { whiff(current, submissionMissText); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity() && hit.target() !== null) {
                    const victim = hit.target()!;
                    if (scope.friendly(victim)) { whiff(current, submissionMissText); return; }
                    grab(current, victim, hit.position());
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= reach) { whiff(current, submissionMissText); return; }
                movementScenes.show(current, "wake", origin, { moment: "wake", dust: dust, scale: scale });
                current.after(1, lunge);
            }

            lunge(action);
        }
    });

    // 倒地期间把导航速度拖慢：让「爬不起来」对所有活体（含宝可梦的脚本导航）成立。
    WorldCombat.on("world_combat:move_submission/slow", "world_combat:navigate", "", function (event) {
        if (event.world().mobEffect(event.actor(), submissionPinEffect) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed *= 0.35;
        event.data(JSON.stringify(data));
    });
}
