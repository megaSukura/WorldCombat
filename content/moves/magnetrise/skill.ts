/**
 * 电磁飘浮 / magnetrise — 执行组织与家族行为。
 *
 * 核心念头：把脚下那块地磁化，用磁场把自己托离地面。身体浮起来之后，地面招式与脚下的地形危害都够不到它，
 *   贴身的敌人还会被同极的磁力弹开一步；磁力耗尽时身体失托落回地面。
 *
 * 出手：短起手（windup 播聚电预告）后提交；只对自己施放。
 * 命中：提交后挂 world_combat:magnetrise_field（身份 magnetrise），并把电弧、半径、悬浮高度、弹力、加速
 *       写进 world_combat:magnetrise_mark；滑翔形态在标记开始时给自己一段移速加成（随效果结束收回）。
 * 持续：存续期由该 MobEffect 承担，每 20 刻 keep 一次脚下电场。
 * 免疫：入场伤害规则里，带 magnetrise 身份者被地面招式与地形危害命中时伤害清零；黑色铁球接地时失效。
 * 弹开：同一规则里，贴地近战敌人在 3.5 格内命中时会被推开 mark.repel 格（每 20 刻至多一次）。
 * 结束：时间走完是磁场自行衰退、身体缓缓落回（settle）；被牛奶/清除是磁力被硬切、身体失托（cut），两幕不同。
 * 反制：黑色铁球、清除效果都能让它失效；射程与冷却照旧。
 */
namespace PokemonSkills {
    function magnetriseAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    function magnetriseMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, magnetriseMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function magnetriseHazards(cause: string): boolean {
        return ["fall", "cactus", "sweetBerryBush", "flyIntoWall"].indexOf(cause) >= 0;
    }
    var magnetriseRepelUntil: { [ref: string]: number } = Object.create(null);

