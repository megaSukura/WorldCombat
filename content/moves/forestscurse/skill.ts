/**
 * 森林诅咒 / forestscurse — 出手方式。
 *
 * 核心念头：给选中的对象保留原有属性、再添上一条草属性——根须只表示那层草，不缠住它、不定它。
 *   敌友都可以指：给敌方是打开火／冰／虫／飞的弱点；给友方是追加草，挡下水／电／草／地面。
 *
 * 幕：
 *   召（windup，提交前）：脚下画出一道叶纹，只观察与预告，可被打断且不花代价。
 *   种（提交后）：根须从脚底钻起、叶片从体顶罩下；属性通过通用 CombatTypes 层追加一条 grass
 *     （读取目标当前有效类型，含其他临时层；普通生物同样适用），并绑定真实的 forest_curse 载体：
 *     载体被驱散或到期时类型层随之收束，不留空叶纹。
 *   缠（hold）：贴身的叶纹层由那次类型层效果持有，与目标原有属性的表现并存，直到诅咒褪去。
 *   散（lift）：诅咒自然到期时叶片从身上落下。
 *
 * 反制：已是草、已到第三属性没有空位、或属性被特性锁定都种不上（预检直接拒绝，不浪费 20 发 PP）。
 *   瞄准是 kind:aim：地面不放种咒区，友方必须明确指定。
 */
namespace PokemonSkills {
    export const forestscurseId = "forestscurse";
    export const forestscurseScene = "world_combat:move_forestscurse";
    export const forestscurseEffect = "world_combat:forest_curse";
    export const forestscurseCurseText = "world_combat.move.forestscurse.text.curse";
    export const forestscurseLiftText = "world_combat.move.forestscurse.text.lift";
    export const forestscurseNoRoomText = "world_combat.move.forestscurse.text.noroom";
    export const forestscurseFizzleText = "world_combat.move.forestscurse.text.fizzle";
    export const forestscurseEmptyText = "world_combat.move.forestscurse.text.empty";

    function forestscurseAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.3, 0)); }

    /** 目标当前生效的属性（含临时层与其他来源）；普通与非宝可梦生物同样返回其有效类型。 */
    function forestscurseTypes(world: CombatWorld, target: CombatActor): string[] {
        return world.valid(target) ? PokemonDamage.combatants.read(world, target).types : [];
    }

    /** 脚底落点：从目标脚下探到最近的地面格，空中目标退回脚下。 */
    function forestscurseFoot(world: CombatWorld, body: CombatObservation): CombatPoint {
        return WorldGeometry.ground(world, body.position().minus(WorldCombat.point(0, body.height() / 2, 0)), 3);
    }

    /** 能不能种：已有草属性、属性被锁定、或已到第三条仍没有空位都种不上。返回拒绝原因或空串。 */
    function forestscurseRefusal(world: CombatWorld, target: CombatActor): string {
        const types = forestscurseTypes(world, target);
        if (types.indexOf("grass") >= 0) return "already-grass";
        if (NativeModifiers.typeLocked(world, target)) return "type-locked";
        // 临时类型层容纳原生两条再加一条；已是三条时不再追加。
        return types.length >= 3 ? "no-room" : "";
    }

    // 诅咒自然到期：叶片从目标身上落下。属性层随载体收束，叶纹层随之消失。
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
        description: "向选中的对象种下森林诅咒：保留它原有属性、再追加一条草属性；可给敌方打开弱点，也可给友方添草抗性。根须只是那层草，不会缠住它。",
        uses: ["给对手追加草属性、打开火与冰与虫与飞的弱点", "给水或地面的对手添草：多出冰、虫、飞的弱点，原本的草弱点从四倍降到两倍", "给友方追加草，挡下水、电、草与地面，深根档更久"],
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
            const scale = Math.max(0.6, Math.min(2.2, grove / 1.6));
            // 真实载体承载草层与叶纹：驱散/到期时 CombatTypes 层与贴身表现一起收束。
            const carrier = MobEffects.apply(world, target, forestscurseEffect, hold, rooted ? 1 : 0);
            if (carrier === null) {
                WorldFeedback.emit(world, forestscurseScene, 1, point, { moment: "fizzle", target: String(target.ref()), reason: "carrier" }, 20);
                WorldFeedback.text(world, forestscurseAbove(point), forestscurseFizzleText, [], 28);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            const layer = CombatTypes.apply(world, target, { operation: "add", types: ["grass"] }, carrier);
            if (layer <= 0) {
                world.removeMobEffect(target, forestscurseEffect, carrier.key());
                WorldFeedback.emit(world, forestscurseScene, 1, point, { moment: "fizzle", target: String(target.ref()), reason: "layer" }, 20);
                WorldFeedback.text(world, forestscurseAbove(point), forestscurseFizzleText, [], 28);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            const foot = forestscurseFoot(world, at);
            const top = at.position().plus(WorldCombat.point(0, at.height() / 2 + 0.15, 0));
            WorldFeedback.onEffect(world, layer, "hold", forestscurseScene, 1, point,
                { moment: "hold", target: String(target.ref()), roots: roots, leaves: leaves, grove: grove });
            // 根须从脚底生、树冠落在体顶；半径只由 grove 决定，scale 只缩放粒子尺寸。
            WorldFeedback.emit(world, forestscurseScene, 1, foot,
                { moment: "root", target: String(target.ref()), roots: roots, leaves: leaves, grove: grove, scale: scale }, 40);
            WorldFeedback.emit(world, forestscurseScene, 1, top,
                { moment: "canopy", target: String(target.ref()), leaves: leaves, grove: grove, scale: scale }, 40);
            WorldFeedback.text(world, forestscurseAbove(point), forestscurseCurseText, [], 32);
            sound(action, "cobblemon:move.leafstorm.actor");
            world.sound("minecraft:block.moss.place", foot, 14, "{}");
            world.sound("minecraft:entity.evoker.cast_spell", point, 12, "{}");
            done(action);
        }
    });
}
