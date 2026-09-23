/**
 * 意念移物 / telekinesis —— 执行组织与浮空行为。
 *
 * 核心念头：用念力把对手整个人抬离地面，悬在半空；它脚下没有地、身体不能自主，悬着的这几秒里任人摆布。
 *
 * 三幕：
 *   抬手（windup，提交前）：念力在目标脚下聚拢、把它的身体描亮，只播预告，可被打断且不花代价。
 *   离地（hoist，提交后）：给目标挂共享身份 world_combat:status/telekinesis 的真实 MobEffect，并另存一枚机读
 *     记号（环数、压制程度、施术者）；记号存续期间压掉目标一大部分移动速度——它挪不动，也就不容易躲开攻击。
 *   落地（settle／cut）：时间走完是念力自行松开、身体缓缓落回（settle）；被牛奶/清除效果或击落类招式打断是
 *     念力被硬切、身体失托落下（cut）。两条岔路画面不同。
 *
 * 免疫：入场伤害规则里，带 telekinesis 身份者被地面招式与地形危害命中时伤害清零，与电磁飘浮同一套规则；
 *   因此它也是「地面招打不到」这个共享读法的一员，击落（smackdown）会把它从目标身上拔掉。
 * 反制：已被击落（smackdown）或扎根（ingrain）的目标提不起来，`ready` 直接拒绝；地鼠一族等无法离地的物种
 *   同样拒绝，不浪费 PP。
 */
namespace PokemonSkills {
    const telekinesisScene = "world_combat:move_telekinesis";
    const telekinesisField = "world_combat:telekinesis_field";
    const telekinesisMark = "world_combat:telekinesis_mark";
    const telekinesisStatus = "telekinesis";
    const telekinesisHoistText = "world_combat.move.telekinesis.text.hoist";
    const telekinesisSettleText = "world_combat.move.telekinesis.text.settle";
    const telekinesisCutText = "world_combat.move.telekinesis.text.cut";
    const telekinesisNegateText = "world_combat.move.telekinesis.text.negate";
    /** 无法被抬离地面的物种（原生 telekinesis 的固定名单）。 */
    const telekinesisBurrowers = ["diglett", "dugtrio", "palossand", "sandygast"];
    function telekinesisHazards(cause: string): boolean {
        return ["fall", "cactus", "sweetBerryBush", "flyIntoWall"].indexOf(cause) >= 0;
    }

    WorldCombat.effect(telekinesisMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["rings", "hold", "max"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid telekinesis mark: " + key);
        });
        if (typeof value.cast !== "string") throw new Error("Invalid telekinesis mark: cast");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    // 压制落在具体属性上：悬空期间挪不动，随记号效果结束自动收回。
    WorldCombat.effectHandler(telekinesisMark, "start", function (effect) {
        const state = JSON.parse(effect.state());
        const hold = Math.max(0, Math.min(0.95, Number(state.hold) || 0));
        if (hold > 0) effect.world().attribute(effect.target(), "minecraft:generic.movement_speed", -hold, "add_multiplied_total");
    });
    WorldCombat.effectHandler(telekinesisMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 浮空的兑现点：带 telekinesis 的活体被地面招或地形危害命中时伤害清零，与电磁飘浮同一套入场规则。
    NativeEffects.incomingRules.define({ id: "world_combat:move_telekinesis/float", apply: function (hit) {
        const data = hit.data;
        if (!data || !(data.amount > 0) || data.bypassesInvulnerability) return;
        const world = hit.world, holder = hit.target;
        if (!world.valid(holder) || !CombatStatus.has(world, holder, telekinesisStatus)) return;
        const cause = String(data.cause || ""), type = String(data.type || "").toLowerCase();
        if (!(telekinesisHazards(cause) || type === "ground")) return;
        const body = world.observe(holder);
        data.amount = 0;
        if (body === null) return;
        WorldFeedback.emit(world, telekinesisScene, 1, body.position(), { moment: "negate", target: String(holder.ref()), source: cause || "ground" }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), telekinesisNegateText, [], 30);
    } });

