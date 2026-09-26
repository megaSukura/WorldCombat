/**
 * 突飞猛扑 / headlongrush 的出手方式。
 *
 * 核心念头：**低头灌注全力的直线猛冲**——助跑、顶住、把对手一路撞开，地面被犁出一道粗土沟。它是全族里
 *   唯一有助跑、有地面残留的一招，也是唯一把「自己有多重」写进威力与撞飞的一招。
 *
 * 三幕（提交前只播预告）：
 *   起（ready）：低头屈腿、脚边土被往后扫，只播预告（`windup`），此时代价未结清。
 *   冲（guard → rush → impact）：提交后立刻弃守（自身防御 −guardLoss、特防 −poiseLoss 写进公共能力阶梯，中与不中都照付），
 *       随后沿提交时锁定的直线贴地平冲（每刻推进 `rush`，最远 `reach`，点敌只作建议朝向，途中不再转向）；
 *       撞上沿线非友方即结算一记 `charge` 接触伤害、把人撞开 `shove` 格后继续推进；免疫推开的 Boss 只吃接触伤害并被阻停。
 *       墙前结束，从起步点到本体真正停下的位置犁出一条宽 `furrow`、时长 `furrowTicks` 的粗土沟（terrain 租借，linger）。
 *   散（slump）：重心散掉，身上浮起脱力灰气并浮字提示降级；没撞到人只留下扑空的尘。
 *
 * 选取 `kind: "aim"`：自由方向或世界点都行，点敌只是建议朝向；方块墙拦停，命中权限由命中层判定。
 *
 * 与同族分开：近身战不助跑的贴脸连打；铠农炮在远处；画龙点睛从天而降；与勇鸟猛攻比：勇鸟从空中沿线穿过目标，
 *   突飞猛扑贴地冲、把沿线的人撞开并继续推进、在身后留下沟。
 *
 * 配置 `plow`（犁地式）由 `resolve` 改时序、由公式改威力／冲距／撞飞／沟，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const headlongrushScene = "world_combat:move_headlongrush";
    const headlongrushSlumpText = "world_combat.move.headlongrush.text.slump";
    const headlongrushMissText = "world_combat.move.headlongrush.text.miss";
    const headlongrushImpactText = "world_combat.move.headlongrush.text.impact";

    /** 贴地犁出的沟：从 from 到 to 沿路径采样，按半宽铺粗土，撞击点中心换成裂石；租借，`linger` 活过招式。 */
    function headlongFurrow(world: CombatWorld, from: CombatPoint, to: CombatPoint, halfWidth: number, ticks: number): number {
        const delta = to.minus(from);
        const flat = WorldCombat.point(delta.x(), 0, delta.z());
        const length = flat.length();
        if (length < 0.3) return 0;
        const heading = flat.unit(), side = WorldCombat.point(-heading.z(), 0, heading.x());
        const steps = Math.max(2, Math.min(14, Math.ceil(length / 0.75)));
        const cells: any[] = [], seen: { [key: string]: boolean } = Object.create(null);
        for (let i = 0; i <= steps; i++) {
            const base = from.plus(delta.scale(i / steps));
            const width = halfWidth * (0.75 + 0.55 * (i / steps)), r = Math.ceil(width);
            for (let w = -r; w <= r; w++) {
                if (Math.abs(w) > width + 0.1) continue;
                const x = Math.floor(base.x() + side.x() * w), z = Math.floor(base.z() + side.z() * w), y0 = Math.floor(base.y());
                for (let dy = 1; dy >= -4; dy--) {
                    const y = y0 + dy;
                    const block = world.block(WorldCombat.point(x, y, z));
                    if (block === null) break;
                    const id = String(block.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                    const key = x + "," + y + "," + z;
                    if (!seen[key]) {
                        seen[key] = true;
                        const surface = i >= steps - 1 && Math.abs(w) <= 1 ? "minecraft:cracked_stone_bricks" : "minecraft:coarse_dirt";
                        if (id !== surface) cells.push({ x: x, y: y, z: z, block: surface });
                    }
                    break;
                }
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    define({
        freeMovement: true,
        id: headlongrushId,
        cooldownParameter: "recharge",
        name: "Headlong Rush",
        description: "低头灌注全力直线猛冲：助跑后把对手一路撞开，并在地面犁出一道会留一会儿的粗土沟。出招即弃守，自身防御与特防各下降一级。犁地式冲得更远、推得更狠、沟更宽，代价是单发威力更低、出手更慢。",
        uses: ["从远处一路冲过去把对手撞出阵地", "用体重换一记最重的单发", "把犁出的沟留在场上、改变地形"],
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
            action.present("world_combat:move_headlongrush:ready", headlongrushScene, 1, action.origin(),
                JSON.stringify({ moment: "ready", plow: config && config.plow === true ? 1 : 0,
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
            const shove = p(headlongrushId, "shove", action);
            const reach = p(headlongrushId, "reach", action);
            const rush = Math.max(0.25, p(headlongrushId, "rush", action));
            const furrow = p(headlongrushId, "furrow", action);
            const furrowTicks = p(headlongrushId, "furrowTicks", action);
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

            // 弃守是提交那一刻付的。
            NativeEffects.boost(world, actor, "def", -guardLoss);
            NativeEffects.boost(world, actor, "spd", -poiseLoss);
            WorldFeedback.emit(world, headlongrushScene, 1, start,
                { moment: "guard", guardLoss: guardLoss, poiseLoss: poiseLoss, guardCracks: Math.max(8, Math.round(guardLoss * 6 + poiseLoss * 3)),
                    plow: plow ? 1 : 0, dust: dust, scale: scale, intensity: intensity }, 24);
            sound(action, "cobblemon:move.bulldoze.actor");

            function finish(current: CombatAction, at: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                scenes.stop(current, "rush");
                // 犁地痕迹只到本体真正到达的位置，不超前。
                const cells = headlongFurrow(scope, start, at, furrow, furrowTicks);
                WorldFeedback.emit(scope, headlongrushScene, 1, at,
                    { moment: "impact", target: targetRef, landed: hits > 0 ? 1 : 0, hits: hits, dust: dust, cells: cells,
                        scale: scale, intensity: intensity, shove: Math.round(shove * 100) / 100 }, 30);
                if (hits > 0) {
                    sound(current, "cobblemon:impact.ground");
                    sound(current, "minecraft:item.mace.smash_ground_heavy");
                    WorldFeedback.text(scope, at.plus(up), headlongrushImpactText, [Math.round(travelled * 10) / 10], 26);
                } else {
                    WorldFeedback.text(scope, at.plus(up), headlongrushMissText, [], 24);
                    sound(current, "minecraft:entity.player.attack.weak");
                }
                const self = scope.observe(actor);
                if (self !== null) {
                    const fatigue = Math.max(12, Math.round(10 + travelled * 5));
                    WorldFeedback.emit(scope, headlongrushScene, 1, self.position(),
                        { moment: "slump", guardLoss: guardLoss, poiseLoss: poiseLoss, travelled: Math.round(travelled * 10) / 10,
                            hits: hits, fatigue: fatigue, dust: dust, scale: scale, intensity: intensity }, 26);
                    WorldFeedback.text(scope, self.position().plus(up), headlongrushSlumpText, [guardLoss, poiseLoss], 28);
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
                                // 撞开沿线敌人继续推进；免疫推开的 Boss 只吃接触伤害并被阻停。
                                const pushed = scope.valid(victim) ? scope.hitDisplace(victim, direction.scale(shove)) : 0;
                                WorldFeedback.emit(scope, headlongrushScene, 1, hit.position(),
                                    { moment: "impact", target: ref, landed: 1, hits: hits, dust: dust, cells: 0,
                                        scale: scale, intensity: intensity, shove: Math.round(shove * 100) / 100 }, 24);
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
