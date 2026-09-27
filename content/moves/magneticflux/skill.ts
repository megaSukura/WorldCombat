/**
 * 在脚下展开磁场，暂时提高场内正负电伙伴、铁傀儡和穿金属护甲友方的防御与特防。离开磁场后提升消失。
 *
 * 每片磁场只拥有自己那一份贡献：进入时为每个受益者建一条 boostWindow，按 field.data.windows 记账，
 * 离开本场、本场到位或本场结束时就只关这一条，别的场地（哪怕同一个施法者）留下的标记不受影响。
 * 可见的磁化状态是 actor 身上的真实 MobEffect；它必须先真正挂上，本场才建立窗口。
 */
namespace PokemonSkills {
    /** 资格来自当前正负电特性，或普通活体的身体/装备材料。 */
    export function magneticfluxPolarity(world: CombatWorld, actor: CombatActor): string {
        if (!world.valid(actor)) return "";
        if (String(actor.domain()) !== "cobblemon") {
            const type = world.entityType(actor);
            if (type !== null && String(type.id()) === "minecraft:iron_golem") return "metal";
            const equipment = world.equipment(actor);
            for (let i = 0; i < equipment.length; i++) {
                const slot = String(equipment[i].slot());
                if ((slot === "head" || slot === "chest" || slot === "legs" || slot === "feet") && NativeItems.magneticEquipment(equipment[i])) return "metal";
            }
            return "";
        }
        const pokemon = CobblemonCombat.pokemon(actor);
        const name = String(NativeEffects.ability(pokemon, NativeEffects.read(world, actor))).replace("cobblemon:", "").toLowerCase();
        return name === "plus" || name === "minus" ? name : "";
    }
    function magneticfluxQualifies(world: CombatWorld, actor: CombatActor): boolean {
        return magneticfluxPolarity(world, actor) !== "";
    }
    /** 本场在这一名受益者身上建立的那条窗口是否仍然真实有效。 */
    function magneticfluxOwned(world: CombatWorld, actor: CombatActor, id: number): boolean {
        if (!(id > 0)) return false;
        const definition = String(actor.domain()) === "cobblemon" ? "cobblemon_world_combat:modifier" : CombatStages.windowDefinition;
        return world.effects(actor, definition).some(function (view) {
            return view.id() === id && CombatStages.windowAlive(world, actor, JSON.parse(String(view.data())));
        });
    }
    function magneticfluxWindows(field: WorldEffects.Field): { [ref: string]: number } {
        return field.data.windows || (field.data.windows = {});
    }
    /** 只撤销本场在这一名身上留下的窗口；别的场地留下的标记不动。 */
    function magneticfluxClose(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const windows = magneticfluxWindows(field), ref = String(actor.ref()), id = Number(windows[ref] || 0);
        if (id) NativeEffects.windowClose(world, id);
        delete windows[ref];
    }
    /** 除本场之外，是否还有别的磁场正罩着这名受益者；用来决定磁化状态是否还有人需要。 */
    function magneticfluxElsewhere(world: CombatWorld, actor: CombatActor, exceptId: number): boolean {
        const areas = WorldEffects.areas(world, magneticfluxRule);
        for (let i = 0; i < areas.length; i++) {
            if (Number(areas[i].id) === exceptId) continue;
            if (WorldEffects.covers(world, areas[i], actor)) return true;
        }
        return false;
    }
    /** 磁场每一遍扫描：只有正负电特性的友方（自己也算）被咬住，且要先把可见状态真正挂上才给窗口。 */
    function magneticfluxLinkActor(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const ref = String(actor.ref());
        const windows = magneticfluxWindows(field);
        if (!magneticfluxQualifies(world, actor) || !world.friendly(actor)) {
            magneticfluxClose(world, actor, field);
            // 不合资格：只撤本场贡献；没有别的磁场再罩着它时，可见状态也不留。
            if (!magneticfluxElsewhere(world, actor, Number(field.id || 0))) MobEffects.consume(world, actor, magneticfluxEffect);
            return;
        }
        const body = world.observe(actor);
        if (body === null) { magneticfluxClose(world, actor, field); return; }
        const data: any = field.data || {};
        const guard = Math.max(1, Math.min(2, Math.round(Number(data.guard) || 1)));
        const ward = Math.max(1, Math.min(2, Math.round(Number(data.ward) || 1)));
        const ticks = Math.max(60, Math.round(Number(data.ticks) || 260));
        const radius = Number(data.radius) || magneticfluxReferenceRadius;
        const motes = Math.max(8, Math.round(Number(data.motes) || 22));
        const scale = Math.max(0.5, Math.min(2, radius / magneticfluxReferenceRadius));
        const life = Math.max(1, Math.round(field.remaining || ticks));
        const existing = Number(windows[ref] || 0);
        if (magneticfluxOwned(world, actor, existing)) {
            // 窗口还在；若可见状态被清除，补挂回同一条状态，保持「站在场里就带磁化」。
            if (MobEffects.read(world, actor, magneticfluxEffect) === null) MobEffects.apply(world, actor, magneticfluxEffect, ticks, 0);
            return;
        }
        // 先把可见的磁化状态真正挂上；挂不上就不给增益。
        const carrier = MobEffects.apply(world, actor, magneticfluxEffect, ticks, 0);
        if (carrier === null) { magneticfluxClose(world, actor, field); return; }
        // 一条只属于本场的临时窗口：由 field.data.windows 记账，离开本场或本场结束时只关这一条。
        const source = "magneticflux:" + field.id;
        const id = NativeEffects.boostWindow(world, actor, { def: guard, spd: ward }, life, source);
        if (!id) { magneticfluxClose(world, actor, field); return; }
        const owner = { actor: String(world.source().ref()), definition: "world_combat:field", id: field.id };
        if (!world.operation(id, "world_combat:stage_owner", JSON.stringify(owner))) {
            NativeEffects.windowClose(world, id); return;
        }
        windows[ref] = id;
        WorldFeedback.emit(world, magneticfluxScene, 1, body.position(),
            { moment: "link", target: ref, guard: guard, ward: ward, motes: motes,
              polarity: magneticfluxPolarity(world, actor), scale: scale }, 28);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), magneticfluxLinkText, [guard, ward], 28);
        world.sound("cobblemon:impact.electric", body.position(), 12, "{}");
    }
    /** 磁场还在时，每场用自己的 key 让磁环持续可见——环本身画出的就是范围。 */
    function magneticfluxSustain(world: CombatWorld, field: WorldEffects.Field): void {
        const data: any = field.data || {};
        const radius = Number(data.radius) || magneticfluxReferenceRadius;
        const point = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
        const windows = magneticfluxWindows(field);
        WorldFeedback.keep(world, "world_combat:move_magneticflux/aura/" + field.id, magneticfluxScene, 1, point,
            { moment: "field", radius: radius, motes: Math.max(6, Math.round((Number(data.motes) || 22) * 0.4)),
              scale: Math.max(0.5, Math.min(2, radius / magneticfluxReferenceRadius)) }, 30);
        // 每名仍被本场咬住的受益者一条明确磁力线，从场心连到人身上；线只给本场的窗口拥有者。
        Object.keys(windows).forEach(function (ref) {
            const target = world.actor(ref);
            if (target === null || !world.valid(target)) { delete windows[ref]; return; }
            if (!magneticfluxOwned(world, target, Number(windows[ref]))) return;
            const body = world.observe(target);
            if (body === null) return;
            const at = body.position();
            WorldFeedback.keep(world, "world_combat:move_magneticflux/link/" + field.id + "/" + ref, magneticfluxScene, 1, at,
                { moment: "held", target: ref, guard: Number(data.guard) || 1, ward: Number(data.ward) || 1,
                  motes: Math.max(4, Math.round((Number(data.motes) || 22) * 0.4)), scale: Math.max(0.5, Math.min(2, radius / magneticfluxReferenceRadius)),
                  path: [field.position, [at.x(), at.y(), at.z()]] }, 30);
        });
    }

    WorldEffects.fieldRule(magneticfluxRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field) { magneticfluxLinkActor(world, actor, field); },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field) { magneticfluxLinkActor(world, actor, field); },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field) {
            magneticfluxClose(world, actor, field);
            if (!magneticfluxElsewhere(world, actor, Number(field.id || 0)))
                MobEffects.consume(world, actor, magneticfluxEffect);
        },
        scan: function (_effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field) { magneticfluxSustain(world, field); }
    });

    // 磁化状态散去（到期或被清除）：只播收场表现并补一条浮字，等级回收已由各自的场窗口自己负责。
    WorldCombat.on("world_combat:move_magneticflux/revert", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== magneticfluxEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, magneticfluxScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 24);
        if (String(data.cause) === "expired") WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), magneticfluxFadeText, [], 22);
    });

    define({
        id: magneticfluxId,
        cooldownParameter: "wait",
        name: "磁场操控",
        description: "在脚下展开磁场，暂时提高场内正负电伙伴、铁傀儡和穿金属护甲友方的防御与特防。提升跟着磁场走：离开磁场后消失。",
        uses: ["在交战位置保护正负电伙伴和金属护甲队友", "在己方电系核心脚下立一片磁场", "接下成片攻击前先把双防垫起来"],
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
