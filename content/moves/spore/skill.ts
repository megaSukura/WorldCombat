/**
 * 蘑菇孢子 / Spore —— 执行组织。
 *
 * 核心念头：原地抖开一身蘑菇孢子，孢子在一瞬间炸满周围一小片，贴得越近越躲不掉。它是四式中**最可靠的一记**：
 *   命中接近必然（参数只读施法者自己），但只够到很近的地方、冷却最长，而且什么都不留下。草属性穿过孢子。
 *
 * 幕：
 *   起（windup，提交前）：孢子从菌盖/身上鼓起、攒成一圈，只播预告。
 *   爆（burst → asleep / immune，提交后）：以自身为圆心炸开，半径内每个非友方按 `landChance` 各自判定，
 *      沾上的立刻挂共享的 world_combat:status/sleep（宝可梦那一层同步成原生睡眠），最多 `maxTargets` 人；
 *      草属性与免疫睡眠的目标只看孢子散开。
 *
 * 反制：贴身之前先拉开距离或绕开；草属性穿过孢子。它不造成伤害，也不在世界上留任何东西。
 */
namespace PokemonSkills {
    function sporeAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /** 草属性对粉末免疫：它直接穿过这团孢子。 */
    function sporeGrassImmune(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        for (let i = 0; i < pokemon.typeCount(); i++) if (String(pokemon.type(i)) === "grass") return true;
        return false;
    }

    define({
        id: sporeId,
        cooldownParameter: "recharge",
        name: "蘑菇孢子",
        description: "原地抖开一身蘑菇孢子，孢子一瞬间炸满周围一小片地，贴得越近越躲不掉：沾上的人当场睡下，而且睡得很沉。它几乎是必中的一记，代价是只够到很近的地方、冷却也最长，草属性则直接穿过孢子。",
        uses: ["被一群近战围住时一次全放倒", "贴身压制一个硬目标", "为队友的食梦或恶梦制造睡眠窗"],
        kind: "self",
        range: 0,
        maxRange: 0,
        prepare: 8,
        active: 1,
        recover: 8,
        cooldown: 150,
        style: "spore",
        defaults: { dense: false },
        fields: [
            flag("dense", "密孢")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[sporeId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(sporeId, "tempo", context)),
                recover: Math.round(p(sporeId, "aftercast", context)),
                cooldown: Math.round(p(sporeId, "recharge", context)),
                active: 1,
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("spore:windup:" + action.id(), sporeScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", dense: config && config.dense === true }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[sporeId], detail: { values: config } };
            return { radius: pokemon ? p(sporeId, "burstRadius", context) : 2.2, geometry: "circle", style: "spore", color: 0x6FBF6A,
                label: config && config.dense === true ? "蘑菇孢子·密孢" : "蘑菇孢子·蓬孢" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const radius = Math.max(1.4, p(sporeId, "burstRadius", action));
            const cap = Math.max(1, Math.round(p(sporeId, "maxTargets", action)));
            const sleepTicks = Math.max(80, Math.round(p(sporeId, "sleepTicks", action)));
            const chance = Math.max(0.05, Math.min(0.99, p(sporeId, "landChance", action)));
            const spores = Math.max(8, Math.round(p(sporeId, "spores", action)));
            const speed = Math.max(0.5, p(sporeId, "sporeSpeed", action));
            const puff = Math.max(0.08, p(sporeId, "puffSize", action));
            const scale = Math.max(0.5, Math.min(2.2, radius / 2.2));
            let caught = 0, immune = 0;

            sound(action, "minecraft:block.spore_blossom.place");
            WorldFeedback.emit(world, sporeScene, 1, origin,
                { moment: "burst", radius: radius, spores: spores, speed: speed, puff: puff, cap: cap, scale: scale }, 32);
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(origin, 0, radius, { below: 2, above: 3 }), function (other: CombatActor) {
                if (caught >= cap) return;
                if (String(other.key()) === String(self.key())) return;
                const body = world.observe(other);
                if (body === null) return;
                const ref = String(other.ref());
                if (sporeGrassImmune(world, other)) {
                    immune++;
                    WorldFeedback.emit(world, sporeScene, 1, body.position(), { moment: "immune", target: ref }, 20);
                    WorldFeedback.text(world, sporeAbove(body.position()), "world_combat.move.spore.text.grass", [], 24);
                    return;
                }
                if (CombatStatus.has(world, other, "sleep")) return;
                if (world.random() >= chance || !CombatStatus.inflict(world, other, "sleep", sleepTicks)) {
                    WorldFeedback.emit(world, sporeScene, 1, body.position(), { moment: "immune", target: ref }, 20);
                    return;
                }
                caught++;
                WorldFeedback.emit(world, sporeScene, 1, body.position(),
                    { moment: "asleep", target: ref, order: caught, spores: spores, ticks: Math.round(sleepTicks / 20), scale: scale }, 34);
                WorldFeedback.text(world, sporeAbove(body.position()), "world_combat.move.spore.text.sleep", [Math.round(sleepTicks / 20)], 32);
                world.sound("minecraft:entity.fox.sleep", body.position(), 14, "{}");
            });
            if (caught > 0) {
                sound(action, "minecraft:block.moss.break");
            } else if (immune === 0) {
                WorldFeedback.emit(world, sporeScene, 1, origin, { moment: "fizzle", radius: radius, scale: scale }, 20);
                WorldFeedback.text(world, sporeAbove(origin), "world_combat.move.spore.text.none", [], 24);
            }
            done(action);
        }
    });
}
