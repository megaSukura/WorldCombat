/**
 * 磁场操控 / magneticflux —— 执行组织与结算。
 *
 * 核心念头：施法者把自己压成一个磁极，在原地立起一片磁场；一圈磁力线绞出、咬住站在场里的
 *   正电／负电伙伴，在它们身上缠出极光护层，防御与特防一起抬起来。离开磁场，磁力就散。
 *
 * 三幕：
 *   起 `charge`（windup，提交前）：身体压低、周身的电屑向内绞，只播预告，可被打断、不花代价。
 *   场 `pulse`（提交后）：落点开一片场地规则 `world_combat:magneticflux_aura`，寿命 `fieldTicks`；
 *     磁场每 5 刻扫一遍——站在场里的正电／负电**友方**（含施法者本身）各抬一次防御与特防，
 *     并挂上共享身份 `world_combat:status/magnetized` 的磁场状态。
 *   散 `fade`：离开磁场、磁场到期或被清除时，本单元抬起的防御与特防按记录原样收回。
 *
 * 与同族分开：鲜花防守一次推开、护所有草属性；磁场操控是留在原地的一片磁场，只咬带正负电特性的自己人。
 */
namespace PokemonSkills {
    function magneticfluxStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return NativeEffects.stage(NativeEffects.read(world, actor), stat);
    }
    /** 现行特性（含被层改写或压制的），去掉命名空间后比正电／负电。 */
    function magneticfluxPolarity(world: CombatWorld, actor: CombatActor): string {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return "";
        const pokemon = CobblemonCombat.pokemon(actor);
        const name = String(NativeEffects.ability(pokemon, NativeEffects.read(world, actor))).replace("cobblemon:", "").toLowerCase();
        return name === "plus" || name === "minus" ? name : "";
    }
    function magneticfluxQualifies(world: CombatWorld, actor: CombatActor): boolean {
        return magneticfluxPolarity(world, actor) !== "";
    }
    /** 记录这次磁场各抬了几级，供收回时照数还原。 */
    WorldCombat.effect(magneticfluxLink, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.guard !== "number" || !isFinite(value.guard) || typeof value.ward !== "number" || !isFinite(value.ward))
            throw new Error("Invalid magnetic flux link");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(magneticfluxLink, "start", function () { });
    WorldCombat.effectHandler(magneticfluxLink, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 给一个正负电友方上磁场状态并记录这次抬起的等级；已在身上的人不重复叠加。 */
    function magneticfluxGrant(world: CombatWorld, actor: CombatActor, guard: number, ward: number, ticks: number): boolean {
        if (MobEffects.read(world, actor, magneticfluxEffect) !== null) return false;
        NativeEffects.boost(world, actor, "def", Math.max(1, Math.min(6, Math.round(guard))));
        NativeEffects.boost(world, actor, "spd", Math.max(1, Math.min(6, Math.round(ward))));
        MobEffects.apply(world, actor, magneticfluxEffect, ticks, 0);
        world.effect(magneticfluxLink, actor, JSON.stringify({ guard: Math.round(guard), ward: Math.round(ward) }), ticks);
        return true;
    }
    function magneticfluxRevoke(world: CombatWorld, actor: CombatActor): void {
        MobEffects.consume(world, actor, magneticfluxEffect);
    }
    /** 磁场每一遍扫描：只有正负电特性的友方（自己也算）被咬住。 */
    function magneticfluxLinkActor(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        if (!magneticfluxQualifies(world, actor) || !world.friendly(actor)) { magneticfluxRevoke(world, actor); return; }
        const body = world.observe(actor);
        if (body === null) return;
        const data: any = field.data || {};
        const guard = Math.max(1, Math.min(2, Math.round(Number(data.guard) || 1)));
        const ward = Math.max(1, Math.min(2, Math.round(Number(data.ward) || 1)));
        const ticks = Math.max(60, Math.round(Number(data.ticks) || 260));
        const radius = Number(data.radius) || magneticfluxReferenceRadius;
        const motes = Math.max(8, Math.round(Number(data.motes) || 22));
        const scale = Math.max(0.5, Math.min(2, radius / magneticfluxReferenceRadius));
        const ref = String(actor.ref());
        if (magneticfluxGrant(world, actor, guard, ward, ticks)) {
            WorldFeedback.emit(world, magneticfluxScene, 1, body.position(),
                { moment: "link", target: ref, guard: guard, ward: ward, motes: motes,
                  polarity: magneticfluxPolarity(world, actor), scale: scale }, 28);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), magneticfluxLinkText, [guard, ward], 28);
            world.sound("cobblemon:impact.electric", body.position(), 12, "{}");
        }
        WorldFeedback.keep(world, "world_combat:move_magneticflux/link/" + ref, magneticfluxScene, 1, body.position(),
            { moment: "held", target: ref, guard: guard, ward: ward, motes: Math.max(4, Math.round(motes * 0.4)), scale: scale }, 30);
    }
    /** 磁场还在时，让磁环持续可见——环本身画出的就是范围。 */
    function magneticfluxSustain(world: CombatWorld, field: WorldEffects.Field): void {
        const data: any = field.data || {};
        const radius = Number(data.radius) || magneticfluxReferenceRadius;
        const point = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
        WorldFeedback.keep(world, "world_combat:move_magneticflux/aura", magneticfluxScene, 1, point,
            { moment: "field", radius: radius, motes: Math.max(6, Math.round((Number(data.motes) || 22) * 0.4)),
              scale: Math.max(0.5, Math.min(2, radius / magneticfluxReferenceRadius)) }, 30);
    }

    WorldEffects.fieldRule(magneticfluxRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field) { magneticfluxLinkActor(world, actor, field); },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field) { magneticfluxLinkActor(world, actor, field); },
        leave: function (world: CombatWorld, actor: CombatActor) { magneticfluxRevoke(world, actor); },
        scan: function (_effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field) { magneticfluxSustain(world, field); }
    });

    // 磁场散去、被人解除，或被离场收回：按记录把这次抬起的防御与特防原样收回（只收当前实际持有的正等级）。
    WorldCombat.on("world_combat:move_magneticflux/revert", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== magneticfluxEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const views = world.effects(actor, magneticfluxLink);
        let guard = 0, ward = 0;
        if (views.length) {
            const mark = JSON.parse(String(views[0].data()));
            guard = Math.max(0, Math.round(Number(mark.guard) || 0));
            ward = Math.max(0, Math.round(Number(mark.ward) || 0));
            world.operation(views[0].id(), "world_combat:dispel", "{}");
        }
        const lostDef = Math.min(guard, Math.max(0, magneticfluxStage(world, actor, "def")));
        const lostSpd = Math.min(ward, Math.max(0, magneticfluxStage(world, actor, "spd")));
        if (lostDef > 0) NativeEffects.boost(world, actor, "def", -lostDef);
        if (lostSpd > 0) NativeEffects.boost(world, actor, "spd", -lostSpd);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, magneticfluxScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 24);
        if (String(data.cause) === "expired") WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), magneticfluxFadeText, [], 22);
    });

    define({
        id: magneticfluxId,
        name: "磁场操控",
        description: "把自己压成一个磁极，在脚下立起一片磁场；站在磁场里的正电／负电己方宝可梦防御与特防一起提高。"
            + "离开磁场、磁场散尽或被人解除时，这份提升一并收回。",
        uses: ["给带正负电特性的伙伴一起加防", "在己方电系核心脚下立一片磁场", "接下成片攻击前先把双防垫起来"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 10,
        active: 1,
        recover: 6,
        cooldown: 130,
        style: "magnetic",
        stationary: true,
        defaults: { opposite: 0, ai: { maxChase: 12, pack: 6 } },
        fields: [
            field(pathOf("opposite"), "极性", "choice", {
                options: [
                    { value: 1, label: "异极" },
                    { value: 0, label: "同极" }
                ],
                help: "异极：防御与特防各 +1、磁场 ×1.2 久、磁力线更密，但磁场只有 0.72 宽、起手 +2 刻、冷却 ×1.12；同极：磁场 ×1.2 宽、起手与冷却更省，等级按本体、时长更短。"
            })
        ],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[magneticfluxId], detail: { values: config } };
            return { radius: p(magneticfluxId, "field", context), geometry: "area", style: "magnetic", color: 0x4FC3E8,
                label: config && Number(config.opposite) === 1 ? "磁场操控 · 异极" : "磁场操控 · 同极" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[magneticfluxId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(4, Math.round(p(magneticfluxId, "tempo", context))),
                recover: Math.max(3, Math.round(p(magneticfluxId, "aftercast", context))),
                cooldown: Math.round(p(magneticfluxId, "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_magneticflux:charge", magneticfluxScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", arcs: Math.round(p(magneticfluxId, "arcs", action)),
                    opposite: config && Number(config.opposite) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const guard = Math.max(1, Math.min(2, Math.round(p(magneticfluxId, "guard", action))));
            const ward = Math.max(1, Math.min(2, Math.round(p(magneticfluxId, "ward", action))));
            const radius = Math.max(1.6, p(magneticfluxId, "field", action));
            const ticks = Math.max(120, Math.round(p(magneticfluxId, "fieldTicks", action)));
            const arcs = Math.max(12, Math.round(p(magneticfluxId, "arcs", action)));
            const scale = radius / magneticfluxReferenceRadius;
            const point = body.position();
            WorldEffects.field(world, magneticfluxRule, point, radius,
                { guard: guard, ward: ward, ticks: ticks, motes: arcs, radius: radius }, ticks);
            world.sound("minecraft:block.respawn_anchor.charge", point, 16, "{}");
            WorldFeedback.emit(world, magneticfluxScene, 1, point,
                { moment: "pulse", radius: radius, arcs: arcs, guard: guard, ward: ward, scale: scale }, 42);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.35, 0)), magneticfluxChargeText,
                [guard, ward, Math.round(ticks / 20)], 36);
            done(action);
        }
    });
}
