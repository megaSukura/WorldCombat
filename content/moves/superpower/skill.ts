/**
 * 蛮力 / superpower 的出手方式。
 *
 * 核心念头：**舍身突进**——沉肩扎马后整个人贴地冲进对手怀里砸实一记，冲击把地面砸出一个短命的浅坑；
 *   收招后重心散了，自身攻击与防御各降一级。这一记卖的是「一次最重的近身单体交换」。
 *
 * 三幕（提交前只播预告）：
 *   起（charge）：沉肩扎马，脚边尘土被吸拢、拳边聚起暖光，只播预告，此时代价未结清。
 *   冲（rush → impact）：提交后沿目标当前位置贴地平冲（每刻推进 `rush`，最远 `reach`）；
 *       贴上目标即结算一次 `ram` 接触伤害，把目标沿冲击方向撞开 `jolt`（按目标体重衰减）；
 *       冲击点砸出一个短命浅坑（terrain 租借，linger，到期原方块回来）。
 *       震荡式（配置 aftershock）额外在冲击点荡出 `crush` 半径的余震，把周围敌人以 `share` 保留一起震开。
 *   沉（slump）：重心散掉，自身攻击 −`attackLoss`、防御 −`guardLoss`，浮字提示；落空则只留下扑空的尘。
 *
 * 与同族分开：鳞射是远距多段、火焰鞭是长鞭剥对手甲、鳞片噪音是环身声爆；
 *   蛮力是近身单体最重的一记，唯一让自身攻防一起下降，并在地面留下坑。
 *
 * 配置 `aftershock` 由公式改威力／半径／时序，由本文件改余震结算；提交后才触碰世界。
 */
namespace PokemonSkills {
    const superpowerScene = "world_combat:move_superpower";
    const superpowerSlumpText = "world_combat.move.superpower.text.slump";
    const superpowerMissText = "world_combat.move.superpower.text.miss";

