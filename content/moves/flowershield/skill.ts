/** 用花瓣提高周围草属性宝可梦，以及手持鲜花的普通生物和玩家的防御，范围内的敌人也会受益。 */
namespace PokemonSkills {
    /** 防御临时贡献的来源名：同一份载体上的 boostWindow 只收回自己这一份。 */
    const flowershieldContribution = "world_combat:move/flowershield";
    /** 草属性判定跟随共享的现行属性（含后来追加草属性的层）。 */
    export function flowershieldQualifies(world: CombatWorld, actor: CombatActor): boolean {
        if (!world.valid(actor)) return false;
        if (String(actor.domain()) !== "cobblemon") {
            const held = world.equipment(actor);
            for (let i = 0; i < held.length; i++) {
                const slot = String(held[i].slot());
                if ((slot === "mainhand" || slot === "offhand") && held[i].tagged("minecraft:flowers")) return true;
            }
            return false;
        }
        const pokemon = CobblemonCombat.pokemon(actor);
        const types = NativeEffects.types(pokemon, NativeEffects.read(world, actor));
        for (let i = 0; i < types.length; i++) if (String(types[i]) === "grass") return true;
        return false;
    }
    /**
     * 给一个受益者落护瓣：先挂真实 MobEffect 载体，再由 boostWindow 把防御贡献绑在这份载体上——
     * 窗口只收回自己交出的那一份，绝不按计划级数去减别人的阶段。已在身上的人只延时、不再叠同一份；
     * 载体被清除或到期时，窗口随锚一起失效。返回本次真正新增的防御级数（重复进入为 0）。
     */
    function flowershieldGrant(world: CombatWorld, actor: CombatActor, gift: number, ticks: number): number {
        if (!world.valid(actor)) return 0;
        const before = NativeEffects.effectiveStage(world, actor, "def");
        const previous = MobEffects.read(world, actor, flowershieldEffect);
        const carrier = MobEffects.apply(world, actor, flowershieldEffect, ticks, previous ? previous.amplifier() : gift);
        if (carrier === null) return 0;
        const changes: { [stat: string]: number } = {};
        if (previous === null) changes.def = gift;
        const windowId = NativeEffects.boostWindow(world, actor, changes, Math.max(1, carrier.duration()),
            flowershieldContribution, carrier, previous);
        const awarded = Math.max(0, NativeEffects.effectiveStage(world, actor, "def") - before);
        const body = world.observe(actor);
        if (windowId > 0 && body !== null)
            WorldFeedback.onEffect(world, windowId, "flowershield:carrier:" + String(actor.ref()),
                flowershieldScene, 1, body.position(),
                { moment: "guard", target: String(actor.ref()), guard: awarded, petals: Math.max(6, Math.round(gift * 4)) });
        return awarded;
    }

    // 护瓣走完或被清除：防御贡献已随载体上的 boostWindow 自行收回，这里只做退场反馈，不再手动加减别的阶段。
    WorldCombat.on("world_combat:move_flowershield/revert", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== flowershieldEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, flowershieldScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 24);
        if (String(data.cause) === "expired") WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), flowershieldFadeText, [], 22);
    });

    define({
        id: flowershieldId,
        cooldownParameter: "wait",
        name: "鲜花防守",
        description: "用花瓣提高周围草属性宝可梦，以及手持鲜花的普通生物和玩家的防御，范围内的敌人也会受益。",
        uses: ["给草属性伙伴和手持鲜花的队友提高防御", "在对手的草属性也在场时用花浪顺手护住自己人", "接下成片攻击前先把防御垫起来"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 110,
        style: "floral",
        stationary: true,
        defaults: { dense: 0, ai: { maxChase: 12 } },
        fields: [
            field(pathOf("dense"), "瓣形", "choice", {
                options: [
                    { value: 1, label: "密瓣" },
                    { value: 0, label: "散瓣" }
                ],
                help: "密瓣：防御 +1、窗口 ×1.25、花瓣更密，但花浪只有 0.72 宽、起手 +2 刻、冷却 ×1.12；散瓣：花浪 ×1.25 宽、起手与冷却更省，防御按本体、窗口更短。"
            })
        ],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[flowershieldId], detail: { values: config } };
            return { radius: p(flowershieldId, "bloom", context), geometry: "area", style: "floral", color: 0xE89AC0,
                label: config && Number(config.dense) === 1 ? "鲜花防守 · 密瓣" : "鲜花防守 · 散瓣" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[flowershieldId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(3, Math.round(p(flowershieldId, "tempo", context))),
                recover: Math.max(3, Math.round(p(flowershieldId, "aftercast", context))),
                cooldown: Math.round(p(flowershieldId, "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_flowershield:gather", flowershieldScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", petals: Math.round(p(flowershieldId, "petals", action)),
                    dense: config && Number(config.dense) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const guard = Math.max(1, Math.min(2, Math.round(p(flowershieldId, "guard", action))));
            const bloom = Math.max(1.2, p(flowershieldId, "bloom", action));
            const ticks = Math.max(120, Math.round(p(flowershieldId, "guardTicks", action)));
            const petals = Math.max(16, Math.round(p(flowershieldId, "petals", action)));
            const scale = bloom / flowershieldReferenceRadius;
            const origin = body.position();
            let reached = 0;
            // 花浪只扫到视线可达的同一片空间：隔墙的目标不会隔空落瓣。
            const actors = world.query(origin, bloom, false);
            for (let i = 0; i < actors.length; i++) {
                const other = actors[i];
                if (!flowershieldQualifies(world, other)) continue;
                const obs = world.observe(other);
                if (obs === null) continue;
                if (String(other.key()) !== String(actor.key()) && !world.clear(origin, obs.position())) continue;
                if (flowershieldGrant(world, other, guard, ticks) <= 0) continue;
                reached++;
            }
            world.sound("minecraft:block.flowering_azalea.place", origin, 16, "{}");
            world.sound("minecraft:block.azalea.place", origin, 12, "{}");
            WorldFeedback.emit(world, flowershieldScene, 1, origin,
                { moment: "bloom", radius: bloom, petals: petals, guard: guard, reached: reached, scale: scale }, 40);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.35, 0)), flowershieldBloomText,
                [guard, reached, Math.round(ticks / 20)], 36);
            done(action);
        }
    });
}
