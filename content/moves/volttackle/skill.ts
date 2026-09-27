/**
 * 伏特攻击 / volttackle 的出手方式。
 *
 * 核心念头：先把电荷长时间聚到全身、蓄成一团越涨越大的电，再一记带电爆冲撞上去；撞实的一刻积压的电荷
 * 向四周炸开，沿地面把旁边的其他人一起电到。它是本族里唯一会把电波及旁人、也是蓄得最久的一招。
 *
 * 三幕：
 *   蓄（windup，提交前）：电荷从四周收拢、越聚越大，长起手可被打断，只播预告。
 *   冲（rush → wake）：提交后逐刻沿瞄准方向推进，身周裹着电；rush 只画这一段真实走过的短尾迹，不预告整条未来路线。
 *   爆（burst → discharge / recoil / vent）：身体扫到活体即按 surge 结算接触伤害，按 numbChance 灌入麻痹（共享状态），
 *       把目标顶开 shove 格；**只有这次主击真的造成了伤害**，才从该接触点向 `arc` 格内的其他非友方各放一次**非接触**弧电
 *       （arcPower 占比、arcChance 麻痹，与接触点通视，每个旁敌一次，最多 arcTargets 个）。主撞被挡或撞到友体只播阻挡。
 *       反噬由原生结算驱动（`recoil` 随主伤触发），表现改由 `NativeEffects.recoilApplied` 按实际自损驱动；
 *       冲空则电荷就地泄放（vent），不自伤。首击后停在接触点，不再把同一预算位移出去。
 *
 * 选取 `kind: "aim"`：自由方向或世界点都能起冲，也能空放；提交后不要求存在敌人，AI 的敌方目标只是更可能撞上的输入。
 *
 * 与同族分开：电光是贴身短促的一点电、火焰轮是滚动的火、闪焰冲锋是拖火线的火；伏特攻击独有的是一身越蓄越大
 * 的电球与命中时四散波及旁人的电弧。配置 discharge（泄放式）由 resolve 改时序、由公式改威力/波及/反噬，
 * 提交后才触碰世界。
 */
namespace PokemonSkills {
    const volttackleScene = "world_combat:move_volttackle";
    const volttackleHitText = "world_combat.move.volttackle.text.hit";
    const volttackleArcText = "world_combat.move.volttackle.text.arc";
    const volttackleRecoilText = "world_combat.move.volttackle.text.recoil";
    const volttackleVentText = "world_combat.move.volttackle.text.vent";
    const volttackleRecoilMark = "world_combat:move_volttackle/recoil";

