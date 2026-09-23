/** 森林诅咒：给目标追加草属性；根须、树冠与解除时的落叶承载诅咒表现。 */

namespace PokemonSkills {
    export const forestscurseId = "forestscurse";
    export const forestscurseScene = "world_combat:move_forestscurse";
    export const forestscurseEffect = "world_combat:forest_curse";
    export const forestscurseCurseText = "world_combat.move.forestscurse.text.curse";
    export const forestscurseLiftText = "world_combat.move.forestscurse.text.lift";
    export const forestscurseNoRoomText = "world_combat.move.forestscurse.text.noroom";
    export const forestscurseFizzleText = "world_combat.move.forestscurse.text.fizzle";

    function forestscurseAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.3, 0)); }

    /** 目标当前生效的属性（含临时层）；非宝可梦返回空。 */
    function forestscurseTypes(world: CombatWorld, target: CombatActor): string[] {
        if (String(target.domain()) !== "cobblemon" || !world.valid(target)) return [];
        return NativeEffects.types(CobblemonCombat.pokemon(target), NativeEffects.read(world, target));
    }

    /** 能不能种：非宝可梦没有属性；已有草属性、或已到第三属性仍没有空位都种不上。返回拒绝原因或空串。 */
    function forestscurseRefusal(world: CombatWorld, target: CombatActor): string {
        const types = forestscurseTypes(world, target);
        if (types.length === 0) return "no-types";
        if (types.indexOf("grass") >= 0) return "already-grass";
        if (NativeModifiers.typeLocked(world, target)) return "type-locked";
        // The temporary type layer can hold the native two plus one appended type, so dual-type targets qualify.
        return types.length >= 3 ? "no-room" : "";
    }

    // 诅咒到期：叶片从目标身上落下。属性层随效果同寿命自动还原。
    WorldCombat.on("world_combat:move_forestscurse/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== forestscurseEffect) return;
        if (String(data.cause) !== "expired") return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target)) return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, forestscurseScene, 1, body.position(), { moment: "lift", target: String(target.ref()) }, 26);
        WorldFeedback.text(world, forestscurseAbove(body.position()), forestscurseLiftText, [], 28);
        world.sound("minecraft:block.grass.break", body.position(), 12, "{}");
    });

    define({
        id: forestscurseId,
        cooldownParameter: "recharge",
        name: "森林诅咒",
        description: "向对手种下森林诅咒：根须缠住目标，给它追加草属性；只对还能追加一条属性、且非草的宝可梦生效。",
        uses: ["给对手追加草属性、打开火与冰与虫与飞的弱点", "把水与地面的对手逼出四倍草弱点", "深根档让草属性诅咒持续更久"],
        kind: "enemy",
        range: 6,
        maxRange: 12,
        prepare: 10,
        active: 1,
        recover: 7,
        cooldown: 96,
        style: "curse",
        defaults: { rooted: false },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[forestscurseId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(forestscurseId, "tempo", context)),
                recover: Math.round(p(forestscurseId, "aftercast", context)),
                cooldown: Math.round(p(forestscurseId, "recharge", context)),
                active: 1,
                range: p(forestscurseId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[forestscurseId], detail: { values: config } };
            return { radius: p(forestscurseId, "reach", context), geometry: "line", style: "curse", color: 0x5FA83C,
                label: config && config.rooted === true ? "森林诅咒 · 深根" : "森林诅咒" };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p(forestscurseId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return forestscurseRefusal(world, target);
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_forestscurse:sign", forestscurseScene, 1, action.origin(),
                JSON.stringify({ moment: "sign", rooted: config && config.rooted === true ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor), at = target === null ? null : world.observe(target);
            if (target === null || !world.valid(target) || self === null || at === null) { done(action); return; }
            const rooted = !!(config && config.rooted);
            const refusal = forestscurseRefusal(world, target);
            const point = at.position();
            if (refusal) {
                WorldFeedback.emit(world, forestscurseScene, 1, point, { moment: "fizzle", target: String(target.ref()), reason: refusal }, 20);
                WorldFeedback.text(world, forestscurseAbove(point),
                    refusal === "no-room" || refusal === "already-grass" ? forestscurseNoRoomText : forestscurseFizzleText, [], 28);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            const hold = Math.max(60, Math.round(p(forestscurseId, "hold", action)));
            const roots = Math.max(8, Math.round(p(forestscurseId, "roots", action)));
            const leaves = Math.max(10, Math.round(p(forestscurseId, "leaves", action)));
            const grove = Math.max(1.2, p(forestscurseId, "grove", action));
            const types = forestscurseTypes(world, target).concat(["grass"]);
            NativeModifiers.apply(world, target, { types: types }, hold);
            MobEffects.apply(world, target, forestscurseEffect, hold, rooted ? 1 : 0);
            WorldFeedback.emit(world, forestscurseScene, 1, point,
                { moment: "root", target: String(target.ref()), roots: roots, leaves: leaves, grove: grove,
                    scale: Math.max(0.6, Math.min(2.2, grove / 1.6)), intensity: Math.max(0.7, Math.min(2, hold / 260)) }, 40);
            WorldFeedback.emit(world, forestscurseScene, 1, point.plus(WorldCombat.point(0, 1.6, 0)),
                { moment: "canopy", target: String(target.ref()), leaves: leaves, grove: grove,
                    scale: Math.max(0.6, Math.min(2.2, grove / 1.6)) }, 40);
            WorldFeedback.text(world, forestscurseAbove(point), forestscurseCurseText, [], 32);
            sound(action, "cobblemon:move.leafstorm.actor");
            world.sound("minecraft:block.moss.place", point, 14, "{}");
            world.sound("minecraft:entity.evoker.cast_spell", point, 12, "{}");
            done(action);
        }
    });
}