    /** 冲击把脚下地面砸出浅坑：内圈裂石、外圈翻起的粗土；租借，`linger` 活过招式，到期原方块回来。 */
    function superpowerCrater(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [];
        const r = Math.ceil(radius);
        const cx = Math.floor(centre.x()), cz = Math.floor(centre.z()), cy = Math.floor(centre.y());
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius) continue;
            const x = cx + dx, z = cz + dz;
            for (let dy = 1; dy >= -3; dy--) {
                const y = cy + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const surface = distance <= radius * 0.5 ? "minecraft:cracked_stone_bricks" : "minecraft:coarse_dirt";
                if (id !== surface) cells.push({ x: x, y: y, z: z, block: surface });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    define({
        id: "superpower",
        name: "Superpower",
        description: "The user attacks the target with great power. This also lowers the user's Attack and Defense stats.",
        uses: ["贴身用一记最重的单发把对手打残", "把对手从阵地里撞开、在地面留下坑", "震荡式一次震开挤在落点周围的一群人"],
        kind: "enemy",
        range: 3.2,
        maxRange: 5.4,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 40,
        maximumTicks: 220,
        style: "impact",
        defaults: { aftershock: false, ai: { maxChase: 7, finish: true, minHealth: 0 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("superpower", "reach", pokemon) : 3.2, geometry: "line", style: "impact",
                color: 0xC46A3A, label: config && config.aftershock === true ? "蛮力·震荡式" : "蛮力·贯穿式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["superpower"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("superpower", "tempo", context)),
                recover: Math.round(p("superpower", "aftercast", context)),
                cooldown: Math.round(p("superpower", "recharge", context)),
                active: 0,
                range: p("superpower", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_superpower:charge", superpowerScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", aftershock: config && config.aftershock === true ? 1 : 0,
                    power: Math.round(p("superpower", "ram", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const origin = action.origin();
            const power = p("superpower", "ram", action);
            const reach = p("superpower", "reach", action);
            const rush = Math.max(0.25, p("superpower", "rush", action));
            const jolt = p("superpower", "jolt", action);
            const aftershock = !!(config && config.aftershock);
            const crush = p("superpower", "crush", action);
            const share = p("superpower", "share", action);
            const attackLoss = Math.max(0, Math.round(p("superpower", "attackLoss", action)));
            const guardLoss = Math.max(0, Math.round(p("superpower", "guardLoss", action)));
            const contactGap = 0.7;
            const intensity = Math.max(0.5, Math.min(2.4, power / 120));
            let travelled = 0;

            sound(action, "cobblemon:move.closecombat.actor_1");
            WorldFeedback.emit(world, superpowerScene, 1, origin,
                { moment: "charge", aftershock: aftershock ? 1 : 0, power: Math.round(power) }, 16);

            /** 冲击结算：贴上目标就命中，按距离判定是否够得着。 */
            function strike(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const selfAt = self !== null ? self.position() : current.origin();
                const distance = at.minus(selfAt).length();
                const inRange = distance <= reach + 0.9;
                let landed = false, extra = 0;
                if (inRange) {
                    const victim = scope.actor(targetRef);
                    if (victim !== null && scope.valid(victim)) {
                        landed = hurt(current, victim, "superpower", power, { damage: damageSpec("superpower", "ram"), contact: true });
                        if (landed && scope.valid(victim)) joltAway(scope, victim, at, selfAt, jolt);
                    }
                }
                if (landed && aftershock && crush > 0) {
                    WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, crush, { below: 2.0, above: 3.0 }),
                        function (other, facts) {
                            if (String(other.ref()) === targetRef) return;
                            if (!hurt(current, other, "superpower", power * share, { damage: damageSpec("superpower", "ram") })) return;
                            extra++;
                            joltAway(scope, other, facts.position(), selfAt, jolt * 0.8);
                        });
                }
                const craterRadius = aftershock ? Math.max(1.2, crush * 0.6) : 1.1;
                const cells = superpowerCrater(scope, at, craterRadius, 100);
                WorldFeedback.emit(scope, superpowerScene, 1, at,
                    { moment: "impact", target: targetRef, landed: landed ? 1 : 0, extra: extra, aftershock: aftershock ? 1 : 0,
                        intensity: intensity, scale: craterRadius / 1.1, crush: crush, cells: cells,
                        shock: aftershock ? Math.round(8 + crush * 4) : 0,
                        dust: Math.round(16 + power * 0.18 + extra * 10) }, 28);
                if (landed) {
                    NativeEffects.boost(scope, actor, "atk", -attackLoss);
                    NativeEffects.boost(scope, actor, "def", -guardLoss);
                    const after = scope.observe(actor);
                    const above = (after !== null ? after.position() : at).plus(WorldCombat.point(0, 1.3, 0));
                    WorldFeedback.emit(scope, superpowerScene, 1, above,
                        { moment: "slump", attackLoss: attackLoss, guardLoss: guardLoss,
                            fatigue: Math.round(10 + (attackLoss + guardLoss) * 6), intensity: intensity }, 22);
                    WorldFeedback.text(scope, above, superpowerSlumpText, [attackLoss, guardLoss], 30);
                    sound(current, "cobblemon:impact.fighting");
                } else {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), superpowerMissText, [], 24);
                    sound(current, "minecraft:entity.player.attack.weak");
                }
                done(current);
            }

            /** 沿冲击方向把目标撞开：物攻给推力、目标体重抵掉一部分。 */
            function joltAway(scope: CombatWorld, victim: CombatActor, at: CombatPoint, from: CombatPoint, distance: number): void {
                if (distance <= 0.05) return;
                const away = WorldCombat.point(at.x() - from.x(), 0, at.z() - from.z());
                const dir = away.length() < 0.05 ? WorldCombat.point(at.x() - from.x(), 0, at.z() - from.z()) : away.unit();
                if (dir.length() < 0.05) return;
                scope.displace(victim, dir.scale(distance));
            }

            /** 贴地平冲：每刻朝目标当前位置推进 `rush`，贴上或冲到 `reach` 就结算。 */
            function chase(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { done(current); return; }
                const victim = scope.actor(targetRef);
                if (victim === null || !scope.valid(victim)) { done(current); return; }
                const vbody = scope.observe(victim);
                if (vbody === null) { done(current); return; }
                const delta = vbody.position().minus(self.position());
                const flat = WorldCombat.point(delta.x(), 0, delta.z());
                const distance = flat.length();
                if (distance <= contactGap + 0.35 || travelled >= reach) { strike(current, vbody.position()); return; }
                const heading = flat.length() < 1e-6 ? aim(current) : flat.unit();
                const room = Math.min(rush, Math.max(0, distance - contactGap), Math.max(0, reach - travelled));
                if (room <= 0.03) { strike(current, vbody.position()); return; }
                const moved = scope.displace(actor, heading.scale(room));
                travelled += moved;
                WorldFeedback.keep(scope, "superpower:rush:" + current.id(), superpowerScene, 1, self.position(),
                    { moment: "rush", direction: [heading.x(), heading.y(), heading.z()], intensity: intensity }, 8);
                if (moved < room * 0.5) { strike(current, vbody.position()); return; }
                current.after(1, chase);
            }

            chase(action);
        }
    });
}