    define({
        freeMovement: true,
        id: "volttackle",
        cooldownParameter: "recharge",
        name: "Volt Tackle",
        description: "蓄电后朝瞄准方向爆冲，撞到的第一个敌人受到伤害、被顶开并有机会麻痹；只有真的撞伤主目标，才从接触点把电流波及附近的其他敌人。冲空时电荷就地泄放、不自伤。",
        uses: ["蓄好电再一记爆冲撞开挡路的对手", "在人堆里撞一个、用电弧把旁边的人也电到", "给主力目标挂上麻痹并趁机拉开身位"],
        kind: "aim",
        range: 5.0,
        maxRange: 7.0,
        prepare: 13,
        active: 32,
        recover: 11,
        cooldown: 52,
        style: "thunder",
        defaults: { discharge: false, ai: { maxChase: 12, minHealth: 0.25, preferCrowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["volttackle"], detail: { values: config } };
            return { radius: p("volttackle", "arc", context), geometry: "line", style: "electric", color: 0xF2D03A,
                label: config && config.discharge === true ? "泄放式伏特攻击" : "聚敛式伏特攻击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["volttackle"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const skill = skills["volttackle"];
            return {
                prepare: Math.round(p("volttackle", "tempo", context)),
                recover: Math.round(p("volttackle", "aftercast", context)),
                cooldown: Math.round(p("volttackle", "recharge", context)),
                active: skill.active,
                // 实际冲程就是 charge 格；宣称射程用 charge + 0.5 的瞄准余量，并与 maxRange 7 对齐。
                range: Math.min(skill.maxRange || skill.range, p("volttackle", "charge", context) + 0.5)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_volttackle:charge", volttackleScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, discharge: !!(config && config.discharge) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(volttackleScene);
            const world = action.world();
            const actor = action.actor();
            const length = p("volttackle", "charge", action);
            const pace = p("volttackle", "pace", action);
            const radius = p("volttackle", "radius", action);
            const minimumMove = p("volttackle", "minimumMove", action);
            const power = p("volttackle", "surge", action);
            const recoil = p("volttackle", "recoil", action);
            const chance = p("volttackle", "numbChance", action);
            const numbTicks = Math.round(p("volttackle", "numbTicks", action));
            const arcRadius = p("volttackle", "arc", action);
            const arcPower = p("volttackle", "arcPower", action);
            const arcChance = p("volttackle", "arcChance", action);
            const shove = p("volttackle", "shove", action);
            const sparks = Math.round(p("volttackle", "sparks", action));
            const arcTargets = Math.max(1, Math.round(p("volttackle", "arcTargets", action)));
            // 贴地爆冲：把瞄准方向压成水平，避免垂直分量让身体扫到地面而被挡停。
            const aimed = aim(action);
            const level = WorldCombat.point(aimed.x(), 0, aimed.z());
            const flat = level.length() > 0.001 ? level : WorldCombat.point(action.direction().x(), 0, action.direction().z());
            const direction = flat.length() > 0.001 ? flat.unit() : WorldCombat.point(0, 0, 1);
            // 方向已冻结：目标离场或死亡不再中断这一冲，空放沿提交朝向继续。
            action.releaseTarget();
            const scale = radius / 0.5;
            const intensity = Math.max(0.6, Math.min(2.4, power / 120));
            let travelled = 0, settled = false;

            sound(action, "minecraft:block.beacon.activate");
            // 只画真正走过的路段：从上一落点到当前落点，墙后与未到之处不预先铺电。
            function showRush(current: CombatAction, from: CombatPoint, to: CombatPoint): void {
                movementScenes.show(current, "rush", to, { moment: "rush", direction: [direction.x(), direction.y(), direction.z()],
                    path: [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]],
                    sparks: sparks, scale: scale, intensity: intensity });
            }
            showRush(action, action.origin(), action.origin());

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            /** 冲空：积蓄的电就地在脚下泄放，不自伤。 */
            function vent(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, volttackleScene, 1, body.position(),
                        { moment: "vent", sparks: sparks, scale: scale, intensity: intensity }, 26);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), volttackleVentText, [], 24);
                }
                sound(current, "minecraft:entity.lightning_bolt.impact");
                finish(current);
            }

