/**
 * 上菜 / orderup 的出手方式。
 *
 * 核心念头：以潇洒的身手端出一记不接触的精准下手；若身边跟着一只小个子伙伴（「菜」），还会按它的样子
 * 给施法者补上一项能力——Droopy 提防御、Stretchy 提速度、其余提攻击。它也是全族唯一出手即增益的一招。
 * 三幕：
 *   起（windup，提交前）：托手成盘，盘中聚起一点暖光。
 *   端（execute → serve）：提交后沿瞄准方向踏近半步，在身前一条窄走廊里拍下；命中处亮起礼花火花。
 *   供（dish）：若「菜」在 dishRange 内，按它的样子为自身（分餐式再为身旁队友）补上能力。
 *   碎（break）：下手落点半径内的反射壁、光墙与极光幕一并震碎。
 *
 * 与同族分开：劈瓦是贴身手刀；精神之牙是会吞屏障的咬击；怒牛是整段位移的冲撞。
 * 上菜不接触、单发更轻，但会把碎壁与一碟「菜」一起端出来。
 */
namespace PokemonSkills {
    const orderupScene = "world_combat:move_orderup";
    const orderupDishText = "world_combat.move.orderup.text.dish";
    const orderupBreakText = "world_combat.move.orderup.text.break";
    const orderupMissText = "world_combat.move.orderup.text.miss";

