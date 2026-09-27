/** 把自己携带的一件道具交给空手的友方宝可梦、普通生物或玩家。对方已有持物或被查封时无法递送。
 *  递交是原子的一次交换：成功当刻道具就到对方手里，画面只给一闪交接，没有飞行在途的假承诺。 */
namespace PokemonSkills {
    export interface BestowHeld { id: string; key: string; pokemon: CombatPokemon | null; }
    /** 一名战斗者当前的持有物。宝可梦取携带物、原版生物/玩家取主手/副手，同一原生装备读取路径；空手返回 null。 */
    export function bestowHeldOf(world: CombatWorld, actor: CombatActor): BestowHeld | null {
        var held = NativeItems.heldOf(world, actor);
        return held === null ? null : { id: held.id, key: held.pokemon ? String(held.pokemon.heldKey()) : "", pokemon: held.pokemon };
    }
    function bestowItemKey(id: string): string { return "item." + String(id).replace(":", "."); }
    /** 递交／接收点取身体中心附近的手部高度；不再用「中心再抬 0.6 身高」，那常越过手部甚至头。 */
    function bestowHand(body: CombatObservation): CombatPoint {
        return body.position().plus(WorldCombat.point(0, body.height() * 0.06, 0));
    }

    define({
        id: "bestow",
        cooldownParameter: "recharge",
        name: "传递礼物",
        description: "把自己携带的一件道具交给空手的友方宝可梦、普通生物或玩家。对方已有持物或被查封时无法递送。",
        uses: ["把树果一类道具让给需要的队友", "在开战前把道具交到主力手上", "把自己的道具转交给空手的伙伴"],
        kind: "friend",
        range: 5,
        maxRange: 10,
        prepare: 9,
        active: 0,
        recover: 6,
        cooldown: 85,
        style: "gift",
        defaults: { urgent: false, ai: { maxChase: 12, giftBelow: 1.0, leaveStation: false, autoGift: false, onlyBerries: true } },
        fields: [flag("urgent", "急递")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["bestow"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            var urgent = !!(config && config.urgent);
            return { prepare: Math.round(p("bestow", "tempo", context)),
                recover: Math.round(p("bestow", "aftercast", context)),
                cooldown: Math.round(p("bestow", "recharge", context)) + (urgent ? -2 : 2),
                active: 0, range: p("bestow", "reach", context) };
        },
        ready: function (action) {
            var world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || !world.friendly(target)) return "invalid-target";
            if (String(target.ref()) === String(actor.ref())) return "no-self";
            if (bestowHeldOf(world, actor) === null) return "no-item";
            if (bestowHeldOf(world, target) !== null) return "target-full";
            if (CombatStatus.has(world, target, "embargo")) return "target-sealed";
            var self = world.observe(actor), body = world.observe(target);
            if (self === null || body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("bestow", "reach", action)) return "out-of-range";
            return world.clear(action.origin(), body.position()) ? "" : "no-line";
        },
        windup: function (action, config, prepare) {
            var body = action.sense().observe(action.actor());
            var held = bestowHeldOf(action.sense(), action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:move_bestow:windup", bestowScene, 1, action.origin(), JSON.stringify({
                moment: "windup", scale: scale, item: held ? held.id : "", ribbons: Math.round(p("bestow", "ribbons", action)),
                urgent: config && config.urgent ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world(), caster = action.actor(), target = action.target();
            var body = world.observe(caster);
            if (body === null) { done(action); return; }
            var scale = (body.width() + body.height()) / 2.3;
            var ribbons = Math.max(6, Math.round(p("bestow", "ribbons", action)));
            var motes = Math.max(6, Math.round(p("bestow", "motes", action)));
            var shine = Math.max(6, Math.round(p("bestow", "shine", action)));
            function fizzle(reason: string, point: CombatPoint, text: string): void {
                WorldFeedback.emit(world, bestowScene, 1, point, { moment: reason, scale: scale }, 22);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), text, [], 26);
                sound(action, "minecraft:entity.villager.no");
                done(action);
            }
            if (target === null || !world.valid(target) || !world.friendly(target) || String(target.ref()) === String(caster.ref())) {
                fizzle("empty", action.targetPosition(), bestowRefusedText); return;
            }
            var tbody = world.observe(target);
            if (tbody === null) { fizzle("empty", body.position(), bestowRefusedText); return; }
            var mine = bestowHeldOf(world, caster);
            if (mine === null) { fizzle("empty", body.position(), bestowEmptyText); return; }
            if (bestowHeldOf(world, target) !== null) { fizzle("full", tbody.position(), bestowFullText); return; }
            if (NativeItems.sealed(world, target) || NativeItems.sealed(world, caster)) { fizzle("sealed", tbody.position(), bestowSealedText); return; }
            // 原子移交：一件道具此刻就从施法者手里进到对方手里；没有事后飞行的假承诺，到账与画面同拍。
            if (!NativeItems.exchangeHeld(world, caster, target).ok) {
                fizzle("refused", tbody.position(), bestowRefusedText); return;
            }
            var itemId = mine.id;
            var origin = bestowHand(body), dest = bestowHand(tbody);
            WorldFeedback.emit(world, bestowScene, 1, origin,
                { moment: "offer", target: String(target.ref()), item: itemId, motes: motes, ribbons: ribbons, scale: scale }, 20);
            WorldFeedback.emit(world, bestowScene, 1, dest,
                { moment: "receive", target: String(target.ref()), item: itemId, shine: shine, scale: Math.max(0.6, tbody.height()) }, 26);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 0.7, 0)), bestowGiftText,
                [{ key: bestowItemKey(itemId), fallback: itemId }], 28);
            WorldFeedback.text(world, dest.plus(WorldCombat.point(0, 0.7, 0)), bestowReceiveText,
                [{ key: bestowItemKey(itemId), fallback: itemId }], 30);
            world.sound("minecraft:block.amethyst_block.chime", origin, 16, "{}");
            world.sound("minecraft:entity.item.pickup", dest, 14, "{}");
            done(action);
        },
        indicator: function (config, pokemon) {
            var context: NumberContext = { pokemon: pokemon!, skill: skills["bestow"], detail: { values: config } };
            return { radius: pokemon ? p("bestow", "reach", context) : 5, geometry: "point", style: "gift", color: 0xF2C66A,
                label: config && config.urgent === true ? "传递礼物·急递" : "传递礼物·郑重递" };
        }
    });
}
