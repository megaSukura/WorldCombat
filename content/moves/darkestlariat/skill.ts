/** 攻击并推开周围敌人，忽略目标的防御能力等级变化。普通生物的装备护甲仍参与减伤。 */
namespace PokemonSkills {
    const darkestlariatScene = "world_combat:move_darkestlariat";
    const darkestlariatHitText = "world_combat.move.darkestlariat.text.hit";
    const darkestlariatMissText = "world_combat.move.darkestlariat.text.miss";

    /** 一圈的顶点：以 origin 为心、半径 radius 的整圈闭合折线；判定与画面共用同一组 x/z。 */
    function darkestlariatCircle(origin: CombatPoint, radius: number): CombatPoint[] {
        const points: CombatPoint[] = [], steps = 24;
        for (let index = 0; index < steps; index++) {
            const angle = index / steps * Math.PI * 2;
            points.push(WorldCombat.point(origin.x() + Math.cos(angle) * radius, origin.y(), origin.z() + Math.sin(angle) * radius));
        }
        return points;
    }

    /** 表现载荷里的顶点数组：与判定同一组 x/z，抬到给定高度。 */
    function darkestlariatRingPath(origin: CombatPoint, radius: number, height: number): number[][] {
        return darkestlariatCircle(origin, radius).map(function (point) { return [point.x(), origin.y() + height, point.z()]; });
    }

    define({
        id: darkestlariatId,
        cooldownParameter: "recharge",
        name: "Darkest Lariat",
        description: "攻击并推开周围敌人，忽略目标的防御能力等级变化。普通生物的装备护甲仍参与减伤。",
        uses: ["原地旋身，把身周一圈的敌人一起抡开", "把目标涨起来的防御等级直接无视掉", "被围住时一次清开贴身的人"],
        kind: "self",
        range: 2.6,
        maxRange: 5.0,
        prepare: 8,
        active: 10,
        recover: 7,
        cooldown: 26,
        style: "spin",
        stationary: true,
        defaults: { wide: false, ai: { maxChase: 8, crowd: true, breakGuard: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(darkestlariatId, "radius", pokemon) : 2.6, geometry: "area", style: "spin", color: 0x6E5AA8,
                label: config && config.wide === true ? "ＤＤ金勾臂·广旋" : "ＤＤ金勾臂" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[darkestlariatId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(darkestlariatId, "tempo", context)),
                recover: Math.round(p(darkestlariatId, "aftercast", context)),
                cooldown: Math.round(p(darkestlariatId, "recharge", context)),
                active: skills[darkestlariatId].active,
                range: p(darkestlariatId, "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_darkestlariat:wind", darkestlariatScene, 1, action.origin(),
                JSON.stringify({ moment: "wind", windup: prepare, wide: config && config.wide === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const centre = self.position();
            const radius = Math.max(2.0, p(darkestlariatId, "radius", action));
            const depth = Math.max(0.8, p(darkestlariatId, "depth", action));
            const power = p(darkestlariatId, "sweep", action);
            const push = p(darkestlariatId, "push", action);
            const spin = Math.max(2, Math.round(p(darkestlariatId, "spin", action)));
            const gales = Math.max(10, Math.round(p(darkestlariatId, "gales", action)));
            const scale = Math.max(0.6, Math.min(1.9, radius / 2.6));
            const intensity = Math.max(0.6, Math.min(2.2, power / 66));
            const wide = config && config.wide === true ? 1 : 0;
            // 判定用的整圈与覆盖高度：脚底到脚上 `depth` 之间，用真实身体箱相交取人。
            const minY = self.boundsMin().y(), maxY = minY + depth;
            const circle = darkestlariatCircle(centre, radius);
            let hits = 0;

            sound(action, "minecraft:entity.player.attack.sweep");
            WorldFeedback.emit(world, darkestlariatScene, 1, centre,
                { moment: "spin", actor: String(actor.ref()), radius: radius, spin: spin, gales: gales,
                  path: darkestlariatRingPath(centre, radius, 0.15), scale: scale, intensity: intensity, wide: wide }, 26);

            WorldGeometry.selectBodies(world, WorldGeometry.bodyPolygon(circle, minY, maxY),
                function (enemy, facts) {
                    if (hits >= 6 || facts.friendly() || String(enemy.ref()) === String(actor.ref())) return;
                    // 墙后的人这一圈抡不到：先认真实墙面。
                    const contact = world.closestPoint(enemy, centre);
                    if (contact === null || WorldGeometry.blockHit(world, centre, contact) !== null) return;
                    if (!hurt(action, enemy, darkestlariatId, power,
                        { damage: damageSpec(darkestlariatId, "sweep"), contact: true })) return;
                    hits++;
                    const away = facts.position().minus(centre);
                    if (world.valid(enemy) && away.length() > 0.2)
                        world.hitDisplace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                    WorldFeedback.emit(world, darkestlariatScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), gales: gales, spin: spin, scale: scale, intensity: intensity }, 20);
                });
            if (hits > 0) sound(action, "cobblemon:impact.dark");

            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)),
                hits > 0 ? darkestlariatHitText : darkestlariatMissText, hits > 0 ? [hits] : [], 22);
            if (hits === 0)
                WorldFeedback.emit(world, darkestlariatScene, 1, centre,
                    { moment: "miss", gales: Math.round(gales * 0.5), scale: scale }, 16);
            done(action);
        }
    });

    // 「无视对手的能力变化」：本招对每个目标结算前，把目标本段对应的防御能力等级归零。
    // 归零只作用于这一次结算的本地快照，不修改目标真正的等级；攻击方自身等级与其余结算照常。
    PokemonDamage.metadata.define({
        id: "world_combat:move_darkestlariat/ignore-stages",
        applies: function (context: PokemonDamage.MetadataContext) {
            return context.metadata.move === darkestlariatId && !!context.targetFacts;
        },
        apply: function (context: PokemonDamage.MetadataContext) {
            PokemonDamage.ignoreDefenceStages(context);
        }
    });
}
