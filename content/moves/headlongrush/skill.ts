/**
 * 突飞猛扑 / headlongrush 的出手方式。
 *
 * 核心念头：**低头灌注全力的直线猛冲**——助跑、顶住、把对手一路撞开，贴地扫起一路短擦痕。它是全族里
 *   唯一有助跑、也是唯一把「自己有多重」写进威力与撞飞的一招。
 *
 * 三幕（提交前只播预告）：
 *   起（ready）：低头屈腿、脚边土被往后扫，只播预告（`windup`），此时代价未结清。
 *   冲（guard → rush → impact → brake）：提交后立刻弃守（自身防御 −guardLoss、特防 −poiseLoss 写进公共能力阶梯，中与不中都照付真实值），
 *       随后沿提交时锁定的直线贴地平冲（每刻推进 `rush`，最远 `reach`，点敌只作建议朝向，途中不再转向）；
 *       撞上沿线非友方即按该目标实际重量结算一记 `charge` 接触伤害、把人撞开 `shove` 格后继续推进；免疫推开的 Boss 只吃接触伤害并被阻停。
 *       墙前结束，途中只在真实身体经过的接地片段翻土擦过；终点无命中只扬一记刹尘，有命中也不重复伤害爆点。
 *   散（slump）：重心散掉，身上浮起脱力灰气并浮字提示实际降级；没撞到人只留下扑空的尘。
 *
 * 选取 `kind: "aim"`：自由方向或世界点都行，点敌只是建议朝向；方块墙拦停，命中权限由命中层判定。
 *
 * 与同族分开：近身战不助跑的贴脸连打；铠农炮在远处；画龙点睛从天而降；与勇鸟猛攻比：勇鸟从空中沿线穿过目标，
 *   突飞猛扑贴地冲、把沿线的人撞开并继续推进、在身后扫下擦痕。
 *
 * 配置 `plow`（犁地式）由 `resolve` 改时序、由公式改威力／冲距／撞飞／擦痕宽度，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const headlongrushScene = "world_combat:move_headlongrush";
    const headlongrushSlumpText = "world_combat.move.headlongrush.text.slump";
    const headlongrushMissText = "world_combat.move.headlongrush.text.miss";
    const headlongrushImpactText = "world_combat.move.headlongrush.text.impact";

    define({
        freeMovement: true,
        id: headlongrushId,
        cooldownParameter: "recharge",
        name: "Headlong Rush",
        description: "低头灌注全力直线猛冲：助跑后把对手一路撞开，贴地扫起一路短擦痕。出招即弃守，自身防御与特防各下降一级。犁地式冲得更远、推得更狠、擦痕更宽，代价是单发威力更低、出手更慢。",
        uses: ["从远处一路冲过去把对手撞出阵地", "用体重换一记最重的单发", "连续撞开挡路的一列敌人"],
        kind: "aim",
        range: 3.6,
        maxRange: 7.0,
        prepare: 12,
        active: 0,
        recover: 11,
        cooldown: 40,
        maximumTicks: 240,
        style: "rush",
        defaults: { plow: false, ai: { maxChase: 8, finish: true, minHealth: 0 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(headlongrushId, "reach", pokemon) : 3.6, geometry: "line", style: "rush",
                color: 0xB4793F, label: config && config.plow === true ? "突飞猛扑·犁地式" : "突飞猛扑·短冲式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[headlongrushId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(headlongrushId, "tempo", context)),
                recover: Math.round(p(headlongrushId, "aftercast", context)),
                cooldown: Math.round(p(headlongrushId, "recharge", context)),
                active: 0,
                range: p(headlongrushId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            // 眉光用提交时的真实朝向构造前点，而不是固定的世界 +Z 偏移。
            const heading = WorldGeometry.flatUnit(aim(action), action.direction());
            const body = action.sense().observe(action.actor());
            const from = action.origin(), height = body === null ? 1.4 : body.height();
            const brow = from.plus(WorldCombat.point(0, Math.max(0.6, height * 0.62), 0)).plus(heading.scale(Math.max(0.3, height * 0.25)));
            action.present("world_combat:move_headlongrush:ready", headlongrushScene, 1, from,
                JSON.stringify({ moment: "ready", plow: config && config.plow === true ? 1 : 0, point: [brow.x(), brow.y(), brow.z()],
                    dust: Math.round(p(headlongrushId, "dust", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const targetRef = target !== null ? String(target.ref()) : "";
            const start = action.origin();
            const charge = p(headlongrushId, "charge", action);
            const shoveSeed = p(headlongrushId, "shove", action);
            const reach = p(headlongrushId, "reach", action);
            const rush = Math.max(0.25, p(headlongrushId, "rush", action));
            const furrow = p(headlongrushId, "furrow", action);
            const dust = Math.round(p(headlongrushId, "dust", action));
            const guardLoss = Math.max(0, Math.round(p(headlongrushId, "guardLoss", action)));
            const poiseLoss = Math.max(0, Math.round(p(headlongrushId, "poiseLoss", action)));
            const plow = !!(config && config.plow);
            const intensity = Math.max(0.5, Math.min(2.4, charge / 120));
            const scale = Math.max(0.6, Math.min(2.2, furrow / 1.2));
            // 提交时固定冲向：点敌只是建议朝向，整段冲刺沿这一条直线，途中不再转向。
            const direction = WorldGeometry.flatUnit(aim(action), action.direction());
            const contactRadius = 0.6, minimumMove = 0.05, up = WorldCombat.point(0, 1.45, 0);
            const scenes = WorldFeedback.actionScenes(headlongrushScene);
            const struck: { [ref: string]: boolean } = Object.create(null);
            let travelled = 0, hits = 0, settled = false;
            let actualShove = Math.round(shoveSeed * 100) / 100;

            // 弃守是提交那一刻付的：画在与文字都按真实下降回执，免疫/被拒就不假报降级。
            const defChange = NativeEffects.boost(world, actor, "def", -guardLoss);
            const spdChange = NativeEffects.boost(world, actor, "spd", -poiseLoss);
            const guardLost = Math.max(0, -defChange), poiseLost = Math.max(0, -spdChange);
            WorldFeedback.emit(world, headlongrushScene, 1, start,
                { moment: "guard", guardLoss: guardLost, poiseLoss: poiseLost, guardCracks: Math.max(6, Math.round(guardLost * 6 + poiseLost * 3)),
                    plow: plow ? 1 : 0, dust: dust, scale: scale, intensity: intensity }, 24);
            sound(action, "cobblemon:move.bulldoze.actor");

            function finish(current: CombatAction, at: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                scenes.stop(current, "rush");
                // 终点只收势：没撞到就扬一记真实刹尘；撞到了也由每一下命中各自爆过，不在这里重复伤害式爆点。
                WorldFeedback.emit(scope, headlongrushScene, 1, at,
                    { moment: "brake", target: targetRef, landed: hits > 0 ? 1 : 0, hits: hits, dust: dust,
                        brake: hits > 0 ? 0 : dust, scale: scale, intensity: intensity,
                        shove: actualShove }, 30);
                if (hits > 0) {
                    sound(current, "cobblemon:impact.ground");
                    WorldFeedback.text(scope, at.plus(up), headlongrushImpactText, [Math.round(travelled * 10) / 10], 26);
                } else {
                    WorldFeedback.text(scope, at.plus(up), headlongrushMissText, [], 24);
                    sound(current, "minecraft:entity.player.attack.weak");
                }
                const self = scope.observe(actor);
                if (self !== null) {
                    const fatigue = Math.max(12, Math.round(10 + travelled * 5));
                    WorldFeedback.emit(scope, headlongrushScene, 1, self.position(),
                        { moment: "slump", guardLoss: guardLost, poiseLoss: poiseLost, travelled: Math.round(travelled * 10) / 10,
                            hits: hits, fatigue: fatigue, dust: dust, scale: scale, intensity: intensity }, 26);
                    WorldFeedback.text(scope, self.position().plus(up), headlongrushSlumpText, [guardLost, poiseLost], 28);
                }
                sound(current, "cobblemon:move.bulldoze.target");
                scenes.finish(current, done);
            }

            /** 贴地平冲：沿固定朝向推进 rush，撞上沿线的人就结算并撞开，继续推进；墙前停。 */
            function advance(current: CombatAction): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { finish(current, start.plus(direction.scale(travelled))); return; }
                const room = Math.max(0, reach - travelled);
                const step = Math.min(rush, room);
                if (step <= 0.02) { finish(current, self.position()); return; }
                const swept = sweepStep(current, direction.scale(step), contactRadius), hit = swept.hit;
                let stop = false;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const ref = String(victim.ref());
                        if (!struck[ref]) {
                            struck[ref] = true;
                            const landed = impact(current, hit, headlongrushId, charge,
                                { damage: damageSpec(headlongrushId, "charge"), contact: true });
                            if (landed) {
                                hits++;
                                // 每个实际目标按自己的重量重算撞飞：目标越重越推不动。
                                const shove = p(headlongrushId, "shove", withTarget(factContext(current), victim));
                                actualShove = Math.round(shove * 100) / 100;
                                // 撞开沿线敌人继续推进；免疫推开的 Boss 只吃接触伤害并被阻停。
                                const pushed = scope.valid(victim) ? scope.hitDisplace(victim, direction.scale(shove)) : 0;
                                WorldFeedback.emit(scope, headlongrushScene, 1, hit.position(),
                                    { moment: "impact", target: ref, landed: 1, hits: hits, dust: dust,
                                        scale: scale, intensity: intensity, shove: actualShove }, 24);
                                sound(current, "cobblemon:impact.ground");
                                if (pushed < 0.02) stop = true;
                            } else {
                                stop = true;
                            }
                        }
                    } else {
                        stop = true;
                    }
                }
                if (stop) { finish(current, hit.position()); return; }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
                travelled += moved;
                const at = current.origin();
                scenes.show(current, "rush", at,
                    { moment: "rush", direction: [direction.x(), direction.y(), direction.z()], plow: plow ? 1 : 0,
                        dust: dust, scale: scale, intensity: intensity });
                if (hit.blocked() || moved < minimumMove || travelled >= reach) { finish(current, at); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            advance(action);
        }
    });
}
