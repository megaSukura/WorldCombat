/**
 * 传递礼物 / bestow —— 注册与动作。
 *
 * 念头：把手里那件东西交到空手的伙伴手上——施法者把礼物托起，缎带牵着它沿一条线飞过去，落进它的道具位。
 * 自己空了手，伙伴得到了它。只送出去、不换回来，也不丢弃。
 * 两幕：
 *   起（windup，提交前）：把礼物托到胸前、缎带预展开（只观察、只预告，可被打断且不花代价）。
 *   递（execute，提交后）：礼物贴图沿施法者到伙伴的连线飞过去（统一的原子原生装备事务），
 *     伙伴身上亮起接收的光尘；空手／对方已有道具／对方被查封时落空，各自给出不同的浮字。
 *
 * 道具真的换手：走 equipmentExchange，宝可梦携带物与原版生物/玩家的主副手同一契约，不做任何复制或凭空生成。
 * 只送给空手的伙伴；被查封（world_combat:status/embargo）的目标收不到道具——这是本组两招之间的接口。
 */
namespace PokemonSkills {
    export interface BestowHeld { id: string; key: string; pokemon: CombatPokemon | null; }
    /** 一名战斗者当前的持有物。宝可梦取携带物、原版生物/玩家取主手/副手，同一原生装备读取路径；空手返回 null。 */
    export function bestowHeldOf(world: CombatWorld, actor: CombatActor): BestowHeld | null {
        var held = NativeItems.heldOf(world, actor);
        return held === null ? null : { id: held.id, key: held.pokemon ? String(held.pokemon.heldKey()) : "", pokemon: held.pokemon };
    }
    function bestowItemKey(id: string): string { return "item." + String(id).replace(":", "."); }

    define({
        id: "bestow",
        cooldownParameter: "recharge",
        name: "传递礼物",
        description: "把自己携带的道具交给一个空手的伙伴：礼物沿连线飞过去、落进它的道具位，自己就此空手。对方已有道具、或被查封时递不出去。",
        uses: ["把树果一类道具让给需要的队友", "在开战前把道具交到主力手上", "把自己的道具转交给空手的伙伴"],
        kind: "friend",
        range: 5,
        maxRange: 10,
        prepare: 9,
        active: 0,
        recover: 6,
        cooldown: 85,
        style: "gift",
        defaults: { urgent: false, ai: { maxChase: 12, giftBelow: 1.0, leaveStation: false } },
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
            var glide = Math.max(6, Math.round(p("bestow", "glide", action)));
            var reach = Math.max(1, p("bestow", "reach", action));
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
            if (!NativeItems.exchangeHeld(world, caster, target).ok) {
                fizzle("refused", tbody.position(), bestowRefusedText); return;
            }
            var itemId = mine.id;
            var origin = body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0));
            var dest = tbody.position().plus(WorldCombat.point(0, tbody.height() * 0.6, 0));
            var delta = dest.minus(origin);
            var direction = delta.length() < 0.05 ? aim(action) : delta.unit();
            var flight = action.projectile(origin, direction.scale(Math.max(0.35, delta.length() / Math.max(1, glide))), 0, 0.2, reach, glide + 4,
                function () { }, function () { },
                JSON.stringify({ item: itemId, scale: 1, glow: true, spin: true, pierce: 1, homing: { target: String(target.ref()), turn: 90 } }));
            var path: (string | number[])[] = [String(caster.ref()), String(target.ref())];
            WorldFeedback.emit(world, bestowScene, 1, origin,
                { moment: "offer", target: String(target.ref()), item: itemId, ribbons: ribbons, scale: scale }, 20);
            WorldFeedback.emit(world, bestowScene, 1, origin,
                { moment: "stream", target: String(target.ref()), projectile: flight, path: path, item: itemId,
                    ribbons: ribbons, motes: motes, scale: scale, direction: [direction.x(), direction.y(), direction.z()],
                    reach: Math.max(0.5, Math.min(reach, delta.length() || reach)) }, 26);
            WorldFeedback.emit(world, bestowScene, 1, tbody.position(),
                { moment: "receive", target: String(target.ref()), item: itemId, shine: shine, scale: Math.max(0.6, tbody.height()) }, 26);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), bestowGiftText,
                [{ key: bestowItemKey(itemId), fallback: itemId }], 28);
            WorldFeedback.text(world, tbody.position().plus(WorldCombat.point(0, 1.2, 0)), bestowReceiveText,
                [{ key: bestowItemKey(itemId), fallback: itemId }], 30);
            world.sound("minecraft:block.amethyst_block.chime", origin, 16, "{}");
            world.sound("minecraft:entity.item.pickup", tbody.position(), 14, "{}");
            done(action);
        },
        indicator: function (config, pokemon) {
            var context: NumberContext = { pokemon: pokemon!, skill: skills["bestow"], detail: { values: config } };
            return { radius: pokemon ? p("bestow", "reach", context) : 5, geometry: "point", style: "gift", color: 0xF2C66A,
                label: config && config.urgent === true ? "传递礼物·急递" : "传递礼物·郑重递" };
        }
    });
}
