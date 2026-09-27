/**
 * 健美 / bulkup — 执行组织。
 *
 * 核心念头：一口气把全身绷到极限，把力气与防御同时提起来。它是本族里唯一抬攻击的一招，
 *   也是唯一把两向收益摆在同一个取舍上的：配置「取向」决定这一口气偏向攻击还是偏向防御。
 *
 * 两幕：
 *   绷（windup 播「起势」，提交前只观察与预告，打断不花代价）。
 *   涨（提交后）：NativeEffects.boostWindow 写入公共能力阶梯（物攻 power 级、防御 guard 级），
 *     窗口归属共享身份 world_combat:status/bulkup 的 surge 载体；窗口自己拥有这份等级，
 *     结束时只移除自己那一份，重施按同一载体的叠加约定刷新，不留下孤儿 mark。
 * 结束：surge 到期或被清除时，窗口随载体一起收回；这里只收尾表现。
 */
namespace PokemonSkills {
    const bulkUpScene = "world_combat:move_bulkup";
    const bulkUpSurge = "world_combat:bulkup_surge";
    const bulkUpBraceText = "world_combat.move.bulkup.text.brace";
    const bulkUpRelaxText = "world_combat.move.bulkup.text.relax";
    /** 表现里的参考半径：`data.scale = 实际涨起半径 / 这个数`。 */
    const bulkUpReferenceRadius = 1.4;

    /** 本来源窗口在某个窗口 id 上交出的物攻/防御级数；窗口已关闭时返回 0。 */
    function bulkUpWindowStages(world: CombatWorld, actor: CombatActor, windowId: number): { atk: number; def: number } {
        const definitions = ["cobblemon_world_combat:modifier", "world_combat:stages_window"];
        for (let i = 0; i < definitions.length; i++) {
            const views = world.effects(actor, definitions[i]);
            for (let j = 0; j < views.length; j++) {
                if (views[j].id() !== windowId) continue;
                const value = JSON.parse(String(views[j].data()));
                return { atk: value && value.stages && value.stages.atk ? value.stages.atk : 0,
                    def: value && value.stages && value.stages.def ? value.stages.def : 0 };
            }
        }
        return { atk: 0, def: 0 };
    }

    define({
        id: "bulkup",
        cooldownParameter: "wait",
        name: "健美",
        description: "绷紧全身提高攻击与防御，可选择偏重进攻或防守。效果结束后收回本次提升。",
        uses: ["开场先绷紧一轮，把物攻与防御一起垫起来", "压着打时选偏攻，顶着换时选偏守", "在近身拉锯前把两项一起抬起来"],
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
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const leanPower = !(config && Number(config.lean) === 0);
            const power = Math.max(1, Math.min(2, Math.round(p("bulkup", "power", action))));
            const guard = Math.max(1, Math.min(2, Math.round(p("bulkup", "guard", action))));
            const window = Math.max(120, Math.round(p("bulkup", "window", action)));
            const swell = Math.max(0.6, p("bulkup", "swell", action));
            const sparks = Math.max(12, Math.round(p("bulkup", "sparks", action)));
            const pulses = Math.max(2, Math.min(4, Math.round(p("bulkup", "pulses", action))));
            const scale = swell / bulkUpReferenceRadius;
            // 窗口归属 surge 载体：到期/被清除时只收回本次实际贡献；重施按 previous 归拢到同一窗口。
            const previous = MobEffects.read(world, actor, bulkUpSurge);
            const carrier = MobEffects.apply(world, actor, bulkUpSurge, window, 0);
            if (carrier === null) { done(action); return; }
            const windowId = NativeEffects.boostWindow(world, actor, { atk: power, def: guard }, carrier.duration(),
                "world_combat:move/bulkup", carrier, previous);
            if (!windowId) { world.removeMobEffect(actor, carrier.id(), carrier.key()); done(action); return; }
            const delivered = bulkUpWindowStages(world, actor, windowId);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, bulkUpScene, 1, feet,
                { moment: leanPower ? "swell_power" : "swell_guard", actor: String(actor.ref()),
                    power: delivered.atk, guard: delivered.def, sparks: sparks, pulses: pulses, scale: scale,
                    lean: leanPower ? 1 : 0, intensity: Math.max(0.8, Math.min(2, sparks / 40)) }, 34);
            // 持续表现绑在真实窗口上：刷新跟最新窗口走，到期/驱散由它自己收回，不再另开定时发射。
            WorldFeedback.onEffect(world, windowId, "bulkup:aura", bulkUpScene, 1, body.position(),
                { moment: "aura", actor: String(actor.ref()), sparks: sparks, scale: scale, lean: leanPower ? 1 : 0 });
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), bulkUpBraceText,
                [delivered.atk, delivered.def, Math.round(window / 20)], 32);
            world.sound("minecraft:entity.ravager.roar", body.position(), 16, "{}");
            done(action);
        }
    });

    // surge 到期或被清除：窗口随载体自行收回，这里只播松劲与浮字。
    WorldCombat.on("world_combat:move_bulkup/relax", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== bulkUpSurge) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新/替换时旧应用被移除而新应用仍在：不是真的结束。
        if (MobEffects.read(world, actor, bulkUpSurge) !== null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, bulkUpScene, 1, body.position(), { moment: "relax", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), bulkUpRelaxText, [], 22);
    });
}
