/**
 * 腐蚀气体 / corrosivegas —— 注册与动作。
 *
 * 念头：以施法者为中心炸开一片强酸毒雾，三百六十度罩住周围；雾里每个活体的携带物被当场溶毁、谁也不得到，
 *   没有携带物的活体也沾上一层短暂的「沾酸」身份，落地后还留一小段残雾。
 * 三幕：
 *   起（windup，提交前）：酸气顺着身体往上涌、在皮肤下鼓动（只观察、只预告，可被打断且不花代价）。
 *   炸（execute，提交后）：一圈酸雾从脚下向外炸开；雾里每个非自己的活体（队友也一样）被挂上共享身份
 *     `world_combat:status/corroded` 的沾酸标记；其中宝可梦携带的道具被原生持有物操作当场溶毁（不掉落、不复制）。
 *   残（linger）：毒雾散后在原地贴地留一段可见的残雾，可以被绕开。
 * 判定与画面用同一个半径（WorldGeometry.ring 与 data.scale）。
 */
namespace PokemonSkills {
    export interface CorrosiveHeld { id: string; key: string; pokemon: CombatPokemon | null; }
    /** 目标当前的持有物（只认宝可梦的原生持有物；其他生物没有可供酸雾溶毁的道具）。 */
    export function corrosiveHeldOf(world: CombatWorld, actor: CombatActor): CorrosiveHeld | null {
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return null;
        var pokemon = CobblemonCombat.pokemon(actor), id = String(pokemon.heldItem());
        return id ? { id: id, key: String(pokemon.heldKey()), pokemon: pokemon } : null;
    }
    function corrosiveItemKey(id: string): string { return "item." + String(id).replace(":", "."); }

    /** 伙伴 AI 读取本招的实际雾半径（含该个体的配置），用于判断雾里是否有人可裹。 */
    export function corrosiveGasRadius(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return 3.2;
        var context: NumberContext = { pokemon: CobblemonCombat.pokemon(actor), skill: skills["corrosivegas"],
            detail: { values: config(world, actor, "corrosivegas") }, world: world, actor: actor };
        return p("corrosivegas", "radius", context);
    }

    define({
        id: "corrosivegas",
        name: "腐蚀气体",
        description: "以自身为中心炸开一片强酸毒雾：雾里所有其他活体携带的道具被当场溶毁、谁也不得到，自己也沾上短暂的沾酸身份，落地后留一段残雾。不造成伤害，队友一视同仁。",
        uses: ["一次溶掉围上来一圈对手的道具", "在道具战里清场，让双方都失去携带物", "把对方的树果、宝石、剩饭一起废掉"],
        kind: "self",
        range: 0,
        maxRange: 0,
        prepare: 13,
        active: 0,
        recover: 8,
        cooldown: 150,
        style: "acid",
        defaults: { spread: false, ai: { maxChase: 11, leaveStation: false } },
        fields: [flag("spread", "铺开式")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["corrosivegas"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            var spread = !!(config && config.spread);
            return { prepare: Math.round(p("corrosivegas", "tempo", context)),
                recover: Math.round(p("corrosivegas", "aftercast", context)),
                cooldown: Math.round(p("corrosivegas", "recharge", context)) + (spread ? 6 : -4),
                active: 0, range: 0 };
        },
        windup: function (action, config, prepare) {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:move_corrosivegas:windup", corrosiveGasScene, 1, action.origin(), JSON.stringify({
                moment: "windup", scale: scale, bubbles: Math.round(p("corrosivegas", "bubbles", action)),
                spread: config && config.spread ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world(), caster = action.actor();
            var body = world.observe(caster);
            if (body === null) { done(action); return; }
            var origin = body.position();
            var radius = Math.max(1.6, p("corrosivegas", "radius", action));
            var ticks = Math.max(30, Math.round(p("corrosivegas", "duration", action)));
            var linger = Math.max(40, Math.round(p("corrosivegas", "linger", action)));
            var meltMotes = Math.max(8, Math.round(p("corrosivegas", "meltMotes", action)));
            var bubbles = Math.max(8, Math.round(p("corrosivegas", "bubbles", action)));
            var cloudlets = Math.max(10, Math.round(p("corrosivegas", "cloudlets", action)));
            var scale = radius / 3.2;
            sound(action, "minecraft:block.brewing_stand.brew");
            WorldFeedback.emit(world, corrosiveGasScene, 1, origin,
                { moment: "burst", scale: scale, bubbles: bubbles, cloudlets: cloudlets }, 30);
            // 酸雾是气体：以施法者身体为中心，向上向下都留足够的竖直带，浮空的施法者也能裹住地面上的目标。
            var region = WorldGeometry.ring(origin, 0, radius, { below: 3.0, above: 3.2 });
            var caught = 0, melted = 0;
            WorldGeometry.select(world, region, function (victim, facts) {
                if (String(victim.ref()) === String(caster.ref())) return;
                caught++;
                var at = facts.position();
                CombatStatus.apply(world, victim, corrosiveGasStatus, corrosiveGasEffect, ticks, 0, { unique: true });
                var held = corrosiveHeldOf(world, victim);
                if (held !== null && CobblemonCombat.consumeHeld(world, victim, held.key, 1)) {
                    melted++;
                    WorldFeedback.emit(world, corrosiveGasScene, 1, at,
                        { moment: "melt", target: String(victim.ref()), motes: meltMotes, scale: scale,
                            item: held.id, intensity: Math.max(0.8, Math.min(2, radius / 3.2)) }, 28);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), corrosiveGasMeltText,
                        [{ key: corrosiveItemKey(held.id), fallback: held.id }], 30);
                    world.sound("minecraft:block.fire.extinguish", at, 12, "{}");
                } else {
                    WorldFeedback.emit(world, corrosiveGasScene, 1, at,
                        { moment: "fizz", target: String(victim.ref()), scale: scale }, 22);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), corrosiveGasFizzText, [], 24);
                }
            });
            WorldFeedback.emit(world, corrosiveGasScene, 1, origin,
                { moment: "linger", scale: scale, bubbles: bubbles, cloudlets: cloudlets }, linger);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.1, 0)), corrosiveGasTaintText,
                [Math.round(linger / 20)], 30);
            sound(action, "minecraft:entity.generic.splash");
            done(action);
        },
        indicator: function (config, pokemon) {
            var context: NumberContext = { pokemon: pokemon!, skill: skills["corrosivegas"], detail: { values: config } };
            return { radius: pokemon ? p("corrosivegas", "radius", context) : 3.2, geometry: "area", style: "acid", color: 0x8FD24A,
                label: config && config.spread === true ? "腐蚀气体·铺开" : "腐蚀气体·收束" };
        }
    });
}