            /** 主击真的造成伤害后，积压的电荷才从接触点向四周炸开：arc 格内、与接触点通视的其他非友方各吃一次非接触弧电。 */
            function dischargeArc(current: CombatAction, point: CombatPoint, primary: CombatActor | null): void {
                const scope = current.world();
                const nearby = scope.query(point, arcRadius, false).slice();
                let struck = 0;
                for (let i = 0; i < nearby.length && struck < arcTargets; i++) {
                    const other = nearby[i];
                    if (!other || !scope.valid(other)) continue;
                    if (String(other.ref()) === String(actor.ref())) continue;
                    if (primary !== null && String(other.ref()) === String(primary.ref())) continue;
                    if (scope.friendly(other)) continue;
                    const body = scope.observe(other);
                    if (body === null || !scope.clear(point, body.position())) continue;
                    // 弧电不是身体接触：显式 contact:false，避免触发接触反制；本次真的落伤才算一次波及。
                    const landed = hurt(current, other, "volttackle", power * arcPower,
                        { damage: damageSpec("volttackle", "surge"), contact: false, status: "paralysis", chance: arcChance, statusTicks: numbTicks });
                    if (!landed) continue;
                    const arcPath = [[point.x(), point.y(), point.z()],
                        [body.position().x(), body.position().y(), body.position().z()]];
                    WorldFeedback.emit(scope, volttackleScene, 1, point,
                        { moment: "discharge", target: String(other.ref()), path: arcPath,
                            sparks: Math.round(sparks * 0.7), scale: scale,
                            intensity: Math.max(0.6, Math.min(2.2, power * arcPower / 55)) }, 24);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), volttackleArcText, [], 24);
                    struck++;
                }
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const step = Math.min(pace, Math.max(0, length - travelled));
                if (step <= 0.001) { vent(current); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target(), point = hit.position();
                    const already = target !== null && scope.valid(target) && CombatStatus.has(scope, target, "paralysis");
                    // 反噬表现上下文：只有 recoilApplied 回执读到它才画回路反噬，免反伤或拒绝时不做声。
                    scope.originData(volttackleRecoilMark, JSON.stringify({ sparks: Math.round(sparks * 0.6), scale: scale }));
                    const landed = impact(current, hit, "volttackle", power,
                        { damage: damageSpec("volttackle", "surge"), contact: true, recoil: recoil,
                            status: already ? "" : "paralysis", chance: already ? 0 : chance, statusTicks: numbTicks });
                    // 只有主击实际造成伤害，才播电爆、顶飞、放群电；被挡或撞到友体只播阻挡，不声称命中。
                    if (landed) {
                        WorldFeedback.emit(scope, volttackleScene, 1, point,
                            { moment: "burst", target: target ? String(target.ref()) : "", sparks: sparks, scale: scale,
                                intensity: intensity, charged: already ? 0 : 1 }, 30);
                        sound(current, "cobblemon:impact.electric");
                        sound(current, "minecraft:entity.lightning_bolt.impact");
                        if (target !== null && scope.valid(target)) {
                            scope.hitDisplace(target, direction.scale(shove));
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), volttackleHitText, [], 28);
                        }
                        dischargeArc(current, point, target);
                    } else {
                        WorldFeedback.emit(scope, volttackleScene, 1, point,
                            { moment: "blocked", target: target ? String(target.ref()) : "", sparks: Math.round(sparks * 0.5),
                                scale: scale, intensity: Math.max(0.5, intensity * 0.6) }, 22);
                        sound(current, "minecraft:block.beacon.deactivate");
                    }
                    finish(current);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (moved > 0.001) showRush(current, origin, current.origin());
                if (hit.blocked() || moved < minimumMove || travelled >= length) { vent(current); return; }
                movementScenes.show(current, "wake", current.origin(), { moment: "wake", sparks: sparks, scale: scale });
                current.after(1, advance);
            }

            advance(action);
        }
    });

    // 真付生命才画反噬：recoilApplied 只在本招实际反噬落地时触发；免反伤、免疫或原生拒绝不会走到这里。
    NativeEffects.recoilApplied.define({ id: "world_combat:move_volttackle/recoil", apply: function (receipt) {
        if (receipt.damage.move !== "volttackle" || !receipt.world.valid(receipt.actor)) return;
        const body = receipt.world.observe(receipt.actor), raw = receipt.world.originData(volttackleRecoilMark);
        if (body === null || !raw) return;
        const data = JSON.parse(raw);
        WorldFeedback.emit(receipt.world, volttackleScene, 1, body.position(),
            { moment: "recoil", sparks: data.sparks, scale: data.scale,
                intensity: Math.max(0.5, Math.min(2.4, receipt.amount / 55)) }, 24);
        WorldFeedback.text(receipt.world, body.position().plus(WorldCombat.point(0, 1.3, 0)), volttackleRecoilText, [], 24);
    } });
}
