/**
 * 烧尽 / incinerate —— 注册与动作。
 *
 * 念头：朝面前扫出一片扇形火焰，把扇内每个对手都点一遍；谁手里有怕火的东西（树果或宝石），
 * 就在火里被当场烧掉、谁也不得到，火顺势窜高让这一击更重。
 * 两幕：
 *   起（windup，提交前）：火苗在口前拢成扇面、向内卷——预告扫击的范围。
 *   扫（execute，提交后）：扇形火焰沿一组顶点铺开；扇内每个非友方各挨一记火属性特攻，
 *       携带树果或宝石者在命中点经统一装备事务被烧毁（CAS 取走，不掉落、不复制），并额外吃到爆燃威力；
 *       扇内无人时火焰在前方自行散开。
 * 与同为“夺物”的渴望／小偷分开：本招不拿也不留，而是当场烧毁、一次能扫好几个，是拒止手段。
 * 判定与表现用同一组扇面顶点（WorldGeometry.polygon 与 data.path）。
 */
namespace PokemonSkills {
    const incinerateScene = "world_combat:move_incinerate";
    const incinerateBurnText = "world_combat.move.incinerate.text.burn";
    const incinerateMissText = "world_combat.move.incinerate.text.miss";

    /** 扇面顶点：从施法者身前一点出发，沿瞄准方向铺开半张角 `halfDeg`、半径 `reach` 的圆弧。 */
    function incinerateFan(origin: CombatPoint, direction: CombatPoint, reach: number, halfDeg: number, steps: number): CombatPoint[] {
        var flat = WorldCombat.point(direction.x(), 0, direction.z());
        var heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        var base = Math.atan2(heading.z(), heading.x()), half = halfDeg * Math.PI / 360;
        var vertices: CombatPoint[] = [origin];
        for (var i = 0; i <= steps; i++) {
            var angle = base - half + (2 * half) * i / steps;
            vertices.push(origin.plus(WorldCombat.point(Math.cos(angle) * reach, 0, Math.sin(angle) * reach)));
        }
        return vertices;
    }
    function incineratePath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    function incinerateSweep(action: CombatAction, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor(), direction = aim(action);
        var reach = p("incinerate", "reach", action), half = p("incinerate", "fan", action);
        var power = p("incinerate", "scorch", action), flare = p("incinerate", "flare", action);
        var flames = p("incinerate", "flames", action);
        var steps = Math.max(3, Math.round(p("incinerate", "steps", action)));
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var vertices = incinerateFan(action.origin(), direction, reach, half, steps);
        var region = WorldGeometry.polygon(vertices, { below: 1.4, above: 3.0 });
        var front = action.origin().plus(direction.scale(reach * 0.6));
        sound(action, "cobblemon:move.flamethrower.actor");
        WorldFeedback.emit(world, incinerateScene, 1, action.origin(),
            { moment: "sweep", path: incineratePath(vertices), flames: Math.round(flames),
                scale: reach / 3.2, direction: [direction.x(), direction.y(), direction.z()] }, 26);
        var hits = 0;
        WorldGeometry.selectEnemies(world, region, function (victim, facts) {
            hits++;
            var burnable = incinerateBurnable(world, victim);
            var before = world.observe(victim), maximum = before ? Math.max(1, before.maxHealth()) : 1;
            var amount = power + (burnable !== null ? flare : 0);
            var landed = hurt(action, victim, "incinerate", amount, { damage: damageSpec("incinerate", "scorch") });
            var after = world.valid(victim) ? world.observe(victim) : null;
            var dealt = before ? before.health() - (after ? after.health() : 0) : 0;
            var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
            WorldFeedback.emit(world, incinerateScene, 1, facts.position(),
                { moment: "burn", target: String(victim.ref()), scale: scale, intensity: intensity,
                    flare: burnable !== null ? Math.round(flames) : 0 }, 28);
            if (landed && burnable !== null && NativeItems.takeHeld(world, victim, burnable).ok) {
                WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.0, 0)), incinerateBurnText,
                    [{ key: "item." + burnable.id.replace(":", "."), fallback: burnable.kind }], 30);
                sound(action, "minecraft:block.fire.extinguish");
            }
        });
        sound(action, "cobblemon:move.flamethrower.target");
        if (hits === 0) {
            WorldFeedback.emit(world, incinerateScene, 1, front, { moment: "fizzle", scale: scale }, 20);
            WorldFeedback.text(world, front, incinerateMissText, [], 22);
        }
        done(action);
    }

    define({
        id: "incinerate",
        name: "烧尽",
        description: "扫出一片扇形火焰，扇内每个敌人各挨一记火属性特攻；携带树果或宝石者在火里被当场烧毁，火顺势窜高，这一击更重。",
        uses: ["一次烧到身前的多个对手", "烧掉对手的树果或宝石，让它再也用不了", "对持有可燃物者的加重火焰一击"],
        kind: "enemy",
        range: 3.2,
        maxRange: 6,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 34,
        style: "fire",
        defaults: { wide: false, ai: { maxChase: 10, leaveStation: false, burnItems: false } },
        fields: [flag("wide", "广域")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["incinerate"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("incinerate", "charge", context)), recover: Math.round(p("incinerate", "aftercast", context)),
                cooldown: Math.round(p("incinerate", "recharge", context)), active: 0, range: p("incinerate", "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:incinerate:" + action.id(), incinerateScene, 1, action.origin(), JSON.stringify({
                moment: "gather", scale: scale, flames: Math.round(p("incinerate", "flames", action)),
                fan: p("incinerate", "fan", action) }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            incinerateSweep(action, done);
        },
        indicator: function () { return { radius: 5, geometry: "cone", style: "fire", color: 0xF08030, label: "烧尽" }; }
    });
}
