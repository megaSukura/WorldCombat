/**
 * 浊雾 / smog —— 出手方式。
 *
 * 核心念头：一记**正前方喷出的低矮浊雾锥**。施法者吸一口气，朝选定的方向把浓雾一口吹出去；雾贴着地面向前滚，
 *   先扫过近处，隔一拍再滚到远处，每扫到一个人就吃一点伤害、很容易中毒。
 *   它不靠打疼人，靠把人熏毒——射程短、伤害低、PP 多、中毒概率最高。
 *
 * 幕：
 *   起（windup，提交前）：鼓起胸腔、口边聚起雾团的预告（`action.present`，可被打断、不花 PP）。
 *   喷（puff）：朝瞄准方向喷出雾锥，雾团沿锥面向前滚。
 *   滚（wash → crest）：近段先扫（`reachTicks`），隔 `waveTicks` 刻远段再扫；每段各结算一次 `fumes` 与中毒掷。
 *
 * 与同族分开：污泥攻击是低弧小泥团、污泥炸弹是落地插引信的延时爆弹、垃圾射击是负重直线炮；
 *   只有浊雾是**正前方滚出去的雾锥**，反制方式是绕到它侧面或退出锥形。
 */
namespace PokemonSkills {
    const smogScene = "world_combat:move_smog";
    const smogHitText = "world_combat.move.smog.text.hit";
    const smogPoisonText = "world_combat.move.smog.text.poison";
    const smogMissText = "world_combat.move.smog.text.miss";

    /** 一个雾锥段：与判定同一组角度的扇区，再切成内外的环带。 */
    function smogBand(origin: CombatPoint, direction: CombatPoint, reach: number, cone: number, inner: number, outer: number): WorldGeometry.Region {
        const sector = WorldGeometry.sector(origin, direction, reach, cone, { below: 2, above: 2.5 });
        const ring = WorldGeometry.ring(origin, inner, outer, { below: 2, above: 2.5 });
        return {
            contains: function (point) { return sector.contains(point) && ring.contains(point); },
            centre: function () { return origin; },
            radius: function () { return reach + 1; }
        };
    }

    define({
        id: "smog",
        name: "Smog",
        description: "吸一口气，朝选定的方向喷出一道低矮的浊雾锥；雾贴着地面向前滚，先扫近处、隔一拍再滚到远处，每扫到的人吃一点伤害并很容易中毒。射程短、伤害低，但中毒概率最高。滚涌形态更宽更远更毒，代价是单段更轻、来得更慢。",
        uses: ["近身一口把正前方的人熏毒", "封住一条走廊的入口", "PP 多、反复刷毒"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 10,
        active: 0,
        recover: 7,
        cooldown: 16,
        style: "gas",
        defaults: { billow: false, ai: { maxChase: 8, seekUnpoisoned: true, cluster: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["smog"], detail: { values: config } };
            return { radius: p("smog", "reach", context), geometry: "cone", style: "gas", color: 0x8FBF4A,
                label: config && config.billow === true ? "浊雾·滚涌" : "浊雾" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["smog"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("smog", "inhale", context)),
                recover: Math.round(p("smog", "settle", context)),
                cooldown: Math.round(p("smog", "recharge", context)),
                active: 0,
                range: p("smog", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const puffs = Math.max(6, Math.round(p("smog", "puffs", action)));
            action.present("smog:inhale:" + action.id(), smogScene, 1, action.origin(),
                JSON.stringify({ moment: "inhale", windup: prepare, puffs: puffs, billow: config && config.billow === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const reach = p("smog", "reach", action);
            const cone = p("smog", "cone", action);
            const power = p("smog", "fumes", action);
            const chance = p("smog", "toxinChance", action);
            const venomTicks = Math.max(40, Math.round(p("smog", "venomTicks", action)));
            const wave = Math.max(2, Math.round(p("smog", "waveTicks", action)));
            const puffs = Math.max(8, Math.round(p("smog", "puffs", action)));
            const cap = Math.max(1, Math.round(p("smog", "maxTargets", action)));
            const half = cone / 2;
            const intensity = Math.max(0.6, Math.min(2, power / 30));
            const hitRefs: { [ref: string]: boolean } = {};
            let hits = 0, poisoned = 0, settled = false;

            /** 扫过雾锥的一段：内圈近段或外圈远段，每人只结算一次。 */
            function wash(current: CombatAction, inner: number, outer: number): void {
                const scope = current.world();
                WorldGeometry.selectEnemies(scope, smogBand(origin, direction, reach, cone, inner, outer), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (hitRefs[ref] || hits >= cap) return;
                    hitRefs[ref] = true;
                    if (!hurt(current, enemy, "smog", power, { damage: damageSpec("smog", "fumes") })) return;
                    hits++;
                    const poisonedNow = scope.valid(enemy) && scope.random() < chance
                        && CombatStatus.inflict(scope, enemy, "poison", venomTicks, 0, { secondary: true });
                    if (poisonedNow) poisoned++;
                    WorldFeedback.emit(scope, smogScene, 1, facts.position(),
                        { moment: poisonedNow ? "poison" : "hit", target: ref, puffs: puffs, scale: reach / 6, intensity: intensity }, 22);
                });
            }

            sound(action, "cobblemon:move.poisongas.actor");
            sound(action, "minecraft:entity.slime.squish_small");
            WorldFeedback.emit(world, smogScene, 1, origin, { moment: "puff",
                direction: [direction.x(), direction.y(), direction.z()], reach: reach, half: half, puffs: puffs, intensity: intensity }, 20);
            WorldFeedback.keep(world, "smog:wash:" + action.id(), smogScene, 1, origin,
                { moment: "wash", direction: [direction.x(), direction.y(), direction.z()], reach: reach, half: half, puffs: puffs, wave: wave, intensity: intensity }, wave + 18);
            wash(action, 0, reach * 0.55);
            action.after(wave, function (next: CombatAction) {
                if (settled) return;
                const scope = next.world();
                wash(next, reach * 0.45, reach);
                WorldFeedback.emit(scope, smogScene, 1, origin, { moment: "crest",
                    direction: [direction.x(), direction.y(), direction.z()], reach: reach, half: half, puffs: puffs }, 18);
                WorldFeedback.text(scope, origin.plus(direction.scale(reach * 0.6)).plus(WorldCombat.point(0, 0.7, 0)),
                    hits > 0 ? smogHitText : smogMissText, hits > 0 ? [hits] : [], 26);
                if (poisoned > 0)
                    WorldFeedback.text(scope, origin.plus(direction.scale(reach * 0.6)).plus(WorldCombat.point(0, 1.2, 0)), smogPoisonText, [], 24);
                if (!settled) { settled = true; done(next); }
            });
        }
    });
}
