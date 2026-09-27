/**
 * 神鸟猛击 / skyattack 的出手方式。
 *
 * 核心念头：先停在原地收光蓄一整拍，再腾到自己上方可达的高点，从那里沿斜线冲向起跳时锁定的落点，
 *   撞到第一个敌人或墙面就结束——像一枚被拉满的弓攒到最后才放出去的箭。蓄势那一拍是它明摆着的破绽：
 *   对手看得见，可以走开或打断。
 *
 * 三幕：
 *   蓄（windup，提交前）：停在原地收光、脚下起风，只播预告，可被打断且不花 PP。
 *   腾（execute 前半）：提交后沿自身竖线向上腾到 `altitude` 高度；头顶被压住就只爬到多少算多少。
 *   冲（execute 后半 → strike / land）：对锁点斜冲，逐刻推进并 trace；撞到非友方活体结算 plunge 伤害、
 *       按 flinchChance 掷畏缩；被墙挡住才在接触点落地收势。锁点在起跳那一刻固定，冲刺途中对手走开就会落空。
 *
 * 路径与声明一致：升不到锁点之上就不算俯冲——直接记为失手，不假装坠落、不在空中补重伤。若对手飞在
 *   比自身可达顶点更高的地方，这一记只会空放，而不会出现“向上坠落”。
 * 落地反馈只在真正碰地（被方块挡住）时给出地环与 big_fall；空中撞到实体只算飞行撞击，不假造落地。
 *
 * 与同族分开：勇鸟猛攻是贴地水平俯冲、穿过目标并反震自己；神鸟猛击是蓄一拍后从自身上方高点斜冲的单体重击，
 *   不反伤，蓄势这段是它独有的破绽。
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并向目标投递
 *   `world_combat:interrupt`，用 requestInterrupt 的回执说明抗打断结果；下方门禁在窗口内拒绝新动作。
 *
 * 选取 kind: "aim"：可点敌人、也可直接点一处世界落点，空放照常起跳冲向那个点；落点固定、不再追踪。
 *
 * 配置 highDive（高空式）由 resolve 改时序、由公式改高度/威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const skyattackScene = "world_combat:move_skyattack";
    const skyattackHitText = "world_combat.move.skyattack.text.hit";
    const skyattackFlinchText = "world_combat.move.skyattack.text.flinch";
    const skyattackMissText = "world_combat.move.skyattack.text.miss";
    const skyattackFlinchEffect = "world_combat:skyattack_flinch";

    function skyattackFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, skyattackFlinchEffect, ticks, 0) === null) return false;
        // 原生抗打断以回执说明：真正结束了几个动作不影响畏缩身份本身。
        LivingActions.requestInterrupt(world, target);
        return true;
    }

    define({
        freeMovement: true,
        id: "skyattack",
        cooldownParameter: "recharge",
        name: "Sky Attack",
        description: "先停在原地蓄一整拍（可被打断），再腾到自己上方可达的高点，沿斜线冲向起跳时锁定的落点砸成一记重击；可以点敌人，也可以直接点一处落点，空放照样起跳落空。落点固定、不会追踪，冲刺途中目标走开就会落空；被墙或方块挡住就结束冲刺。升不到锁点之上这一记只会空放，不会凭空坠落。命中按概率使目标畏缩、打断其动作。高空式蓄得更久、砸得更狠。",
        uses: ["先蓄一拍再从高处斜冲砸下一记重击", "越过地面阻挡打到远处的目标", "从上方砸中飞在空中的对手"],
        kind: "aim",
        range: 6,
        maxRange: 12,
        prepare: 26,
        active: 40,
        recover: 12,
        cooldown: 60,
        style: "sky",
        maximumTicks: 260,
        defaults: { highDive: false, ai: { maxChase: 18, preferAirborne: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("skyattack", "impactRadius", pokemon) * 1.6 : 1.8, geometry: "area", style: "sky",
                color: 0xFFE8A8, label: config && config.highDive === true ? "高空式神鸟猛击" : "神鸟猛击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["skyattack"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("skyattack", "charge", context)),
                recover: Math.round(p("skyattack", "aftercast", context)),
                cooldown: Math.round(p("skyattack", "recharge", context)),
                active: skills["skyattack"].active,
                range: p("skyattack", "altitude", context) + 2.5
            };
        },
        windup: function (action, config, prepare) {
            const shock = Math.max(8, Math.round(p("skyattack", "shock", action) * 0.5));
            action.present("skyattack:charge", skyattackScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", charge: prepare, orbs: shock, highDive: config && config.highDive ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(skyattackScene);
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const altitude = p("skyattack", "altitude", action);
            const descend = p("skyattack", "descend", action);
            const radius = p("skyattack", "impactRadius", action);
            const minimumMove = p("skyattack", "minimumMove", action);
            const power = p("skyattack", "plunge", action);
            const chance = p("skyattack", "flinchChance", action);
            const flinchTicks = Math.round(p("skyattack", "flinchTicks", action));
            const shock = Math.max(8, Math.round(p("skyattack", "shock", action)));
            const highDive = !!(config && config.highDive);
            const scale = Math.max(0.6, Math.min(2.0, radius / 1.1));
            const intensity = Math.max(0.6, Math.min(2.4, power / 130));

            const observed = target !== null && world.valid(target) ? world.observe(target) : null;
            const dropPoint = observed !== null ? observed.position() : action.targetPosition();
            const entry = world.observe(actor);
            // 自己的可达顶点只由起跳位置与 altitude 决定（真实撞顶由位移结果截断），不从锁点高度倒推。
            const apexY = (entry !== null ? entry.position().y() : action.origin().y()) + altitude;
            let settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                movementScenes.finish(current, done);
            }

            /** 结束：grounded 只在真正被方块挡住时给出地环与落地声；空中接触/失手不假造落地。 */
            function land(current: CombatAction, at: CombatPoint, struck: boolean, grounded: boolean): void {
                movementScenes.stop(current);
                const scope = current.world();
                if (grounded) {
                    WorldFeedback.emit(scope, skyattackScene, 1, at,
                        { moment: "land", shock: shock, scale: scale, radius: radius, intensity: intensity, struck: struck ? 1 : 0, highDive: highDive ? 1 : 0 }, 26);
                    sound(current, "minecraft:entity.generic.big_fall");
                }
                if (!struck) {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.8, 0)), skyattackMissText, [], 24);
                    if (!grounded) sound(current, "cobblemon:impact.flying");
                }
                finish(current);
            }

            function plunge(current: CombatAction): void {
                movementScenes.stop(current, "rise");
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { land(current, dropPoint, false, false); return; }
                const here = self.position(), delta = dropPoint.minus(here), gap = delta.length();
                if (gap <= 0.4) { land(current, dropPoint, false, false); return; }
                const step = Math.min(descend, gap), direction = delta.unit();
                const swept = sweepStep(current, direction.scale(step), radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && String(victim.ref()) !== String(actor.ref())) {
                        // 首接触即结束冲刺：撞到非友方结算重击，撞到友方只停在身体上、不结算伤害。
                        const at = hit.position();
                        let struck = false;
                        if (!scope.friendly(victim)) {
                            const landed = impact(current, hit, "skyattack", power,
                                { damage: damageSpec("skyattack", "plunge") });
                            WorldFeedback.emit(scope, skyattackScene, 1, at,
                                { moment: "strike", target: String(victim.ref()), shock: shock, scale: scale,
                                    intensity: Math.max(0.6, Math.min(2.4, power / 120)) }, 26);
                            sound(current, "cobblemon:impact.flying");
                            // 击杀也算命中成功：只要伤害结算成立就承认这一记，不因目标随死亡失效而记为失手。
                            if (landed) {
                                struck = true;
                                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.4, 0)), skyattackHitText, [], 26);
                                if (scope.random() < chance && skyattackFlinch(scope, victim, flinchTicks)) {
                                    WorldFeedback.emit(scope, skyattackScene, 1, at, { moment: "flinch", target: String(victim.ref()) }, 22);
                                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.6, 0)), skyattackFlinchText, [], 22);
                                }
                            }
                        }
                        land(current, at, struck, false);
                        return;
                    }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
                if (hit.blocked()) { land(current, hit.position(), false, true); return; }
                if (moved < minimumMove) { land(current, current.origin(), false, false); return; }
                movementScenes.show(current, "fall", self.position(), { moment: "fall", shock: shock, scale: scale, radius: radius, intensity: intensity,
                        ratio: Math.min(1, 1 - gap / Math.max(0.001, altitude)),
                        point: [dropPoint.x(), dropPoint.y(), dropPoint.z()] });
                current.after(1, function (next: CombatAction) { plunge(next); });
            }

            function rise(current: CombatAction, climbed: number): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { plunge(current); return; }
                const top = self.position().y();
                // 升到自身可达顶点：升不到锁点之上就失手，绝不继续向上“坠落”。
                if (top >= apexY - 0.1 || climbed >= altitude) {
                    if (top < dropPoint.y() + 0.1) { land(current, self.position(), false, false); return; }
                    plunge(current);
                    return;
                }
                const remaining = apexY - top;
                const step = Math.min(descend, remaining);
                const moved = scope.displace(actor, WorldCombat.point(0, step, 0));
                if (moved < step * 0.5) {
                    if (top < dropPoint.y() + 0.1) { land(current, self.position(), false, false); return; }
                    plunge(current);
                    return;
                }
                movementScenes.show(current, "rise", self.position(), { moment: "rise", shock: shock, scale: scale, intensity: intensity,
                        ratio: Math.min(1, (climbed + moved) / Math.max(0.001, altitude)) });
                current.after(1, function (next: CombatAction) { rise(next, climbed + moved); });
            }

            sound(action, "minecraft:entity.breeze.charge");
            sound(action, "minecraft:entity.phantom.flap");
            movementScenes.show(action, "rise", action.origin(), { moment: "rise", shock: shock, scale: scale, intensity: intensity, ratio: 0 });
            rise(action, 0);
        }
    });

}
