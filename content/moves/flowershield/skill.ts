/**
 * 鲜花防守 / flowershield —— 执行组织与结算。
 *
 * 核心念头：张臂把一圈花瓣从身上层层推出去，花浪扫过一圈；被扫到的草属性身上落下一层护瓣，
 *   防御抬起来。花瓣停一会儿就凋落，提升随之收回。它护的是**所有**草属性——对手的也算。
 *
 * 两幕：
 *   起 `gather`（windup，提交前）：身侧拢起一层花瓣，只播预告，可被打断、不花代价。
 *   绽 `bloom`（提交后）：以自身为心、`bloom` 为半径推出一圈花浪；圈内每个草属性（不分敌我）
 *     抬防御并挂上共享身份 `world_combat:status/petaled` 的护瓣状态。轮到窗口走完或被清除时按 amplifier 原样收回。
 *
 * 与同族分开：耕地是在世界里留下一块必须站上去的土；鲜花防守是从身上一次推开的护瓣，不看站位、也不管敌我。
 */
namespace PokemonSkills {
    function flowershieldStage(world: CombatWorld, actor: CombatActor): number {
        return NativeEffects.stage(NativeEffects.read(world, actor), "def");
    }
    /** 草属性判定跟随共享的现行属性（含后来追加草属性的层）。 */
    function flowershieldQualifies(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        const types = NativeEffects.types(pokemon, NativeEffects.read(world, actor));
        for (let i = 0; i < types.length; i++) if (String(types[i]) === "grass") return true;
        return false;
    }
    /** 给一个草属性落护瓣；amplifier 记录这次抬了几级，窗口走完或被人清除时照数收回。已在身上的人只续时、不叠加。 */
    function flowershieldGrant(world: CombatWorld, actor: CombatActor, amount: number, ticks: number): boolean {
        const levels = Math.max(1, Math.min(6, Math.round(amount)));
        const existing = MobEffects.read(world, actor, flowershieldEffect);
        if (existing !== null) {
            if (existing.duration() < ticks * 0.5) MobEffects.apply(world, actor, flowershieldEffect, ticks, existing.amplifier());
            return false;
        }
        NativeEffects.boost(world, actor, "def", levels);
        MobEffects.apply(world, actor, flowershieldEffect, ticks, levels);
        return true;
    }

    // 护瓣走完、被人解除：按 amplifier 把这次抬起的防御原样收回（只收当前实际持有的正等级）。
    WorldCombat.on("world_combat:move_flowershield/revert", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== flowershieldEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(0, Math.round(Number(data.amplifier) || 0));
        const loss = Math.min(levels, Math.max(0, flowershieldStage(world, actor)));
        if (loss > 0) NativeEffects.boost(world, actor, "def", -loss);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, flowershieldScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 24);
        if (String(data.cause) === "expired") WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), flowershieldFadeText, [], 22);
    });

    define({
        id: flowershieldId,
        cooldownParameter: "wait",
        name: "鲜花防守",
        description: "以神奇的力量从身上推开一圈花瓣，提高半径内所有草属性宝可梦的防御；对手的草属性也会被护到。"
            + "花瓣停一会儿就凋落，这份防御随之收回。",
        uses: ["给身边一圈草属性伙伴同时上防御", "在对手的草属性也在场时用花浪顺手护住自己人", "接下成片攻击前先把防御垫起来"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 110,
        style: "floral",
        stationary: true,
        defaults: { dense: 0, ai: { maxChase: 12, pack: 6 } },
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
            const actors = world.query(origin, bloom, false);
            for (let i = 0; i < actors.length; i++) {
                const other = actors[i];
                if (!flowershieldQualifies(world, other)) continue;
                const obs = world.observe(other);
                if (obs === null) continue;
                if (!flowershieldGrant(world, other, guard, ticks)) continue;
                reached++;
                WorldFeedback.emit(world, flowershieldScene, 1, obs.position(),
                    { moment: "guard", target: String(other.ref()), guard: guard,
                      motes: Math.max(8, Math.round(petals * 0.5)), scale: scale }, 28);
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
