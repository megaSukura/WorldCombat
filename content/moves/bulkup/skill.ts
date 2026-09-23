/**
 * 健美 / bulkup — 执行组织。
 *
 * 核心念头：一口气把全身绷到极限，身形当场涨起一圈——攻击与防御同时抬起来。它是本族里唯一抬攻击的一招，
 *   也是唯一把两向收益摆在同一个取舍上的：配置「取向」决定这一口气偏向攻击还是偏向防御。
 *
 * 两幕：
 *   绷（windup 播「起势」，提交前只观察与预告，打断不花代价）。
 *   涨（提交后）：NativeEffects.boostWindow 写入公共能力阶梯（物攻 power 级、防御 guard 级），挂上共享身份
 *     world_combat:status/bulkup 的涨身窗口；窗口自己拥有这份等级，结束时只移除自己那一份。
 * 结束：涨身窗口到期或被清除时，记下窗口 id 的记号也一并结束，等级随窗口一起收回。
 */
namespace PokemonSkills {
    const bulkUpScene = "world_combat:move_bulkup";
    const bulkUpSurge = "world_combat:bulkup_surge";
    const bulkUpMark = "world_combat:bulkup_mark";
    const bulkUpBraceText = "world_combat.move.bulkup.text.brace";
    const bulkUpRelaxText = "world_combat.move.bulkup.text.relax";
    /** 表现里的参考半径：`data.scale = 实际涨起半径 / 这个数`。 */
    const bulkUpReferenceRadius = 1.4;

    // 记号：只记这次涨身窗口的 id，窗口结束时按 id 提前结束它（已自然到期则无事发生）。等级账在窗口自己身上。
    WorldCombat.effect(bulkUpMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.window !== "number" || !isFinite(value.window)) throw new Error("Invalid bulk up mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(bulkUpMark, "start", function () { });

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function bulkUpStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }

    define({
        id: "bulkup",
        cooldownParameter: "wait",
        name: "健美",
        description: "提高攻击与防御，可选择偏重进攻或防守。效果结束后收回本次提升。",
        uses: ["开场先涨一轮，把物攻与防御一起垫起来", "压着打时选偏攻，顶着换时选偏守", "在近身拉锯前把两项一起抬起来"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 130,
        style: "bulk",
        stationary: true,
        defaults: { lean: 1, ai: { maxChase: 14, minGap: 3 } },
        fields: [
            field(pathOf("lean"), "取向", "choice", {
                options: [
                    { value: 1, label: "偏攻" },
                    { value: 0, label: "偏守" }
                ],
                help: "偏攻：物攻 +2 级、防御 +1 级，适合压着打；偏守：防御 +2 级、物攻 +1 级，适合顶着换。两向总量相同。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: p("bulkup", "swell", pokemon), geometry: "area", style: "bulk", color: 0xE0603C,
                label: config && Number(config.lean) === 1 ? "健美 · 偏攻" : "健美 · 偏守" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["bulkup"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("bulkup", "tempo", context)),
                recover: Math.round(p("bulkup", "aftercast", context)),
                cooldown: Math.round(p("bulkup", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_bulkup:brace", bulkUpScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", lean: config && Number(config.lean) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const power = Math.max(1, Math.min(2, Math.round(p("bulkup", "power", action))));
            const guard = Math.max(1, Math.min(2, Math.round(p("bulkup", "guard", action))));
            const window = Math.max(120, Math.round(p("bulkup", "window", action)));
            const swell = Math.max(0.6, p("bulkup", "swell", action));
            const sparks = Math.max(12, Math.round(p("bulkup", "sparks", action)));
            const pulses = Math.max(2, Math.min(4, Math.round(p("bulkup", "pulses", action))));
            const scale = swell / bulkUpReferenceRadius;
            const beforeAtk = bulkUpStage(world, actor, "atk"), beforeDef = bulkUpStage(world, actor, "def");
            const windowId = NativeEffects.boostWindow(world, actor, { atk: power, def: guard }, window, "bulkup");
            const attack = Math.max(0, bulkUpStage(world, actor, "atk") - beforeAtk);
            const defence = Math.max(0, bulkUpStage(world, actor, "def") - beforeDef);
            MobEffects.apply(world, actor, bulkUpSurge, window, 0);
            world.effect(bulkUpMark, actor, JSON.stringify({ window: windowId }), window);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, bulkUpScene, 1, feet,
                { moment: "swell", actor: String(actor.ref()), power: attack, guard: defence, sparks: sparks,
                    pulses: pulses, scale: scale, intensity: Math.max(0.8, Math.min(2, sparks / 40)) }, 34);
            WorldFeedback.keep(world, "bulkup:aura:" + String(actor.ref()), bulkUpScene, 1, body.position(),
                { moment: "aura", actor: String(actor.ref()), sparks: sparks, pulses: pulses, scale: scale }, Math.min(window, 220));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), bulkUpBraceText,
                [attack, defence, Math.round(window / 20)], 32);
            world.sound("minecraft:entity.ravager.roar", body.position(), 16, "{}");
            done(action);
        }
    });

    // 涨身窗口到期或被清除：结束记下的涨身窗口，它只收回自己那一份等级。
    WorldCombat.on("world_combat:move_bulkup/relax", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== bulkUpSurge) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const marks = world.effects(actor, bulkUpMark);
        if (marks.length) {
            const mark = JSON.parse(String(marks[0].data()));
            if (typeof mark.window === "number") NativeEffects.windowClose(world, mark.window);
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, bulkUpScene, 1, body.position(), { moment: "relax", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), bulkUpRelaxText, [], 22);
    });
}
