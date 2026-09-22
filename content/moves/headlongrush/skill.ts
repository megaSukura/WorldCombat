/**
 * 突飞猛扑 / headlongrush 的出手方式。
 *
 * 核心念头：**低头灌注全力的直线猛冲**——助跑、顶住、把对手一路撞开，地面被犁出一道粗土沟。它是全族里
 *   唯一有助跑、有地面残留的一招，也是唯一把「自己有多重」写进威力与撞飞的一招。
 *
 * 三幕（提交前只播预告）：
 *   起（ready）：低头屈腿、脚边土被往后扫，只播预告（`windup`），此时代价未结清。
 *   冲（guard → rush → impact）：提交后立刻弃守（自身防御 −guardLoss、特防 −poiseLoss 写进公共能力阶梯，中与不中都照付），
 *       随后沿目标当前位置贴地平冲（每刻推进 `rush`，最远 `reach`）；撞上即结算一记 `charge` 接触伤害，
 *       把目标沿冲击方向撞开 `shove` 格，并从起步点到撞击点犁出一条宽 `furrow`、时长 `furrowTicks` 的粗土沟
 *       （terrain 租借，linger，到期原方块回来）。
 *   散（slump）：重心散掉，身上浮起脱力灰气并浮字提示降级；落空只留下扑空的尘。
 *
 * 与同族分开：近身战不助跑的贴脸连打；铠农炮在远处；画龙点睛从天而降；与勇鸟猛攻比：勇鸟从空中沿线穿过目标，
 *   突飞猛扑贴地冲、撞到就停、把目标推走、在身后留下沟。
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
        id: headlongrushId,
        name: "Headlong Rush",
        description: "The user smashes into the target in a full-body tackle, lowering its own Defense and Sp. Def.",
        uses: ["从远处一路冲过去把对手撞出阵地", "用体重换一记最重的单发", "把撞开的沟留在场上、改变走位"],
        kind: "enemy",
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
                color: 0xB4793F, label: config && config.plow === true ? "突飞猛扑·犁地式" : "突飞猛扑·止步式" };
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
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
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
            const contactGap = 0.9, up = WorldCombat.point(0, 1.45, 0);
            let travelled = 0, settled = false;

            // 弃守是提交那一刻付的。
            NativeEffects.boost(world, actor, "def", -guardLoss);
            NativeEffects.boost(world, actor, "spd", -poiseLoss);
            WorldFeedback.emit(world, headlongrushScene, 1, start,
                { moment: "guard", guardLoss: guardLoss, poiseLoss: poiseLoss, guardCracks: Math.max(8, Math.round(guardLoss * 6 + poiseLoss * 3)),
                    plow: plow ? 1 : 0, dust: dust, scale: scale, intensity: intensity }, 24);
            sound(action, "cobblemon:move.bulldoze.actor");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), self = scope.observe(actor);
                if (self !== null) {
                    const fatigue = Math.max(12, Math.round(10 + travelled * 5));
                    WorldFeedback.emit(scope, headlongrushScene, 1, self.position(),
                        { moment: "slump", guardLoss: guardLoss, poiseLoss: poiseLoss, travelled: Math.round(travelled * 10) / 10,
                            fatigue: fatigue, dust: dust, scale: scale, intensity: intensity }, 26);
                    WorldFeedback.text(scope, self.position().plus(up), headlongrushSlumpText, [guardLoss, poiseLoss], 28);
                }
                sound(current, "cobblemon:move.bulldoze.target");
                done(current);
            }

            /** 撞上就结算：伤害、撞飞、犁沟。 */
            function strike(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const selfAt = self.position();
                const heading = WorldCombat.point(at.x() - start.x(), 0, at.z() - start.z());
                const dir = heading.length() < 0.05 ? current.direction() : heading.unit();
                const cells = headlongFurrow(scope, start, at, furrow, furrowTicks);
                let landed = false;
                const victim = scope.actor(targetRef);
                if (victim !== null && scope.valid(victim)) {
                    const vbody = scope.observe(victim);
                    if (vbody !== null && selfAt.minus(vbody.position()).length() <= reach + 1.2) {
                        landed = hurt(current, victim, headlongrushId, charge, { damage: damageSpec(headlongrushId, "charge"), contact: true });
                        if (landed && scope.valid(victim)) {
                            const away = vbody.position().minus(start);
                            const push = WorldCombat.point(away.x(), 0, away.z());
                            scope.displace(victim, (push.length() < 0.05 ? dir : push.unit()).scale(shove));
                        }
                    }
                }
                WorldFeedback.emit(scope, headlongrushScene, 1, at,
                    { moment: "impact", target: targetRef, landed: landed ? 1 : 0, dust: dust, cells: cells,
                        scale: scale, intensity: intensity, shove: Math.round(shove * 100) / 100 }, 30);
                if (landed) {
                    sound(current, "cobblemon:impact.ground");
                    sound(current, "minecraft:item.mace.smash_ground_heavy");
                    WorldFeedback.text(scope, at.plus(up), headlongrushImpactText, [Math.round(travelled * 10) / 10], 26);
                } else {
                    WorldFeedback.text(scope, at.plus(up), headlongrushMissText, [], 24);
                    sound(current, "minecraft:entity.player.attack.weak");
                }
                finish(current);
            }

            /** 贴地平冲：每刻朝目标当前位置推进 `rush`，贴上或冲到 `reach` 就结算。 */
            function chargeStep(current: CombatAction): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const victim = scope.actor(targetRef);
                if (victim === null || !scope.valid(victim)) { finish(current); return; }
                const vbody = scope.observe(victim);
                if (vbody === null) { finish(current); return; }
                current.face(vbody.position(), 20, 20);
                const delta = vbody.position().minus(self.position());
                const flat = WorldCombat.point(delta.x(), 0, delta.z());
                const distance = flat.length();
                if (distance <= contactGap + 0.4 || travelled >= reach) { strike(current, vbody.position()); return; }
                const heading = flat.length() < 1e-6 ? current.direction() : flat.unit();
                const room = Math.min(rush, Math.max(0, distance - contactGap), Math.max(0, reach - travelled));
                if (room <= 0.03) { strike(current, vbody.position()); return; }
                const moved = scope.displace(actor, heading.scale(room));
                travelled += moved;
                WorldFeedback.keep(scope, "headlongrush:rush:" + current.id(), headlongrushScene, 1, self.position(),
                    { moment: "rush", direction: [heading.x(), heading.y(), heading.z()], plow: plow ? 1 : 0,
                        dust: dust, scale: scale, intensity: intensity }, 8);
                if (moved < room * 0.5) { strike(current, vbody.position()); return; }
                current.after(1, function (next: CombatAction) { chargeStep(next); });
            }

            chargeStep(action);
        }
    });
}
