/**
 * 森林诅咒 / forestscurse — 出手方式。
 *
 * 核心念头：给选中的对象保留原有属性、再添上一条草属性——根须只表示那层草，不缠住它、不定它。
 *   敌友都可以指：给敌方是打开火／冰／虫／飞的弱点；给友方是追加草，挡下水／电／草／地面。
 *
 * 幕：
 *   召（windup，提交前）：脚下画出一道叶纹，只观察与预告，可被打断且不花代价。
 *   种（提交后）：根须从地面钻起、叶片从头顶罩下，目标的属性被写进共享 NativeModifiers types 层
 *     （原有属性加一条 grass，到期自动还原原生属性），挂共享身份 `world_combat:status/forestscurse` 的标记。
 *   缠（hold）：一个独立托管效果持有贴身的叶纹层，与原属性的表现并存，直到诅咒褪去。
 *   散（lift）：诅咒到期时叶片从身上落下、叶纹层一起消失。
 *
 * 反制：非宝可梦没有属性；已是草、已到第三属性没有空位、或属性被特性锁定都种不上（预检直接拒绝，不浪费 20 发 PP）。
 *   瞄准是 kind:aim：地面不放种咒区，友方必须明确指定。
 */

namespace PokemonSkills {
    export const forestscurseId = "forestscurse";
    export const forestscurseScene = "world_combat:move_forestscurse";
    export const forestscurseEffect = "world_combat:forest_curse";
    export const forestscurseHoldEffect = "world_combat:forest_curse_hold";
    export const forestscurseCurseText = "world_combat.move.forestscurse.text.curse";
    export const forestscurseLiftText = "world_combat.move.forestscurse.text.lift";
    export const forestscurseNoRoomText = "world_combat.move.forestscurse.text.noroom";
    export const forestscurseFizzleText = "world_combat.move.forestscurse.text.fizzle";
    export const forestscurseEmptyText = "world_combat.move.forestscurse.text.empty";

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

    // 叶纹层：与追加属性同寿命的独立托管效果，自己持有贴身的叶纹表现，和原属性效果并存；
    // 属性层提前被驱散时一并收掉，不留一层空叶纹。
    WorldCombat.effect(forestscurseHoldEffect, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.target !== "string") throw new Error("Invalid forest curse hold: target");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(forestscurseHoldEffect, "start", function (effect) {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(target)) { effect.end(); return; }
        const body = world.observe(target);
        if (body === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "hold", forestscurseScene, 1, body.position(),
            { moment: "hold", target: String(target.ref()), roots: Math.max(6, Math.round(Number(data.roots) || 8)),
                leaves: Math.max(8, Math.round(Number(data.leaves) || 10)), grove: Number(data.grove) || 1.4 });
    });
    WorldCombat.effectHandler(forestscurseHoldEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function forestscurseReleaseHold(world: CombatWorld, target: CombatActor): void {
        const views = world.effects(target, forestscurseHoldEffect);
        for (let index = 0; index < views.length; index++) world.operation(views[index].id(), "world_combat:dispel", "{}");
    }

    // 诅咒到期：叶片从目标身上落下、叶纹层散去。属性层随效果同寿命自动还原。
    WorldCombat.on("world_combat:move_forestscurse/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== forestscurseEffect) return;
        const world = event.world(), target = event.actor();
        forestscurseReleaseHold(world, target);
        if (String(data.cause) !== "expired") return;
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
        description: "向选中的对象种下森林诅咒：保留它原有属性、再追加一条草属性；可给敌方打开弱点，也可给友方添草抗性。根须只是那层草，不会缠住它。",
        uses: ["给对手追加草属性、打开火与冰与虫与飞的弱点", "把水与地面的对手逼出四倍草弱点", "给友方追加草，挡下水／电／草／地面，深根档更久"],
        kind: "aim",
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
            // 地面不种咒区：空点没有对象，直接允许（走落空）。
            if (target === null) return action.targetPosition().minus(action.origin()).length() > action.range() ? "out-of-range" : "";
            if (!world.valid(target)) return "target-left";
            const body = world.observe(target);
            if (body === null) return "target-left";
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
            const self = world.observe(actor);
            const rooted = !!(config && config.rooted);
            const at = target === null ? null : world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();

            if (target === null || at === null) {
                WorldFeedback.emit(world, forestscurseScene, 1, point, { moment: "empty" }, 20);
                WorldFeedback.text(world, forestscurseAbove(point), forestscurseEmptyText, [], 26);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            const refusal = forestscurseRefusal(world, target);
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
            forestscurseReleaseHold(world, target);
            world.effect(forestscurseHoldEffect, target,
                JSON.stringify({ target: String(target.ref()), roots: roots, leaves: leaves, grove: grove }), hold);
            WorldFeedback.emit(world, forestscurseScene, 1, point,
                { moment: "root", target: String(target.ref()), roots: roots, leaves: leaves, grove: grove,
                    path: [String(actor.ref()), String(target.ref())],
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