    function orderupShatter(world: CombatWorld, centre: CombatPoint, radius: number): number {
        let broken = 0;
        const zones = WorldEffects.areasWithTag(world, WorldEffects.categories.screen);
        for (let z = 0; z < zones.length; z++) {
            const area = zones[z];
            const at = WorldCombat.point(area.position[0], area.position[1], area.position[2]);
            if (at.minus(centre).length() > radius + area.radius) continue;
            if (world.operation(area.id, "world_combat:dispel", "{}")) broken++;
        }
        const actors: CombatActor[] = world.query(centre, radius, false).slice();
        actors.push(world.source());
        const seen: { [ref: string]: boolean } = {};
        for (let i = 0; i < actors.length; i++) {
            const actor = actors[i];
            if (!actor || !world.valid(actor)) continue;
            const ref = String(actor.ref());
            if (seen[ref]) continue;
            seen[ref] = true;
            broken += CombatStatus.cureTagged(world, actor, WorldEffects.categories.screen);
        }
        return broken;
    }
    /** 「菜」：自身 dishRange 内、比自身明显小的友方里最小的一只。 */
    function orderupDish(world: CombatWorld, actor: CombatActor, self: CombatObservation, range: number): CombatActor | null {
        const actors = world.query(self.position(), range, false);
        let best: CombatActor | null = null, bestWidth = Infinity;
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (!other || !world.valid(other) || String(other.key()) === String(actor.key())) continue;
            if (!world.friendly(other)) continue;
            const body = world.observe(other);
            if (body === null || body.width() > self.width() * 0.75) continue;
            if (body.width() < bestWidth) { bestWidth = body.width(); best = other; }
        }
        return best;
    }
    /** 按「菜」的样子决定提升的能力：Droopy 防御、Stretchy 速度、其余攻击。 */
    function orderupDishStat(dish: CombatActor): string {
        if (String(dish.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(dish);
            if (typeof pokemon.aspect === "function") {
                if (pokemon.aspect("droopy")) return "def";
                if (pokemon.aspect("stretchy")) return "spe";
            }
            const form = String(pokemon.form()).toLowerCase();
            if (form.indexOf("droopy") >= 0) return "def";
            if (form.indexOf("stretchy") >= 0) return "spe";
        }
        return "atk";
    }
    function orderupStatIndex(stat: string): number { return stat === "def" ? 1 : stat === "spe" ? 2 : 0; }
    function orderupLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }
    function orderupPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: "orderup",
        name: "上菜",
        description: "以潇洒的身手端出一记不接触的精准下手：拍伤目标，震碎下手点周围的反射壁、光墙与极光幕；若身边带着小个子伙伴，还会按它的样子给自身（或分给队友）补上一项能力。",
        uses: ["一记不接触的优雅精准拍击", "带着小个子伙伴时顺手强化自身", "用碎壁与增益同时打开局面"],
        kind: "enemy",
        range: 3.0,
        maxRange: 4.4,
        prepare: 8,
        active: 16,
        recover: 7,
        cooldown: 28,
        style: "serve",
        defaults: { share: false, ai: { maxChase: 8, serve: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("orderup", "reach", pokemon) : 3, geometry: "circle", style: "serve",
                color: 0xF0C86A, label: config && config.share ? "分餐式" : "独享式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["orderup"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.max(3, Math.round(p("orderup", "tempo", context))),
                recover: Math.max(2, Math.round(p("orderup", "aftercast", context))),
                cooldown: Math.max(12, Math.round(p("orderup", "recharge", context))),
                range: p("orderup", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_orderup:windup", orderupScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", share: config && config.share ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const share = !!(config && config.share);
            const direction = aim(action);
            const reach = p("orderup", "reach", action);
            const half = p("orderup", "serveWidth", action);
            const power = p("orderup", "serve", action);
            const wardBreak = p("orderup", "wardBreak", action);
            const range = p("orderup", "dishRange", action);
            const shareRadius = p("orderup", "shareRadius", action);
            const stages = Math.max(1, Math.round(p("orderup", "serveStages", action)));

            const self = world.observe(actor);
            if (self !== null) {
                const victim = action.target();
                const victimBody = victim !== null && world.valid(victim) ? world.observe(victim) : null;
                const delta = victimBody !== null ? victimBody.position().minus(self.position()) : direction.scale(reach);
                const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                const step = Math.min(0.6, Math.max(0, flat - half - 0.35));
                if (step > 0.05) world.displace(actor, direction.scale(step));
            }
            const moved = world.observe(actor);
            const origin = moved === null ? action.origin() : moved.position();

            const vertices = orderupLane(origin, direction, reach, half);
            const lane = WorldGeometry.lane(origin, direction, reach, half, { below: 1.4, above: 2.2 });
            let strike = origin.plus(direction.scale(reach)), hits = 0, wards = 0;
            WorldGeometry.selectEnemies(world, lane, function (victim, facts) {
                if (hits === 0) strike = facts.position();
                hits++;
                wards += orderupShatter(world, facts.position(), wardBreak);
                hurt(action, victim, "orderup", power, { damage: damageSpec("orderup", "serve") });
            });
            if (hits === 0) wards += orderupShatter(world, strike, wardBreak);

            // 供：把「菜」端出来。小个子友方在 dishRange 内时，按它的样子补一项能力。
            let dished = 0;
            if (self !== null) {
                const dish = orderupDish(world, actor, self, range);
                if (dish !== null) {
                    dished = 1;
                    const stat = orderupDishStat(dish);
                    const selfStages = share ? stages : stages + 1;
                    NativeEffects.boost(world, actor, stat, selfStages);
                    if (share) {
                        const allies = world.query(self.position(), shareRadius, false);
                        let served = 0;
                        for (let i = 0; i < allies.length && served < 4; i++) {
                            const other = allies[i];
                            if (!other || !world.valid(other) || String(other.key()) === String(actor.key())) continue;
                            if (!world.friendly(other)) continue;
                            NativeEffects.boost(world, other, stat, stages);
                            served++;
                        }
                    }
                    WorldFeedback.emit(world, orderupScene, 1, self.position(),
                        { moment: "dish", stat: orderupStatIndex(stat), stages: selfStages, dished: 1, target: String(actor.ref()) }, 30);
                    WorldFeedback.text(world, self.position().plus(WorldCombat.point(0, 1.3, 0)), orderupDishText, [selfStages], 32);
                    sound(action, "minecraft:block.note_block.bell");
                }
            }

            WorldFeedback.emit(world, orderupScene, 1, strike,
                { moment: "serve", path: orderupPath(vertices), power: Math.round(power), hits: hits, dished: dished,
                    scale: half / 0.45, direction: [direction.x(), direction.y(), direction.z()] }, 24);
            WorldFeedback.emit(world, orderupScene, 1, strike,
                { moment: "break", wards: wards, scale: wardBreak / 8 }, 26);
            sound(action, "minecraft:block.bell.use");
            if (wards > 0) {
                sound(action, "minecraft:block.glass.break");
                WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 1.2, 0)), orderupBreakText, [wards], 30);
            }
            if (hits === 0)
                WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 1.0, 0)), orderupMissText, [], 24);
            done(action);
        }
    });
}
