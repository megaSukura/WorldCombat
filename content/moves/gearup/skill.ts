/** 给附近符合传动条件的友方暂时提高攻击和特攻：正电、负电宝可梦，以及铁傀儡或手持金属工具的伙伴。 */
namespace PokemonSkills {
    function gearupStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return NativeEffects.stage(NativeEffects.read(world, actor), stat);
    }
    /** 资格来自当前正负电特性，或普通活体的身体/装备材料。 */
    export function gearupPolarity(world: CombatWorld, actor: CombatActor): string {
        if (!world.valid(actor)) return "";
        if (String(actor.domain()) !== "cobblemon") {
            const type = world.entityType(actor);
            if (type !== null && String(type.id()) === "minecraft:iron_golem") return "metal";
            const equipment = world.equipment(actor);
            for (let i = 0; i < equipment.length; i++) {
                const slot = String(equipment[i].slot());
                if ((slot === "mainhand" || slot === "offhand") && NativeItems.magneticEquipment(equipment[i])) return "metal";
            }
            return "";
        }
        const pokemon = CobblemonCombat.pokemon(actor);
        const name = String(NativeEffects.ability(pokemon, NativeEffects.read(world, actor))).replace("cobblemon:", "").toLowerCase();
        return name === "plus" || name === "minus" ? name : "";
    }
    function gearupQualifies(world: CombatWorld, actor: CombatActor): boolean {
        return gearupPolarity(world, actor) !== "";
    }
    /** 记录这次传动各抬了几级，供收回时照数还原。 */
    WorldCombat.effect(gearupMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.drive !== "number" || !isFinite(value.drive) || typeof value.spark !== "number" || !isFinite(value.spark))
            throw new Error("Invalid gear up mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(gearupMark, "start", function () { });
    WorldCombat.effectHandler(gearupMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 给一个正负电友方挂上传动状态并记录这次抬起的等级；已在身上的人不重复叠加。 */
    function gearupGrant(world: CombatWorld, actor: CombatActor, drive: number, spark: number, ticks: number): boolean {
        if (MobEffects.read(world, actor, gearupEffect) !== null) return false;
        NativeEffects.boost(world, actor, "atk", Math.max(1, Math.min(6, Math.round(drive))));
        NativeEffects.boost(world, actor, "spa", Math.max(1, Math.min(6, Math.round(spark))));
        MobEffects.apply(world, actor, gearupEffect, ticks, 0);
        world.effect(gearupMark, actor, JSON.stringify({ drive: Math.round(drive), spark: Math.round(spark) }), ticks);
        return true;
    }

    // 动力散去、被人解除：按记录把这次抬起的物攻与特攻原样收回（只收当前实际持有的正等级）。
    WorldCombat.on("world_combat:move_gearup/revert", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== gearupEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const views = world.effects(actor, gearupMark);
        let drive = 0, spark = 0;
        if (views.length) {
            const mark = JSON.parse(String(views[0].data()));
            drive = Math.max(0, Math.round(Number(mark.drive) || 0));
            spark = Math.max(0, Math.round(Number(mark.spark) || 0));
            world.operation(views[0].id(), "world_combat:dispel", "{}");
        }
        const lostAtk = Math.min(drive, Math.max(0, gearupStage(world, actor, "atk")));
        const lostSpa = Math.min(spark, Math.max(0, gearupStage(world, actor, "spa")));
        if (lostAtk > 0) NativeEffects.boost(world, actor, "atk", -lostAtk);
        if (lostSpa > 0) NativeEffects.boost(world, actor, "spa", -lostSpa);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, gearupScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 24);
        if (String(data.cause) === "expired") WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), gearupFadeText, [], 22);
    });

    define({
        id: gearupId,
        cooldownParameter: "wait",
        name: "辅助齿轮",
        description: "给附近符合传动条件的友方暂时提高攻击和特攻：正电、负电宝可梦，以及铁傀儡或手持金属工具的伙伴。",
        uses: ["为正负电伙伴、铁傀儡或持金属工具的队友提高攻击", "在近身缠斗前把输出拉起来", "让带正负电特性的队友一起变强"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "gear",
        stationary: true,
        defaults: { steady: 0, ai: { maxChase: 12, pack: 4 } },
        fields: [
            field(pathOf("steady"), "传动", "choice", {
                options: [
                    { value: 1, label: "稳啮" },
                    { value: 0, label: "超速" }
                ],
                help: "稳啮：攻击与特攻各 +1、齿链 ×1.15 宽、运转 ×1.25 久，但起手 +3 刻、冷却 ×1.12；超速：起手与冷却更省，齿链 ×0.8 短、运转更短、等级按本体。"
            })
        ],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[gearupId], detail: { values: config } };
            return { radius: p(gearupId, "chain", context), geometry: "area", style: "gear", color: 0xC8CDD3,
                label: config && Number(config.steady) === 1 ? "辅助齿轮 · 稳啮" : "辅助齿轮 · 超速" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[gearupId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(2, Math.round(p(gearupId, "tempo", context))),
                recover: Math.max(3, Math.round(p(gearupId, "aftercast", context))),
                cooldown: Math.round(p(gearupId, "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_gearup:spin", gearupScene, 1, action.origin(),
                JSON.stringify({ moment: "spin", teeth: Math.round(p(gearupId, "teeth", action)),
                    steady: config && Number(config.steady) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const drive = Math.max(1, Math.min(2, Math.round(p(gearupId, "drive", action))));
            const spark = Math.max(1, Math.min(2, Math.round(p(gearupId, "spark", action))));
            const chain = Math.max(1.2, p(gearupId, "chain", action));
            const ticks = Math.max(120, Math.round(p(gearupId, "runTicks", action)));
            const teeth = Math.max(12, Math.round(p(gearupId, "teeth", action)));
            const scale = chain / gearupReferenceRadius;
            const point = body.position();
            const selfRef = String(actor.ref());
            const linked: string[] = [];
            const actors = world.query(point, chain, false);
            for (let i = 0; i < actors.length; i++) {
                const other = actors[i];
                if (!world.friendly(other) || !gearupQualifies(world, other)) continue;
                const obs = world.observe(other);
                if (obs === null) continue;
                if (!gearupGrant(world, other, drive, spark, ticks)) continue;
                linked.push(String(other.ref()));
                WorldFeedback.emit(world, gearupScene, 1, obs.position(),
                    { moment: "drive", target: String(other.ref()), drive: drive, spark: spark,
                      motes: Math.max(8, Math.round(teeth * 0.5)), scale: scale }, 28);
                WorldFeedback.text(world, obs.position().plus(WorldCombat.point(0, 1.25, 0)), gearupDriveText, [drive, spark], 28);
                if (String(other.ref()) !== selfRef) world.sound("cobblemon:impact.steel", obs.position(), 10, "{}");
            }
            const path: string[] = [];
            for (let i = 0; i < linked.length; i++) { path.push(selfRef); path.push(linked[i]); }
            world.sound("minecraft:block.anvil.hit", point, 14, "{}");
            world.sound("minecraft:block.copper_bulb.turn_on", point, 12, "{}");
            WorldFeedback.emit(world, gearupScene, 1, point,
                { moment: "mesh", radius: chain, teeth: teeth, drive: drive, spark: spark, links: linked.length,
                  path: path, scale: scale }, 40);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.35, 0)), gearupSpinText,
                [drive, spark, linked.length, Math.round(ticks / 20)], 34);
            done(action);
        }
    });
}
