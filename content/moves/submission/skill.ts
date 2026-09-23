/**
 * 地狱翻滚 / submission 的出手方式。
 *
 * 核心念头：贴身抓摔。压低身形扑上去抓住目标，拧身把它连同自己一起砸向地面——对方被按倒爬不起来，
 * 自己也垫在下面摔得生疼；对方块头越大越摔不动、压得越短。
 * 一句话：不是撞过去，而是抓住再摔下去——本族里唯一有「抓取窗口」和「倒地结果」的一招。
 *
 * 三幕：
 *   起（windup，提交前）：压低身形、探出身子，只播预告表现。
 *   抓（lunge → grab）：提交后逐刻沿瞄准方向扑过去；trace 碰到活体即抓住——给目标挂上
 *       `world_combat:submission_grip`（共享身份 partiallytrapped）并 rooted，自己也停在原地。
 *       抓不到就扑空，没有自伤。
 *   摔（slam）：抓取窗口走完，把目标沿扑抓方向连同自己一起砸向地面，按 slam 结算接触伤害、
 *       按 recoil 比例反伤自己（共享结算），给目标挂上 `world_combat:submission_pin`（共享身份 pinned，
 *       由本单元的导航监听拖慢它对所有活体生效）并甩开 throw 格。
 *
 * 与同族分开：猛撞/疯狂伏特/爆炸头突击都是直线冲撞，命中即结算；地狱翻滚要贴身、有抓取窗口、有倒地结果，
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

    define({
        freeMovement: true,
        id: "submission",
        cooldownParameter: "recharge",
        name: "Submission",
        description: "扑上去抓住目标再摔向地面：命中造成接触伤害，把对方按倒、移动大幅变慢，自己也按实际伤害反噬一部分。块头越大的目标摔得越轻、压制越短；扑空则没有伤害与自伤。",
        uses: ["把贴脸的目标抓住按倒，为队友创造输出窗口", "抓住贴脸的对手，让它一段时间动弹不得", "用压制把对手钉在原地，自己挨一下"],
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
            const world = action.world();
            const actor = action.actor();
            const reach = p("submission", "reach", action);
            const pace = p("submission", "pace", action);
            const radius = p("submission", "gripRadius", action);
            const traceAhead = p("submission", "traceAhead", action);
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
            WorldFeedback.emit(world, submissionScene, 1, start,
                { moment: "lunge", direction: [direction.x(), direction.y(), direction.z()],
                    path: [[start.x(), start.y(), start.z()], [end.x(), end.y(), end.z()]],
                    dust: dust, scale: scale, intensity: intensity }, 60);

            function whiff(current: CombatAction, key: string): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, submissionScene, 1, body.position(), { moment: "whiff", dust: dust, scale: scale }, 26);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), key, [], 28);
                }
                sound(current, "minecraft:block.sand.break");
                done(current);
            }

            function slam(current: CombatAction, victim: CombatActor | null): void {
                const scope = current.world();
                const self = current.actor();
                const target = victim !== null && scope.valid(victim) ? victim : null;
                const selfBody = scope.observe(self);
                let landed = false;
                if (target !== null) {
                    const targetBody = scope.observe(target);
                    const point = targetBody !== null ? targetBody.position() : (selfBody !== null ? selfBody.position() : null);
                    const down = direction.scale(throwDistance).plus(WorldCombat.point(0, -0.5, 0));
                    scope.displace(target, down);
                    if (selfBody !== null) scope.displace(self, direction.scale(throwDistance * 0.4).plus(WorldCombat.point(0, -0.25, 0)));
                    landed = hurt(current, target, "submission", power,
                        { damage: damageSpec("submission", "slam"), contact: true, recoil: recoil });
                    // 摔的物理结果与伤害免疫无关：只要目标还在，就被按倒。
                    MobEffects.apply(scope, target, submissionPinEffect, pinTicks, 0);
                    if (point !== null) {
                        WorldFeedback.emit(scope, submissionScene, 1, point,
                            { moment: "slam", target: String(target.ref()), dust: dust, scale: scale, intensity: intensity,
                                hits: Math.round(12 + dust * 0.6), pinned: pin ? 1 : 0, pin: pinTicks,
                                seconds: Math.round(pinTicks / 20 * 10) / 10 }, 34);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), submissionHitText, [], 28);
                    }
                    sound(current, "minecraft:item.mace.smash_ground_heavy");
                    sound(current, "minecraft:entity.player.attack.sweep");
                    if (!landed && selfBody !== null) {
                        // 免疫或未造成伤害时也给出反馈，让玩家知道摔是摔下去了。
                        WorldFeedback.text(scope, selfBody.position().plus(WorldCombat.point(0, 1.3, 0)), submissionGrabText, [], 24);
                    }
                } else {
                    whiff(current, submissionLostText);
                    return;
                }
                done(current);
            }

            function grab(current: CombatAction, victim: CombatActor, point: CombatPoint): void {
                const scope = current.world();
                // 抓住：目标与自己都被固定住，给对手一个看得见的挣脱/被打断窗口。
                WorldEffects.apply(scope, victim, "rooted", {}, grip);
                MobEffects.apply(scope, victim, submissionGripEffect, grip, 0);
                scope.stopMovement(victim);
                scope.stopMovement(current.actor());
                WorldFeedback.emit(scope, submissionScene, 1, point,
                    { moment: "grab", target: String(victim.ref()), scale: scale, seconds: Math.round(grip / 20 * 10) / 10 }, 28);
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
                const hit = current.trace(origin, origin.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity() && hit.target() !== null) {
                    grab(current, hit.target()!, hit.position());
                    return;
                }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= reach) { whiff(current, submissionMissText); return; }
                WorldFeedback.keep(scope, "submission:wake:" + String(actor.ref()), submissionScene, 1, origin,
                    { moment: "wake", dust: dust, scale: scale }, 8);
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