    define({
        id: "telekinesis",
        cooldownParameter: "recharge",
        name: "意念移物",
        description: "用念力把一名对手抬离地面悬在半空：悬空期间它挪不动、躲不开，地面招式与地形危害也够不到它。",
        uses: ["把要跑的对手钉在半空集火", "让地面招式打不到它（也保护它免受地面招）", "给队友和自己的攻击创造必中的几秒"],
        kind: "enemy",
        range: 7,
        maxRange: 13,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "lift",
        defaults: { pin: false, ai: { maxChase: 13, requireGrounded: true, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["telekinesis"], detail: { values: config } };
            return { radius: p("telekinesis", "reach", context), geometry: "line", style: "lift", color: 0x8A5CF0,
                label: config && config.pin === true ? "意念移物 · 压住" : "意念移物" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["telekinesis"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("telekinesis", "tempo", context)),
                recover: Math.round(p("telekinesis", "aftercast", context)),
                cooldown: Math.round(p("telekinesis", "recharge", context)),
                active: 1,
                range: p("telekinesis", "reach", context)
            };
        },
        ready: function (action, _config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.key()) === String(actor.key())) return "invalid-target";
            if (CombatStatus.has(world, target, telekinesisStatus)) return "already-lifted";
            if (CombatStatus.has(world, target, "smackdown") || CombatStatus.has(world, target, "ingrain")) return "anchored";
            if (String(target.domain()) === "cobblemon") {
                const species = String(CobblemonCombat.pokemon(target).species()).replace("cobblemon:", "");
                if (telekinesisBurrowers.indexOf(species) >= 0) return "cannot-lift";
            }
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("telekinesis", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return "";
        },
        windup: function (action, _config, prepare) {
            const actor = action.actor(), target = action.target();
            action.present("world_combat:telekinesis:gather", telekinesisScene, 1, action.origin(), JSON.stringify({
                moment: "gather", target: target === null ? "" : String(target.ref()),
                path: target === null ? [String(actor.ref())] : [String(actor.ref()), String(target.ref())],
                rings: p("telekinesis", "rings", action)
            }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (target === null || !world.valid(target) || body === null || world.friendly(target)
                || CombatStatus.has(world, target, telekinesisStatus)) { done(action); return; }
            const window = Math.max(20, Math.round(p("telekinesis", "window", action)));
            const hold = Math.max(0.2, Math.min(0.95, p("telekinesis", "hold", action)));
            const rings = Math.max(4, Math.round(p("telekinesis", "rings", action)));
            MobEffects.apply(world, target, telekinesisField, window, 0);
            world.effect(telekinesisMark, target, JSON.stringify({ rings: rings, hold: hold, max: window, cast: String(actor.ref()) }), window + 60);
            const targetBody = world.observe(target);
            const point = targetBody === null ? body.position() : targetBody.position();
            WorldFeedback.emit(world, telekinesisScene, 1, point,
                { moment: "hoist", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                    rings: rings, hold: hold, scale: Math.max(0.6, Math.min(2, rings / 10)),
                    intensity: Math.max(0.7, Math.min(2, hold + 0.4)) }, 40);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), telekinesisHoistText, [Math.round(window / 20)], 40);
            sound(action, "minecraft:entity.shulker.teleport");
            if (targetBody !== null) world.sound("minecraft:block.beacon.activate", targetBody.position(), 16, "{}");
            done(action);
        }
    });

    // 悬空存续期：每 20 刻续一次目标身上升起的念力环，让玩家读出现在还悬着、还剩多久。
    WorldCombat.on("world_combat:move_telekinesis/hover", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== telekinesisField) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const views = world.effects(actor, telekinesisMark);
        if (!views.length) return;
        const mark = JSON.parse(String(views[0].data()));
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_telekinesis/hover/" + String(actor.ref()), telekinesisScene, 1, body.position(),
            { moment: "hover", target: String(actor.ref()), path: [String(mark.cast), String(actor.ref())],
                rings: Math.max(3, Math.round((Number(mark.rings) || 8) / 2)), remaining: views[0].remaining() }, 40);
    });

    // 走完自己的时间与被外力切断是两条岔路：到期是念力自行松开、身体缓缓落回；被清除是被硬切、失托落下。
    WorldCombat.on("world_combat:move_telekinesis/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== telekinesisField) return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target)) return;
        const expired = String(data.cause) === "expired";
        const views = world.effects(target, telekinesisMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, telekinesisScene, 1, body.position(),
            { moment: expired ? "settle" : "cut", target: String(target.ref()), expired: expired ? 1 : 0 }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), expired ? telekinesisSettleText : telekinesisCutText, [], 30);
        world.sound(expired ? "minecraft:block.beacon.deactivate" : "minecraft:block.conduit.deactivate", body.position(), 12, "{}");
    });
}
