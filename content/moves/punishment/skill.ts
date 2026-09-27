/**
 * 惩罚 / punishment 的出手方式。
 *
 * 核心念头：看准目标身上叠起来的强化，用一记近身压顶把那些层数称进威力。判定用提交时的瞄准方向，
 *   在身前上举处到身前落点之间拉出一条有限的重臂扫线：`action.trace(top, low, edge, true)` 取真正的首个接触
 *   （前排的身体、同伴或实墙都会截住它），只有首个接触是非友方活体时才结算一记 `judge` 接触伤害。
 *   墙当面截住扫线就没有伤害；空挥只是白砸一记，不称重、不计增益。抬臂期间目标可以移出这条线，本招不再自动贴近。
 *
 * 强化计数：`punishmentBoosts` 读目标七项正向能力等级，加上药水／信标等正面 MobEffect 的层数（I 级计 1 层），
 *   在**命中那一刻**对真正被打中的对象读取；总数封顶，Boss 挂着一堆常驻效果也不会无限增威。命中的对象保留
 *   这些增益，本招只把它们的层数称进这一次威力。
 *
 * 选取：`kind: "aim"`——朝方向或世界点都能出手，也能空砸；提交与执行都不要求存在敌人，实体推荐只帮助共享接近逻辑贴近。
 *
 * 与同族分开：逐步击破是贴脸分高度连击、ＤＤ金勾臂是原地整圈横扫、圣剑是最长的一记正前切斩；
 *   惩罚凭「先看目标涨了多少、再一记压顶称进去」认出来。
 */
namespace PokemonSkills {
    const punishmentScene = "world_combat:move_punishment";
    const punishmentHitText = "world_combat.move.punishment.text.hit";
    const punishmentMissText = "world_combat.move.punishment.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function punishmentHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 方块表面的法线方向，供表现把落空的尘屑沿墙面弹开。 */
    function punishmentFace(face: string): number[] {
        switch (face) {
            case "down": return [0, -1, 0];
            case "up": return [0, 1, 0];
            case "north": return [0, 0, -1];
            case "south": return [0, 0, 1];
            case "west": return [-1, 0, 0];
            case "east": return [1, 0, 0];
            default: return [0, 1, 0];
        }
    }

    define({
        freeMovement: true,
        id: punishmentId,
        cooldownParameter: "recharge",
        name: "Punishment",
        description: "朝瞄准方向递出一记近身压顶：拳路只碰到的第一个非友方才吃这一记，墙截住就没有伤害。目标此刻的七项正向能力等级与药水、信标等正面增益越多，这一记越重（总数封顶）；目标保留这些增益。空挥不称重、不计增益。",
        uses: ["对手叠了能力等级时打它一记重的", "把目标涨起来的每一层力量称进威力里", "一记从高处落下的压顶处刑"],
        kind: "aim",
        range: 2.0,
        maxRange: 3.2,
        prepare: 7,
        active: 0,
        recover: 6,
        cooldown: 16,
        style: "judge",
        defaults: { heavy: false, ai: { maxChase: 6, punishBoost: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(punishmentId, "reach", pokemon), geometry: "line", style: "judge", color: 0x6E5AA8,
                label: config && config.heavy === true ? "惩罚·重判" : "惩罚" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[punishmentId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(punishmentId, "tempo", context)),
                recover: Math.round(p(punishmentId, "aftercast", context)),
                cooldown: Math.round(p(punishmentId, "recharge", context)),
                active: 0,
                range: p(punishmentId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), target = action.target();
            const marks = target !== null && world.valid(target) && !world.friendly(target) ? punishmentBoosts(world, target) : 0;
            const body = world.observe(action.actor());
            const look = action.direction();
            const flat = WorldCombat.point(look.x(), 0, look.z());
            const forward = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
            const lift = body === null ? 1.0 : body.height() * 0.8;
            const arm = action.origin().plus(WorldCombat.point(0, lift, 0)).plus(forward.scale(0.35));
            action.present("world_combat:move_punishment:weigh", punishmentScene, 1, arm,
                JSON.stringify({ moment: "weigh", windup: prepare, marks: marks, scale: Math.max(0.6, Math.min(1.9, p(punishmentId, "reach", action) / 2.0)),
                    target: target !== null && world.valid(target) ? String(target.ref()) : "", heavy: config && config.heavy === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            // 已提交的瞄准方向：抬臂期间目标可以移出这条线；不再朝它自动贴近。
            const heading = punishmentHeading(action.direction());
            const reach = Math.max(1.6, p(punishmentId, "reach", action));
            const edge = Math.max(0.28, p(punishmentId, "edge", action));
            const base = p(punishmentId, "judge", action);
            const heavy = config && config.heavy === true ? 1 : 0;
            const origin = self.position();
            const lift = self.height() * 0.95;
            const top = origin.plus(WorldCombat.point(0, lift, 0)).plus(heading.scale(reach * 0.15));
            const low = origin.plus(heading.scale(reach));
            const scale = Math.max(0.6, Math.min(1.9, reach / 2.0));

            // 权威首碰：短重臂从身前上举处落下，第一个碰到的身体或墙就是这一记的落点。
            const contact = action.trace(top, low, edge, true);
            const at = contact.position();
            const lander = contact.hitEntity() ? contact.target() : null;
            const victim = lander !== null && String(lander.ref()) !== String(actor.ref()) && !world.friendly(lander) ? lander : null;

            if (victim === null) {
                // 空挥或撞墙：不称重、不计增益，只留一记空砸。
                const blocked = contact.blocked();
                WorldFeedback.emit(world, punishmentScene, 1, at,
                    { moment: "miss", direction: blocked ? punishmentFace(contact.blockFace()) : [heading.x(), heading.y(), heading.z()],
                      scale: scale }, 16);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), punishmentMissText, [], 20);
                sound(action, "minecraft:block.anvil.land");
                done(action);
                return;
            }

            // 命中那一刻，对真正被打中的对象读强化总数与威力。
            const hitContext = withTarget(factContext(action), victim);
            const boost = punishmentBoosts(world, victim);
            const power = p(punishmentId, "judge", hitContext);
            const weights = Math.max(6, Math.round(p(punishmentId, "weights", hitContext)));
            const intensityHit = Math.max(0.6, Math.min(2.4, power / 56));
            const stroke = at.minus(top), length = stroke.length();
            const down = length < 1e-6 ? [heading.x(), -1, heading.z()] : [stroke.x() / length, stroke.y() / length, stroke.z() / length];

            sound(action, "minecraft:block.anvil.land");
            WorldFeedback.emit(world, punishmentScene, 1, at,
                { moment: "strike", path: [[top.x(), top.y(), top.z()], [at.x(), at.y(), at.z()]], direction: down,
                  boost: boost, weights: weights, scale: scale, intensity: intensityHit, heavy: heavy }, 18);

            const landed = impact(action, contact, punishmentId, power,
                { damage: damageSpec(punishmentId, "judge"), contact: true });
            WorldFeedback.emit(world, punishmentScene, 1, at,
                { moment: landed ? "hit" : "miss", target: String(victim.ref()), boost: boost, weights: weights,
                  scale: scale, intensity: intensityHit }, 20);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)),
                landed ? punishmentHitText : punishmentMissText, landed ? [boost] : [], 22);
            if (landed) sound(action, "cobblemon:impact.dark");
            done(action);
        }
    });
}
