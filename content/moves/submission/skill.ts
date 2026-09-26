/**
 * 地狱翻滚 / submission 的出手方式。
 *
 * 核心念头：贴身抓摔。压低身形扑上去抓住目标，拧身把它连同自己一起砸向地面——对方被按倒爬不起来，
 * 自己也垫在下面摔得生疼；对方块头越大越摔不动。抓得动就抱摔，抓不动（贴墙、被固定、载具等推不开）就只算
 * 原地角力重击：伤害与反噬照旧，但不强行位移、也不宣称把人按倒。中途脱手或拉开太远就收空，不隔空摔。
 * 一句话：不是撞过去，而是抓住再摔下去——本族里唯一有「抓取窗口」和「落地结果」的一招。
 *
 * 三幕：
 *   起（windup，提交前）：压低身形、探出身子，只播预告表现。
 *   抓（lunge → grab）：提交后逐刻沿瞄准方向扑过去；trace 碰到活体即抓住——先确认还够得着，再给目标挂上
 *       `world_combat:submission_grip`（共享身份 partiallytrapped）与 rooted，自己也停在原地。抓不到就扑空，没有自伤。
 *   摔（slam）：抓取窗口走完，先确认目标还在手里、还在贴身范围内；试着把它沿扑抓方向摁下去并量出真实位移。
 *       推得开：按 slam 结算接触伤害、按 recoil 比例反伤自己，挂上 `world_combat:submission_pin`（共享身份 pinned）并按实际落点演出。
 *       推不开：保留同一时刻的伤害与反噬，只播角力接触的压缩纹，不位移、不按倒。
 *
 * 与同族分开：猛撞/疯狂伏特/爆炸头突击都是直线冲撞，命中即结算；地狱翻滚要贴身、有抓取窗口、有落地结果，
 * 而且伤害与压制都随目标块头衰减。玩家凭「抓住→下摔」这两拍和对手被按在地上把它认出来。
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
        description: "扑上去抓住目标再摔向地面：命中造成接触伤害，能搬动就把对方按倒、移动大幅变慢，自己按实际伤害反噬一部分；推不动的大敌改为原地角力重击，伤害照旧但不被按倒。块头越大的目标摔得越轻、压制越短；扑空则没有伤害与自伤。",
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
            const power = p("submission", "slam", action);
            const recoil = p("submission", "recoil", action);
            const pinTicks = Math.max(1, Math.round(p("submission", "pinTicks", action)));
            const throwDistance = p("submission", "throw", action);
            const dust = Math.round(p("submission", "dust", action));
            const minimumMove = p("submission", "minimumMove", action);
            const pin = !!(config && config.pin);
            const direction = aim(action);
            const scale = radius / 0.55;
            const intensity = Math.max(0.6, Math.min(2.4, power / 85));
            let travelled = 0;

            const start = action.origin();
            const end = start.plus(direction.scale(reach));
            sound(action, "minecraft:entity.player.attack.strong");
            movementScenes.show(action, "lunge", start, { moment: "lunge", direction: [direction.x(), direction.y(), direction.z()],
                    path: [[start.x(), start.y(), start.z()], [end.x(), end.y(), end.z()]],
                    dust: dust, scale: scale, intensity: intensity });

            function whiff(current: CombatAction, key: string): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, submissionScene, 1, body.position(), { moment: "whiff", dust: dust, scale: scale }, 26);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), key, [], 28);
                }
                sound(current, "minecraft:block.sand.break");
                movementScenes.finish(current, done);
            }

            function slam(current: CombatAction, victim: CombatActor | null): void {
                const scope = current.world();
                const self = current.actor();
                const selfBody = scope.observe(self);
                const target = victim !== null && scope.valid(victim) ? victim : null;
                const targetBody = target !== null ? scope.observe(target) : null;
                // 还抱在手里、还在贴身范围内才算数；否则收空，不遥摔。
                const held = target !== null && MobEffects.read(scope, target, submissionGripEffect) !== null;
                if (!held || selfBody === null || targetBody === null || submissionSurfaceGap(selfBody, targetBody) > submissionHoldGap) {
                    whiff(current, submissionLostText);
                    return;
                }
                const down = direction.scale(throwDistance).plus(WorldCombat.point(0, -0.5, 0));
                const moved = scope.displace(target!, down);
                const afterBody = scope.observe(target!);
                const landing = afterBody !== null ? afterBody.position() : targetBody.position();
                // 位移被拒绝（贴墙、被固定、载具等）：只算角力接触，不强行位移、不按倒；伤害与反噬仍按时序结算。
                const immovable = down.length() > 0.001 && moved <= 0.01;
                const landed = hurt(current, target!, "submission", power,
                    { damage: damageSpec("submission", "slam"), contact: true, recoil: recoil });
                sound(current, "minecraft:item.mace.smash_ground_heavy");
                sound(current, "minecraft:entity.player.attack.sweep");
                if (immovable) {
                    WorldFeedback.emit(scope, submissionScene, 1, landing,
                        { moment: "clash", target: String(target!.ref()), dust: dust, scale: scale, intensity: intensity,
                            hits: Math.round(8 + dust * 0.4) }, 30);
                    WorldFeedback.text(scope, landing.plus(WorldCombat.point(0, 1.3, 0)), submissionClashText, [], 28);
                    movementScenes.finish(current, done);
                    return;
                }
                if (selfBody !== null) scope.displace(self, direction.scale(throwDistance * 0.4).plus(WorldCombat.point(0, -0.25, 0)));
                MobEffects.apply(scope, target!, submissionPinEffect, pinTicks, 0);
                WorldFeedback.emit(scope, submissionScene, 1, landing,
                    { moment: "slam", target: String(target!.ref()), dust: dust, scale: scale, intensity: intensity,
                        hits: Math.round(12 + dust * 0.6), pinned: pin ? 1 : 0, pin: pinTicks,
                        seconds: Math.round(pinTicks / 20 * 10) / 10 }, 34);
                WorldFeedback.text(scope, landing.plus(WorldCombat.point(0, 1.3, 0)), submissionHitText, [], 28);
                if (!landed) WorldFeedback.text(scope, landing.plus(WorldCombat.point(0, 1.55, 0)), submissionGrabText, [], 24);
                movementScenes.finish(current, done);
            }

            function grab(current: CombatAction, victim: CombatActor, point: CombatPoint): void {
                const scope = current.world();
                const selfBody = scope.observe(current.actor());
                const targetBody = scope.observe(victim);
                // 够不够得着：两体表面间距太大就只是擦过，不算抓住。
                if (selfBody === null || targetBody === null || submissionSurfaceGap(selfBody, targetBody) > submissionHoldGap) {
                    whiff(current, submissionMissText);
                    return;
                }
                movementScenes.stop(current);
                // 抓住：目标与自己都被固定住，给对手一个看得见的挣脱/被打断窗口。效果多留 2 刻，保证摔的那一瞬还握着。
                const applied = MobEffects.apply(scope, victim, submissionGripEffect, grip + 2, 0);
                const rooted = WorldEffects.apply(scope, victim, "rooted", {}, grip + 2);
                scope.stopMovement(victim);
                scope.stopMovement(current.actor());
                // root 或抓取载体没能真正落下：不当成抓住，收起这一扑。
                if (applied === null || rooted <= 0) {
                    whiff(current, submissionMissText);
                    return;
                }
                const from = selfBody.position();
                WorldFeedback.emit(scope, submissionScene, 1, point,
                    { moment: "grab", target: String(victim.ref()), scale: scale, seconds: Math.round(grip / 20 * 10) / 10,
                        path: [[from.x(), from.y(), from.z()], [point.x(), point.y(), point.z()]] }, 28);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), submissionGrabText, [], 26);
                sound(current, "minecraft:entity.player.attack.strong");
                current.after(grip, function (next: CombatAction) { slam(next, victim); });
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
                    grab(current, hit.target()!, hit.position());
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
