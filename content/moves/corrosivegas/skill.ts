/** 喷出覆盖周围的酸雾，溶毁宝可梦携带的一件道具，并腐蚀普通生物或玩家的手持耐久装备。队友也会受到影响。 */
namespace PokemonSkills {
    /** 原生携带物可溶毁；普通手持装备承受耐久腐蚀，保留最后一点耐久。 */
    export function corrosiveHeldOf(world: CombatWorld, actor: CombatActor): NativeItems.Held | null {
        const held = NativeItems.heldOf(world, actor);
        if (held === null) return null;
        const wear = held.durability;
        return held.pokemon !== null || wear && !wear.unbreakable && wear.maximum > 0 && wear.damage < wear.maximum - 1 ? held : null;
    }
    function corrosiveItemKey(id: string): string { return "item." + String(id).replace(":", "."); }

    /** 一次雾内扫描的结果：会被裹住的活体、其中有可腐蚀物的敌方／友方数量。 */
    export interface CorrosiveReach {
        affected: { ref: string; ally: boolean }[];
        enemyHolders: number;
        allyHolders: number;
        enemies: number;
    }

    /**
     * 用与实际判定相同的中心、半径与竖直带，列出此刻真正会被雾裹住的人，并单独数出携带可腐蚀物的敌我。
     * 起手预告和出手结算都读这一份事实，队友是否也在圈里一眼可见。
     */
    export function corrosiveGasReach(world: CombatWorld, origin: CombatPoint, radius: number, selfRef: string): CorrosiveReach {
        var region = WorldGeometry.ring(origin, 0, radius, { below: 3.0, above: 3.2 });
        var affected: { ref: string; ally: boolean }[] = [];
        var enemyHolders = 0, allyHolders = 0, enemies = 0;
        WorldGeometry.select(world, region, function (victim, _facts) {
            var ref = String(victim.ref());
            if (ref === selfRef) return;
            var ally = world.friendly(victim);
            affected.push({ ref: ref, ally: ally });
            if (ally) { if (corrosiveHeldOf(world, victim) !== null) allyHolders++; }
            else { enemies++; if (corrosiveHeldOf(world, victim) !== null) enemyHolders++; }
        });
        return { affected: affected, enemyHolders: enemyHolders, allyHolders: allyHolders, enemies: enemies };
    }

    /** 伙伴 AI 读取本招的实际雾半径（含该个体的配置），用于判断雾里是否有人可裹。 */
    export function corrosiveGasRadius(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return 3.2;
        var context: NumberContext = { pokemon: CobblemonCombat.pokemon(actor), skill: skills["corrosivegas"],
            detail: { values: config(world, actor, "corrosivegas") }, world: world, actor: actor };
        return p("corrosivegas", "radius", context);
    }

    define({
        id: "corrosivegas",
        cooldownParameter: "recharge",
        name: "腐蚀气体",
        description: "喷出覆盖周围的酸雾，溶毁宝可梦携带的一件道具，并腐蚀普通生物或玩家的手持耐久装备。队友也会受到影响。",
        uses: ["溶毁周围宝可梦的道具，磨损普通敌人的手持装备", "削弱持械敌人的装备耐久", "喷酸前先让携带贵重道具的队友离开范围"],
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
            var world = action.sense(), actor = action.actor();
            var body = world.observe(actor);
            // 起手预告与出手结算共用同一中心：身体中心，落点与雾环不偏移。
            var origin = body ? body.position() : action.origin();
            var radius = Math.max(1.6, p("corrosivegas", "radius", action));
            var scale = radius / 3.2;
            var ground = WorldGeometry.ground(world, origin, 4);
            // 施放前把真正会被裹住的人和那圈边界摊开：有携带物的队友在圈里时，预告层转警示色。
            var reach = corrosiveGasReach(world, origin, radius, String(actor.ref()));
            action.present("world_combat:move_corrosivegas:windup", corrosiveGasScene, 1, origin, JSON.stringify({
                moment: "windup", scale: scale,
                bubbles: Math.round(p("corrosivegas", "bubbles", action)) }));
            action.present("world_combat:move_corrosivegas:reach", corrosiveGasReachScene, 1, origin, JSON.stringify({
                radius: radius, groundY: ground.y(), risk: reach.allyHolders > 0 ? "ally" : "clear", affected: reach.affected }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world(), caster = action.actor();
            var body = world.observe(caster);
            if (body === null) { done(action); return; }
            var origin = body.position();
            var radius = Math.max(1.6, p("corrosivegas", "radius", action));
            // 雾已经铺开，起手的预告层退场，交给 burst 与残雾。
            action.present("world_combat:move_corrosivegas:reach", corrosiveGasReachScene, 1, origin, JSON.stringify({ stop: true }));
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
                const worn = held !== null && held.pokemon === null;
                const changed = held !== null && (worn
                    ? NativeItems.wearHeld(world, victim, held, Math.max(1, Math.ceil(held.durability!.maximum * p("corrosivegas", "wearPercent", action) / 100))).ok
                    : NativeItems.takeHeld(world, victim, held, 1).ok);
                if (held !== null && changed) {
                    melted++;
                    WorldFeedback.emit(world, corrosiveGasScene, 1, at,
                        { moment: "melt", target: String(victim.ref()), motes: meltMotes, scale: scale,
                            item: held.id, intensity: Math.max(0.8, Math.min(2, radius / 3.2)) }, 28);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), worn ? "world_combat.move.corrosivegas.text.wear" : corrosiveGasMeltText,
                        [{ key: corrosiveItemKey(held.id), fallback: held.id }], 30);
                    world.sound("minecraft:block.fire.extinguish", at, 12, "{}");
                } else if (held === null) {
                    // 手上没有可腐蚀的东西：只留泡沫，不宣称溶毁。
                    WorldFeedback.emit(world, corrosiveGasScene, 1, at,
                        { moment: "fizz", target: String(victim.ref()), scale: scale }, 22);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), corrosiveGasFizzText, [], 24);
                }
                // 观察到装备但原生写入被拒绝（过期/拒不改变）时不补表现，也不把它当成已溶毁。
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