    WorldCombat.effect(magnetriseMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["sparks", "field", "lift", "repel", "glide", "max"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid magnetrise mark: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(magnetriseMark, "start", function (effect) {
        const state = JSON.parse(effect.state());
        const glide = Number(state.glide) || 0;
        if (glide > 0) effect.world().attribute(effect.target(), "minecraft:generic.movement_speed", glide, "add_multiplied_total");
    });
    WorldCombat.effectHandler(magnetriseMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 浮空的兑现点：带磁场的活体被命中时，地面招与地形危害清零；贴地近战敌人被同极弹开。
    NativeEffects.incomingRules.define({ id: "world_combat:move_magnetrise/float", apply: function (hit) {
        const data = hit.data;
        if (!data || !(data.amount > 0) || data.bypassesInvulnerability) return;
        const world = hit.world, holder = hit.target;
        if (!world.valid(holder) || !CombatStatus.has(world, holder, magnetriseStatus)) return;
        const mark = magnetriseMarkOf(world, holder);
        if (mark === null) return;
        // 黑色铁球是 native 的接地物：拿着它，磁力托不起身体。
        if (String(holder.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(holder);
            if (NativeEffects.item(pokemon, NativeEffects.read(world, holder)) === "iron_ball") return;
        }
        const cause = String(data.cause || ""), type = String(data.type || "").toLowerCase();
        if (!(magnetriseHazards(cause) || type === "ground")) return;
        const body = world.observe(holder);
        data.amount = 0;
        if (body !== null) {
            WorldFeedback.emit(world, magnetriseScene, 1, body.position(), { moment: "negate", target: String(holder.ref()), source: cause || "ground" }, 30);
            WorldFeedback.text(world, magnetriseAbove(body.position()), magnetriseNegateText, [], 30);
        }
        // 同极相斥：贴地近战的攻击者被磁力推开一步。
        const attacker = hit.source;
        if (body === null || String(attacker.key()) === String(holder.key())) return;
        const from = world.observe(attacker);
        if (from === null || !from.grounded() || from.position().minus(body.position()).length() > magnetriseContactRange) return;
        const now = world.tick(), ref = String(holder.ref()), until = magnetriseRepelUntil;
        if (now - (until[ref] || -1000) < 20) return;
        until[ref] = now;
        const away = from.position().minus(body.position());
        const push = Number(mark.repel) || 0.4;
        if (away.length() > 0.01) world.displace(attacker, away.unit().scale(push));
        WorldFeedback.emit(world, magnetriseScene, 1, from.position(), { moment: "repel", target: String(holder.ref()), power: push, burst: Math.max(8, Math.round(push / 0.4 * 24)) }, 22);
        WorldFeedback.text(world, magnetriseAbove(from.position()), magnetriseRepelText, [], 24);
        world.sound("minecraft:block.respawn_anchor.charge", from.position(), 12, "{}");
    } });

    define({
        id: magnetriseId,
        name: "电磁飘浮",
        description: "把脚下地面磁化，用磁力把自己托离地面；悬浮期间免疫地面招式与脚下的地形危害，贴身的敌人还会被同极弹开。",
        uses: ["躲开地震、重踏一类地面招", "让贴地的近战敌人够不到自己", "越过陷阱与地形危害"],
        kind: "self",
        range: 1,
        prepare: 12,
        active: 1,
        recover: 6,
        cooldown: 160,
        style: "magnet",
        defaults: { field: "glide" },
        fields: [
            choice("field", "磁场形态", ["glide", "anchor"], ["滑翔", "锚定"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[magnetriseId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const glide = config.field === "glide";
            return {
                prepare: Math.max(4, Math.round(p(magnetriseId, "tempo", context)) + (glide ? -2 : 2)),
                recover: Math.round(p(magnetriseId, "aftercast", context)),
                cooldown: Math.max(60, Math.round(p(magnetriseId, "recharge", context) * (glide ? 0.85 : 1.15))),
                range: 1,
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_magnetrise:windup", magnetriseScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", glide: config.field === "glide" ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) { return { radius: 1.2, geometry: "circle", style: "magnet", color: 0xFFD54A,
            label: config && config.field === "anchor" ? "锚定悬浮" : "滑翔悬浮" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const glideOn = config.field === "glide";
            const duration = Math.max(60, Math.round(p(magnetriseId, "hoverTicks", action) * (glideOn ? 0.8 : 1.25)));
            const radius = Math.max(0.4, p(magnetriseId, "fieldRadius", action) * (glideOn ? 1 : 1.15));
            const lift = Math.max(0.15, p(magnetriseId, "liftHeight", action));
            const sparks = Math.max(1, Math.round(p(magnetriseId, "sparks", action)));
            const repel = Math.max(0.1, p(magnetriseId, "repel", action) * (glideOn ? 0.7 : 1.4));
            const glide = glideOn ? p(magnetriseId, "glide", action) * 1.35 : 0;
            MobEffects.apply(world, actor, magnetriseEffect, duration, 0);
            world.effect(magnetriseMark, actor, JSON.stringify({ sparks: sparks, field: radius, lift: lift, repel: repel, glide: glide, max: duration }), duration);
            sound(action, "minecraft:block.conduit.activate");
            if (body !== null) {
                WorldFeedback.emit(world, magnetriseScene, 1, body.position(),
                    { moment: "lift", target: String(actor.ref()), sparks: sparks, field: radius, lift: lift,
                        scale: Math.max(0.6, Math.min(2, radius / 0.7)) }, 42);
                WorldFeedback.text(world, magnetriseAbove(body.position()), magnetriseLiftText, [Math.round(duration / 20)], 42);
            }
            done(action);
        }
    });

    // 悬浮存续期：每 20 刻续一次脚下电场，低密度贴在脚底，让出目标本体视线。
    WorldCombat.on("world_combat:move_magnetrise/hover", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== magnetriseEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const mark = magnetriseMarkOf(world, actor);
        if (mark === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_magnetrise/hover/" + String(actor.ref()), magnetriseScene, 1, body.position(),
            { moment: "hover", target: String(actor.ref()), sparks: mark.sparks, field: mark.field, lift: mark.lift,
                scale: Math.max(0.6, Math.min(2, (Number(mark.field) || 0.7) / 0.7)) }, 40);
    });

    // 走完自己的时间与被外力切断是两条岔路：到期是磁场自行衰退、身体缓缓落回；被清除是磁力被硬切、失托落下。
    WorldCombat.on("world_combat:move_magnetrise/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== magnetriseEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const expired = String(data.cause) === "expired";
        const views = world.effects(actor, magnetriseMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, magnetriseScene, 1, body.position(),
            { moment: expired ? "settle" : "cut", target: String(actor.ref()), expired: expired ? 1 : 0 }, 30);
        WorldFeedback.text(world, magnetriseAbove(body.position()), expired ? magnetriseSettleText : magnetriseCutText, [], 30);
        world.sound(expired ? "minecraft:block.beacon.deactivate" : "minecraft:block.conduit.deactivate", body.position(), 12, "{}");
    });
}
